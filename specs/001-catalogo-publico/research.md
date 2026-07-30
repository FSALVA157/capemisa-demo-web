# Research — Catálogo público de publicaciones

**Feature**: 001-catalogo-publico
**Phase**: 0 (research)
**Date**: 2026-07-23

La constitución (v1.0.1) ya congela stack, deploy target, testing y layout, así que la investigación se concentra en decisiones específicas de esta feature. Cada entrada = una decisión con `Decision / Rationale / Alternatives considered`.

---

## R-01 — Motor de búsqueda por palabra clave insensible a acentos

**Decision (revisada 2026-07-29)**: usar una vista con la columna `search_text` precalculada como `unaccent(lower(rubro || subrubro || descripcion_comercial || texto_whatsapp || descripcion))`. La query del frontend hace `.ilike('search_text', '%<keyword-normalizado>%')` sobre esa vista, no sobre la tabla base. El keyword se normaliza cliente-side antes (lowercase + strip accents con `String.prototype.normalize('NFD').replace(/\p{Diacritic}/gu, '')`) para que coincida con la normalización de la vista — si los dos lados no normalizan igual, la búsqueda con acentos falla en silencio.

La vista es **`public.publicaciones_publicas`** (`/db/04_public_view.sql`), no `publicaciones_searchable` como decía esta decisión originalmente. Ver el bloque de corrección abajo.

**Rationale**: precalcular `search_text` en la vista evita duplicar la lógica de normalización en el cliente y traer todas las filas. El costo de query es O(N) con N < 50 → aceptable. Cumple FR-005 y SC-008.

> ⚠️ **CORRECCIÓN 2026-07-29.** El rationale original decía que reusar `publicaciones_searchable`
> "es coherente con las políticas RLS (la vista respeta las políticas de la tabla base)". **Eso era
> falso**: una vista de Postgres sin `security_invoker = true` corre con privilegios del owner y
> **saltea** el RLS. Como esa vista además selecciona `p.*`, la decisión tal como estaba escrita
> introdujo una vulnerabilidad real (PII y filas no publicadas legibles con la anon key).
>
> El error de método fue asumir la propiedad de seguridad de un artefacto preexistente en vez de
> verificarla — "ya está desplegada y probada por el equipo de datos" no dice nada sobre el rol con
> el que la consulta la web. La alternativa que sí se evaluó (filtro client-side) se descartó por
> razones de escalabilidad correctas, pero ninguna de las dos opciones se miró con lente de RLS.
>
> **Resolución**: se creó `publicaciones_publicas` con `security_invoker = true` y sin columnas PII.
> Misma columna `search_text`, misma query. No se tocó `publicaciones_searchable` porque la consume
> el bot de n8n con `service_role` y necesita `telefono`.

**Alternatives considered**:
- Filtro 100 % client-side sobre el resultado de la query base: obliga a traer todas las filas, no escalable si mañana la demo crece, y duplica la lógica de normalización.
- Full-text search de Postgres con `tsvector`: overkill para <50 filas y demo; agrega complejidad de mantenimiento del índice.

---

## R-02 — Filtro por tipo de publicación

**Decision**: implementar como un `<Select>` (shadcn/ui) sobre el enum de 5 valores (`oferta_servicio`, `oferta_equipo`, `venta_equipo`, `busqueda_proveedor`, `busqueda_equipo`) más una opción "Todos". La query compone `.eq('tipo_publicacion', <valor>)` cuando hay filtro activo, o lo omite cuando es "Todos". Combinable con la búsqueda por keyword (ambas condiciones AND).

**Rationale**: los 5 valores son estables (definidos por CHECK en el schema), se prestan a un Select simple sin necesidad de un multi-select. Los labels visibles son en español rioplatense ("Oferta de servicio", "Venta de equipo", etc.) mapeados en un diccionario en `web/src/lib/i18n.ts` (nombre elegido a pesar de que no hacemos i18n real — solo centraliza etiquetas UI).

**Alternatives considered**:
- Checkboxes multi-select por tipo: más flexible pero UI más pesada; no está en la spec.
- Tabs por tipo: elegante en desktop pero problemático en mobile con 5+1 opciones.

---

## R-03 — URL única de detalle

**Decision**: ruta `/publicacion/:id` donde `:id` es el UUID de la publicación. React Router v6 con `data router` (`createBrowserRouter`) para permitir `loader` opcional en el futuro; por ahora usamos hooks TanStack Query dentro de la página, sin loaders.

**Rationale**: UUID es el PK natural de `publicaciones` y es estable; usarlo como slug es la solución más simple. Compartible externamente (FR-007). En caso de id inexistente o publicación no-publicada, `usePublicacion` devuelve error → se renderiza `NotFoundPage` con mensaje "Publicación no disponible" (FR-017 + AC-2.3).

**Alternatives considered**:
- Slug legible (`/publicacion/camionetas-4x4-puna-abc123`): más SEO-friendly pero requiere generación en DB o cliente y no aporta a la demo.
- URL corta hashada: innecesario para <50 publicaciones.

---

## R-04 — Formulario "Solicitar contacto"

**Decision**: `<Dialog>` de shadcn que se abre desde un botón CTA en el detalle. Contiene un `<Form>` de shadcn manejado por `react-hook-form` + esquema `zod` con las siguientes reglas:

- `empresa_interesada`: string, requerido, min 2 caracteres, max 200.
- `persona_contacto`: string, requerido, min 2, max 100.
- `telefono`: string, requerido, regex tolerante `/^[\d\s+\-()]{6,20}$/` (dígitos + símbolos comunes, sin obligar E.164).
- `email`: string, opcional, si viene debe validar como email.
- `motivo`: string, opcional, max 500.
- `urgencia`: enum opcional `'baja' | 'media' | 'alta'`.

Submit → `useEnviarConsulta` (mutation) → `INSERT` en `public.consultas` vía Supabase → `<Toast>` de éxito + cierre del dialog + reset del form. Errores de red se muestran en el dialog sin cerrarlo.

**Rationale**: react-hook-form + zod es el patrón estándar de shadcn (`useForm({ resolver: zodResolver(schema) })`); evita re-renders y da validación cliente-side declarativa. El dialog modal es apropiado porque la acción es puntual y no requiere una página propia. Cumple FR-010, FR-011, FR-012, FR-013.

**Alternatives considered**:
- Formulario nativo con `<form>` + `useState`: más código, sin validación declarativa.
- Página `/publicacion/:id/contacto` en vez de dialog: rompe el flujo (el visitante quiere volver al detalle al cerrar).

---

## R-05 — Placeholder de imagen y manejo de `imagen_url` inválida

**Decision**: componente `<ImagenPublicacion>` que renderiza:
1. Si `imagen_url` es `null` o vacía → SVG placeholder inline (data URI, sin request extra).
2. Si `imagen_url` existe → `<img>` con `onError` que sustituye por el mismo placeholder.
3. `loading="lazy"` en el `<img>` para diferir carga de imágenes fuera del viewport.

El SVG placeholder es un rectángulo con color de la paleta shadcn (`bg-muted`) y un ícono `ImageOff` de lucide-react centrado.

**Rationale**: cumple FR-017 y el edge case "imagen rota". Sin librerías adicionales de image handling.

**Alternatives considered**:
- `next/image` o `unlazy`: introducen dependencias contra Principio V (YAGNI).
- Servicio de placeholders remoto (placehold.co): requiere request externo y depende de disponibilidad.

---

## R-06 — Estado vacío de la grilla

**Decision**: componente único `<EstadoVacio>` que recibe un `variant`:
- `variant="sin-publicaciones"`: "Todavía no hay publicaciones activas en el catálogo."
- `variant="sin-resultados"`: "No hay publicaciones que coincidan con tu búsqueda." + botón `Limpiar filtros`.
- `variant="no-encontrada"`: "Publicación no disponible." (uso en detalle 404).

Diseño: card centrado, ícono lucide (`SearchX` o `PackageOpen`), texto en dos líneas.

**Rationale**: patrón único cubre las 3 variantes con parámetro simple; cumple FR-016 y los edge cases 1.4, 1.5 y 2.3.

**Alternatives considered**:
- Un componente por variante: fragmentación innecesaria.
- Sin estado vacío (solo grilla en blanco): rompe UX (SC-005 pide claridad).

---

## R-07 — Formato de fecha y locale

**Decision**: usar `Intl.DateTimeFormat('es-AR', { day: 'numeric', month: 'long', year: 'numeric' })` nativo para mostrar `vencimiento`. Sin librerías adicionales (dayjs, date-fns, etc.). Fechas siempre absolutas ("15 de julio de 2026"), nunca relativas ("hace 3 días") para evitar confusión sobre ventana de vigencia.

**Rationale**: Intl API está en todos los navegadores evergreen; alcanza para lo que necesitamos. Menos deps = menos bundle.

**Alternatives considered**:
- date-fns: bundle innecesario para dos campos de fecha.
- Fechas relativas: crean expectativas de refresh en tiempo real, no aplicable a la demo.

---

## R-08 — Auth flow para el catálogo público

**Decision**: la app inicializa un `supabase` client con la `anon key` y NO invoca `signInWithPassword` en este flujo. Las páginas del catálogo (US1, US2, US3) son públicas y no verifican sesión. Login queda para features futuras (`002-…`).

**Rationale**: FR-002 exige acceso anónimo; RLS ya defiende el acceso a datos. Añadir suscripción a `onAuthStateChange` acá es prematuro.

**Alternatives considered**:
- Cargar hook `useAuth` desde el vamos: contradice Principio V.

---

## R-09 — Ordenamiento

**Decision**: orden default = `created_at DESC` (más recientes primero). Sin selectores de ordenamiento alternativos en esta feature (Assumptions de la spec).

**Rationale**: cumple FR-006 con la mínima UI necesaria.

**Alternatives considered**:
- Selector "Más recientes / Urgencia / Vencimiento": fuera de scope.

---

## R-10 — Tipos TypeScript del schema

**Decision**: generar los tipos vía Supabase MCP (`generate_typescript_types`) o CLI (`supabase gen types typescript --project-id dpxfcmhgdieqvgdlqljf`) y guardar en `src/types/database.ts`. Re-generar cuando cambie el schema (aunque esta feature no cambia el schema).

**Rationale**: tipos honestos → autocomplete de columnas, evita typos. Los tipos incluyen **las dos** vistas — `publicaciones_publicas` (la que usa la web) y `publicaciones_searchable` (la del bot) — cada una con un comentario que aclara cuál corresponde, para que el autocomplete no invite a usar la equivocada.

> **Nota 2026-07-29**: en la práctica el archivo se **edita a mano**, no se regenera. Al agregar
> `publicaciones_publicas` se escribió el tipo manualmente, junto con los comentarios que distinguen
> las dos vistas (una regeneración los borraría). Eso mueve el archivo a la alternativa que esta
> decisión había descartado, con el riesgo de desincronización que implica: **al cambiar `db/*.sql`
> hay que actualizar `database.ts` en el mismo commit**.

**Alternatives considered**:
- Tipos hechos a mano en `types/`: propenso a desincronizarse. (Es donde terminó, de hecho — ver nota.)
- Sin tipos (usar `any`): pierde el beneficio de TypeScript.

---

## R-11 — Manejo de errores de red / Supabase

**Decision**: TanStack Query captura errores por query. En la grilla, un error se muestra como un banner `<Alert variant="destructive">` arriba de la grilla con opción de reintentar (invalida y refetch). En el detalle, error = `NotFoundPage` con distinción visual sutil entre "no existe" y "problema técnico" (mensajes diferentes). Sin reporting a Sentry ni similar (fuera de scope).

**Rationale**: solución mínima usable; cumple UX básica sin over-engineering.

**Alternatives considered**:
- Retry automático agresivo: puede empeorar problemas transitorios.
- Sentry / Bugsnag: fuera de scope demo.

---

## R-12 — Toasts para confirmación de consulta

**Decision**: usar el componente `<Toaster>` de shadcn (basado en `sonner`). Al enviar consulta OK → toast "Tu solicitud fue enviada" con ícono ✓. Al fallar → toast destructivo con mensaje.

**Rationale**: patrón estándar shadcn, sin decisiones nuevas.

**Alternatives considered**:
- Confirmación inline dentro del dialog: cierra el flujo pero requiere estados extra en el dialog.

---

## Resumen de decisiones

| ID | Decisión resumida |
|----|-------------------|
| R-01 | Búsqueda vía vista `publicaciones_publicas` + normalización cliente (era `publicaciones_searchable`; corregido 2026-07-29) |
| R-02 | Filtro tipo con Select shadcn + opción "Todos" |
| R-03 | Ruta `/publicacion/:id` con UUID directo |
| R-04 | Dialog + react-hook-form + zod para "Solicitar contacto" |
| R-05 | `<ImagenPublicacion>` con SVG placeholder inline y fallback onError |
| R-06 | `<EstadoVacio>` con 3 variants |
| R-07 | Fechas con `Intl.DateTimeFormat('es-AR')` sin lib externa |
| R-08 | Sin auth flow en esta feature (anon puro) |
| R-09 | Orden fijo `created_at DESC` |
| R-10 | Tipos generados con Supabase MCP |
| R-11 | Errores de Supabase → `<Alert>` en grilla, `NotFoundPage` en detalle |
| R-12 | Toasts (`sonner` vía shadcn) para confirmar consulta |

Sin `NEEDS CLARIFICATION` pendientes. Listo para Phase 1.
