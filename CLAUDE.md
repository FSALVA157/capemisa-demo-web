# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Qué es esto

Frontend del catálogo público de **CAPEMISA Conecta**: una demo institucional donde empresas socias publican ofertas/búsquedas de servicios y equipos, y visitantes anónimos las navegan y dejan una consulta de contacto.

El repo git es este directorio (`web/`), aunque también contiene `db/` (SQL, fuente de verdad del schema) y `specs/`. El directorio padre (`capemisa-app-demo/`) tiene el brief del cliente y scripts sueltos de n8n, y **no** está bajo control de versiones.

**Antes de escribir una spec nueva, leer [`docs/plan-producto.md`](docs/plan-producto.md)**: es el contexto de producto destilado del brief original — el circuito completo de la demo, qué etapas ya están y cuáles faltan, y las simplificaciones de alcance que están acordadas (y que una spec no debería revertir sin decirlo). Este archivo cubre el *cómo* técnico; ese cubre el *qué* y el *por qué*.

## Comandos

```bash
npm install
npm run dev       # vite dev server → http://localhost:5173
npm run build     # tsc -b && vite build → dist/
npm run lint      # oxlint (NO eslint, aunque haya comentarios eslint-disable en el código)
npm run preview   # sirve el build de dist/
```

No hay suite de tests: la constitución del proyecto define **testing manual/visual** como default para la demo (verificar a 375, 768 y 1440 px de ancho). No agregar Vitest/Playwright sin que una spec lo pida.

Antes de considerar un cambio terminado corré `npm run build` — `tsc -b` con `noUnusedLocals`/`noUnusedParameters` atrapa lo que `oxlint` no.

`.env.local` es obligatorio para que la app arranque (`src/lib/supabase.ts` lanza si faltan las vars):

```
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon key>
```

## Arquitectura

Vite + React 19 + TypeScript + Tailwind + shadcn/ui + React Router v7 (`createBrowserRouter`) + TanStack Query + `@supabase/supabase-js`. **Sin backend propio**: el cliente habla directo con Supabase usando la `anon key`.

El flujo de datos es siempre el mismo y no hay capa de servicios intermedia:

```
página (src/pages) → hook de src/hooks → cliente supabase (src/lib/supabase.ts) → vista/tabla de Postgres
```

- **Router**: `src/routes.tsx` — `App.tsx` es el layout (Navbar + `<Outlet/>`). Rutas públicas: `/` (catálogo), `/publicacion/:id` (detalle), `/ingresar` y `*` (404). Rutas del área de miembro, todas envueltas en `<RutaProtegida>`: `/mi-area`, `/mi-area/nueva`, `/mi-area/publicacion/:id` y `/mi-area/publicacion/:id/editar`.
- **Providers**: `src/main.tsx` monta `QueryClientProvider` + `AuthProvider` + `RouterProvider` + `<Toaster/>` de sonner. Defaults de Query en `src/lib/queryClient.ts` (`staleTime` 30s, sin refetch on focus, 1 retry).
- **Hooks** (uno por operación, sin abstracción compartida): `usePublicaciones` (grilla, filtro por tipo + keyword), `usePublicacion` (detalle por id), `useEnviarConsulta` (mutación de inserción), y los del área de miembro: `useMisPublicaciones`, `useMiPublicacion`, `useInteresados`, `useCrearPublicacion`, `useEditarPublicacion`.
- **Alias**: `@/*` → `src/*`, configurado en `vite.config.ts` y `tsconfig.app.json`. Usarlo en imports nuevos.
- **shadcn/ui**: componentes generados viven en `src/components/ui/` — no editarlos a mano salvo necesidad; `components.json` los configura (estilo default, base slate, CSS variables, iconos lucide).

### Chat web (feature 003)

`ChatWidget` se monta en el catálogo y en el detalle de publicación. Busca por significado y registra solicitudes de contacto, hablando con el workflow n8n **`capemisa_conversacional_web`** (`x77glo4LOG1Hy1Pn`) vía `VITE_N8N_CHAT_URL`. Si esa variable falta, el chat **no se monta** y el resto de la web funciona igual — a diferencia de `src/lib/supabase.ts`, acá no se lanza.

El chat tiene las capacidades de la rama *invitado* del bot: buscar y registrar consultas. **No publica ni edita**, para eso está `/mi-area`. El login no desbloquea nada: solo precarga los datos de contacto del perfil para ahorrar turnos.

Tres cosas que no se pueden tocar sin romper algo:

- **`Tool buscar` pasa `rol: "invitado"` como literal fijo.** `Shape resultados` de `capemisa_tool_buscar` hace `if (rol !== 'invitado') r.telefono = p.telefono`. Si eso se convierte en expresión o se toma del body, el chat empieza a devolver el teléfono de todas las empresas oferentes **y todo sigue pareciendo funcionar**. `ResultadoChat` en `src/lib/chatApi.ts` no declara `telefono` justamente para que la interfaz no pueda mostrarlo por accidente.
- **La `sessionKey` de la memoria es `web:{conversacion_id}`, y el prefijo lo antepone n8n**, nunca el cliente. Si el cliente pudiera mandar la clave completa, apuntaría a `miembro:+549...` y leería una conversación de WhatsApp ajena.
- **El guardrail se evalúa por oración**, descartando interrogativas y subjuntivos. Sin eso, `registr[eé]` matchea igual "registré" (afirmación) que "registre" (ofrecimiento), porque el modelo omite tildes: medido, bloqueaba 4 de cada 10 turnos legítimos.

Y un riesgo aceptado con criterio de demo (R-12 de `specs/003-chat-web-catalogo/research.md`): **`ChatWidget` no tiene error boundary propio**. FR-025 —que una falla del chat no tumbe el catálogo— se cumple hoy porque `chatApi.ts` nunca lanza, no porque haya una barrera. Si un cambio rompe esa invariante, envolver el widget en su propio `ErrorBoundary` en el mismo cambio: si no, la excepción sube al `errorElement` del router y se cae la ruta entera.

**Los workflows n8n existentes no se tocan bajo ninguna condición**: están en uso para demos ante el cliente. Si hiciera falta un cambio en uno reutilizado, se crea un **gemelo** (copia con ID propio) y se consume ese. Al crear workflows por la API hay un detalle: **n8n no genera el `webhookId`** —lo hace la UI—, y sin él la ruta de producción no se registra y responde "webhook is not registered" aunque el workflow figure activo.

### Autenticación y área de miembro

Desde la feature 002 hay login por email y contraseña (Supabase Auth, sin registro público ni recuperación de contraseña: las cuentas las carga CAPEMISA).

- `src/auth/AuthProvider.tsx` expone `session`, `perfil`, `cargando`, `perfilFaltante`, `ingresar` y `salir`. Resuelve la sesión inicial de forma asincrónica y se suscribe a `onAuthStateChange`, lo que cubre expiración y cierre de sesión en otra pestaña.
- `src/auth/RutaProtegida.tsx` es protección de **interfaz**, no de datos: mientras `cargando` es true muestra un esqueleto y **no** redirige — tratar "todavía no sé" como "no hay sesión" produce un destello al recargar cualquier página del área. La barrera real es siempre el RLS.
- Cerrar sesión (`Navbar`) **navega primero y cierra la sesión después**. Al revés se termina en `/ingresar` en vez del catálogo: estando en una ruta protegida, `RutaProtegida` reacciona a la sesión nula antes de que corra el `navigate`.
- En los formularios de escritura, `disabled={isPending}` **no evita el doble envío** (dos clicks en el mismo tick ocurren antes del repintado: medido, 3 clicks = 3 filas). El control real es el guard con `useRef` de `PublicacionFormPage`.

### Modelo de datos y las tres vistas de Postgres

Tablas: `perfiles`, `publicaciones` (campos de usuario + campos generados por IA + `estado`), `consultas`. Todas con RLS habilitado; `db/01_schema.sql` es la referencia, y `db/05_auth_miembros.sql` agrega los objetos del área de miembro.

**Ninguna pantalla lee de la tabla base `publicaciones`**: todas las lecturas pasan por una vista. Las escrituras (alta y edición) sí van a la tabla base, sin pedir que devuelva datos — ver R-06 de la feature 002.

Existen **tres** vistas y la distinción es de seguridad, no cosmética:

- `publicaciones_publicas` (`db/04_public_view.sql`) — **la única que la web debe usar**. Tiene `security_invoker = true`, así que respeta el RLS del que consulta (`anon` solo ve `estado='publicada'`), y excluye PII (`telefono`, `email`, `responsable`, `observaciones_internas`, `texto_whatsapp`, `autor_id`, `matches`).
- `mis_publicaciones` (`db/05_auth_miembros.sql`) — la del área de miembro. También `security_invoker`, más un `WHERE p.autor_id = auth.uid()` que **no es redundante con el RLS**: las políticas se combinan con OR y `publicaciones_select_publica` alcanza a `authenticated`, así que sin ese `WHERE` un miembro vería todas las publicadas de los demás con sus teléfonos. Devuelve las propias en todos los estados, sin `observaciones_internas`, `autor_id`, `matches` ni `texto_whatsapp`. `GRANT` solo a `authenticated`.
- `publicaciones_searchable` (`db/03_search_view.sql`) — para el bot de n8n con `service_role`. Es `p.*` **sin** `security_invoker`, o sea saltea RLS y expone PII. El nodo `Shape resultados` de `capemisa_tool_buscar` depende de sus columnas: no recortarla, la rompe en silencio.

Los specs (`data-model.md`, `research.md` R-01/R-10, `plan.md`, `contracts/supabase-queries.md`, `quickstart.md`, T024/T028/T040) están sincronizados con esta corrección desde el 2026-07-29 y conservan el registro de por qué la versión anterior era insegura.

**Dos vías siguen abiertas, por decisión explícita y registrada** (FR-026b de la feature 002, R-01, T040 de la 001): con la anon key se puede leer `telefono`, `email` y `responsable` tanto de la tabla base `publicaciones` como de `publicaciones_searchable` —esta última incluso de filas no publicadas—. El login **no las agrava**: un miembro autenticado obtiene lo mismo que obtendría sin sesión. Están postergadas con criterio de demo y **deben cerrarse antes de producción**; el procedimiento está en R-01 de `specs/002-login-area-miembro/research.md`. Cuidado al hacerlo: el `REVOKE` sobre la tabla base rompe `publicaciones_publicas`, que es `security_invoker` y necesita que el consultante tenga privilegio sobre ella.

Las queries del catálogo filtran `.eq('estado', 'publicada')` explícitamente aunque el RLS ya lo garantice: defensa en profundidad, mantener el patrón. **No es teórico**: `publicaciones_publicas` es `security_invoker` y `publicaciones_select_propia` le suma al miembro autenticado sus propias filas no publicadas (medido: 20 filas para `anon`, 26 con sesión). Si alguien quita ese `.eq()` "porque el RLS ya lo hace", el miembro empieza a ver sus borradores en el catálogo público.

Con RLS, **el acceso denegado casi nunca llega como error: llega como vacío**. Dos consecuencias que ya están resueltas en el código y conviene no "simplificar": leer una publicación ajena devuelve `null`, indistinguible de inexistente (a propósito), y una actualización no permitida por estado devuelve **204 sin error y cero filas afectadas** — por eso `useEditarPublicacion` usa `count: 'exact'` y trata el cero como fallo explicable, en vez de confirmar un guardado que no ocurrió.

Búsqueda por keyword: la vista precalcula `search_text` con `extensions.unaccent(lower(...))`; el cliente normaliza el input con `normalizarBusqueda()` (`src/lib/i18n.ts`) y hace `ilike('%kw%')`. Ambos lados deben normalizar igual o la búsqueda con acentos falla.

`src/types/database.ts` es el tipado de Supabase, **mantenido a mano** — al cambiar `db/*.sql` hay que actualizarlo. Los `select()` con lista de columnas rompen la inferencia de postgrest-js, de ahí los `as unknown as T` en los hooks contra tipos declarados localmente (`PublicacionListItem`, `PublicacionDetalle`, `MiPublicacionListItem`, `Interesado`). Las escrituras tienen la misma limitación y llevan un `as any` acotado con comentario.

Los seeds insertan en `auth.users` listando **las 8 columnas de token** con cadena vacía. No es decorativo: si quedan en `NULL`, GoTrue falla al escanearlas y **el login se rompe para todas las cuentas de la base**, con un 500 opaco que no menciona el problema real (el detalle sale en los logs de auth, no en la respuesta).

## Reglas del proyecto

La [constitución](.specify/memory/constitution.md) v1.0.1 rige sobre cualquier otra guía. Lo operativo:

- **Spec-Driven Development es no negociable**: features nuevas pasan por `/speckit-specify → /speckit-plan → /speckit-tasks → /speckit-implement`. Nada de implementar sin un `tasks.md` que lo motive. Los artefactos de `specs/` son la fuente de verdad.
- **Stack congelado**: prohibido agregar otro framework, otra librería UI (MUI, Chakra, Ant), un backend propio o un ORM.
- **YAGNI**: preferir tres implementaciones parecidas antes que una abstracción prematura. Fuera de alcance hasta que una spec los incorpore: dark mode, i18n, PWA, offline, upload real de archivos, registro público, notificaciones push.
- **`service_role` nunca en el frontend**, ni comentado. El bundle es público.
- **`db/*.sql` no se ejecuta desde código de aplicación**: las migraciones las corre el humano contra Supabase (o vía MCP con autorización explícita).
- **Workflows n8n** se modifican por MCP (`n8n-capemisa`), no en la UI.
- **Idioma UI**: español rioplatense en toda la interfaz, labels, microcopy y mensajes de error (los mensajes de Zod en `src/lib/schemaConsulta.ts` son el modelo).
- **Human gate sobre output de IA**: nada generado por IA se muestra al usuario final sin que un `admin` lo transicione de `estado='pendiente'` a `'publicada'`.

## Deploy

Push/merge a `main` en GitHub → auto-deploy Coolify → VPS Hostinger. `main` **es** producción; el trabajo en curso va en ramas feature. Deploys manuales por SSH/SFTP/`scp` están prohibidos, hotfixes incluidos.

El `Dockerfile` compila el bundle y lo sirve con nginx (`nginx.conf` tiene el fallback SPA para las rutas del router). Dos detalles con historia:

- Las `VITE_*` se inlinean en build-time, así que llegan como `ARG`/`ENV` — en Coolify hay que marcar cada variable como **Build Variable**, no solo runtime.
- La imagen base está pinneada a `node:24.11.1-slim` a propósito: los tags flotantes traen un npm que resuelve las deps nativas opcionales distinto y rompe `npm ci` con este lockfile.
