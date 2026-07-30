---
description: "Task list for feature 001-catalogo-publico"
---

# Tasks: Catálogo público de publicaciones

**Input**: Design documents from `/specs/001-catalogo-publico/`

**Prerequisites**: `plan.md` (required), `spec.md` (required for user stories), `research.md`, `data-model.md`, `contracts/`, `quickstart.md`.

**Tests**: NO se generan tareas de tests automatizados. La spec y la constitución (Principio V) definen testing manual/visual como default. La validación se hace corriendo `quickstart.md` a mano.

**Organization**: tareas agrupadas por user story para permitir entrega incremental. US1 (P1) es MVP; US2 (P2) y US3 (P3) son releases posteriores independientes.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: puede correr en paralelo con otras [P] (archivos distintos, sin dependencias pendientes).
- **[Story]**: US1 / US2 / US3 según corresponda; setup/foundational/polish sin label.
- Rutas de archivo son relativas al repo root (`/home/fernando/Documents/Projects/capemisa-app-demo/`).

## Path Conventions

- Frontend: `web/` (creado en Phase 1).
- Especificaciones: `specs/001-catalogo-publico/` (existente).
- Base de datos: `db/` (existente, NO se modifica en esta feature).

---

## Phase 1: Setup

Bootstrap del monorepo (`/web`) y configuración de infra base. Estas tareas se ejecutan una única vez.

- [X] T001 Crear repositorio GitHub dedicado, inicializar como repo local, configurar rama por defecto `main` y remote `origin`.
  > **Ejecutado distinto a lo planeado (2026-07-28)**: el repo se llama **`FSALVA157/capemisa-demo-web`** (público), no `capemisa-app-demo`. El repo git local vive en **`capemisa-app-demo/web/`**, no en la raíz del proyecto — el contenido de `web/` está en la raíz del repo, sin carpeta `web/` adentro. Motivo: la raíz `/Projects` ya es toplevel de otro repo (`manejador-personal-vaults`), justo el caso que la task anticipaba. Consecuencia: `specs/` y `.specify/` quedaron fuera del repo — **resuelto el 2026-07-29** moviéndolos adentro, ver T044.
- [X] T002 Actualizar `/.gitignore` en la raíz del proyecto agregando: `web/node_modules/`, `web/dist/`, `web/.env.local`, y (según advertencia del propio Spec Kit) `.claude/settings.local.json`.
- [X] T003 [P] Scaffold Vite+React+TypeScript en `web/`: correr `npm create vite@latest web -- --template react-ts` desde la raíz del proyecto. Confirmar que se creó `web/package.json`, `web/vite.config.ts`, `web/tsconfig.json`.
- [X] T004 [P] Escribir `web/.env.example` con `VITE_SUPABASE_URL=` y `VITE_SUPABASE_ANON_KEY=` (valores vacíos), y crear `web/.env.local` con los valores reales del proyecto Supabase `dpxfcmhgdieqvgdlqljf` (obtener anon key vía MCP `mcp__supabase__get_publishable_keys` o desde el dashboard).
- [X] T005 Instalar dependencias core en `web/`: `npm install @supabase/supabase-js @tanstack/react-query react-router-dom clsx tailwind-merge react-hook-form zod @hookform/resolvers`.
- [X] T006 Instalar Tailwind CSS 3 en `web/`: `npm install -D tailwindcss@3 postcss autoprefixer` y correr `npx tailwindcss init -p`. Editar `web/tailwind.config.ts` para incluir `content: ['./index.html', './src/**/*.{ts,tsx}']`.
- [X] T007 Configurar path alias `@/*` en `web/tsconfig.json` y `web/vite.config.ts` apuntando a `src/*` (requerido por shadcn/ui).
- [X] T008 Inicializar shadcn/ui en `web/`: `npx shadcn@latest init` eligiendo estilo "default", color base "slate", CSS variables ON. Esto crea `web/components.json`, `web/src/lib/utils.ts` (helper `cn`) y actualiza `web/src/index.css` con las CSS variables y directivas Tailwind.
- [X] T009 [P] Instalar los componentes shadcn que se usarán en toda la feature: `npx shadcn@latest add button card badge input select dialog form textarea toast skeleton alert sheet`.
- [X] T010 [P] Crear `web/README.md` breve con: comandos `npm install`, `npm run dev`, `npm run build`, y nota sobre las variables de entorno esperadas.

**Checkpoint Phase 1**: al terminar, `cd web && npm run dev` debe abrir un sitio en `http://localhost:5173` con la home default de Vite (aún no la app real).

---

## Phase 2: Foundational

Infra transversal a todas las user stories: cliente Supabase, tipos, Router, QueryClient, layout raíz, i18n. Bloquea US1/US2/US3.

- [X] T011 [P] Generar tipos TypeScript desde el schema Supabase usando MCP `mcp__supabase__generate_typescript_types` con `project_id=dpxfcmhgdieqvgdlqljf` y guardar en `web/src/types/database.ts`.
- [X] T012 [P] Crear `web/src/lib/supabase.ts` que exporta un cliente único: `createClient<Database>(url, anonKey)` leyendo de `import.meta.env.VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`. Tipar con `Database` desde `@/types/database`.
- [X] T013 [P] Crear `web/src/lib/queryClient.ts` que exporta un `QueryClient` de TanStack con defaults conservadores (`staleTime: 30_000`, `refetchOnWindowFocus: false`).
- [X] T014 [P] Crear `web/src/lib/i18n.ts` con: (a) mapa `TIPO_PUBLICACION_LABEL` de los 5 enums a strings en español rioplatense ("Oferta de servicio", "Venta de equipo", etc.), (b) mapa `URGENCIA_LABEL` (`baja`→"Baja", etc.), (c) helper `formatearFecha(iso: string)` usando `Intl.DateTimeFormat('es-AR', { day:'numeric', month:'long', year:'numeric' })`, (d) helper `normalizarBusqueda(s: string)` (lowercase + strip accents via `.normalize('NFD').replace(/\p{Diacritic}/gu, '')`).
- [X] T015 Escribir `web/src/main.tsx` que monta la app: `<QueryClientProvider>` con el client de T013, `<RouterProvider>` con el router de T016, y `<Toaster />` de shadcn.
- [X] T016 Crear `web/src/routes.tsx` con `createBrowserRouter` y las 3 rutas: `/` → `CatalogoPage`, `/publicacion/:id` → `PublicacionDetallePage`, `*` → `NotFoundPage`. Envolver todas en un `<App />` como layout con `<Outlet />`.
- [X] T017 Escribir `web/src/App.tsx`: layout raíz con `<Navbar />` sticky arriba y `<main className="max-w-7xl mx-auto px-4 py-6"><Outlet /></main>`.
- [X] T018 Crear `web/src/components/Navbar.tsx`: header con nombre "CAPEMISA Conecta" como `<Link to="/">`. Responsive: altura 56px mobile / 64px desktop; sin menú hamburguesa aún (no hay más links en esta feature).
- [X] T019 [P] Crear `web/src/components/EstadoVacio.tsx` con prop `variant: 'sin-publicaciones' | 'sin-resultados' | 'no-encontrada'` y prop opcional `onLimpiarFiltros?: () => void`. Renderiza un Card centrado con icono lucide + texto según variant. Solo la variant `sin-resultados` muestra botón "Limpiar filtros".
- [X] T020 [P] Crear `web/src/components/ImagenPublicacion.tsx` con prop `url: string | null` y prop opcional `className`. Si `url` es null → SVG placeholder inline (rectángulo `bg-muted` con icono `ImageOff` centrado). Si `url` existe → `<img>` con `loading="lazy"` y `onError` que reemplaza por el mismo placeholder.
- [X] T021 Crear stub `web/src/pages/CatalogoPage.tsx` que solo renderice "Catálogo" (placeholder para desbloquear el router).
- [X] T022 Crear stub `web/src/pages/PublicacionDetallePage.tsx` que solo renderice "Detalle" (placeholder para desbloquear el router).
- [X] T023 Crear `web/src/pages/NotFoundPage.tsx` que renderiza `<EstadoVacio variant="no-encontrada" />` + botón `<Link to="/">Volver al catálogo</Link>`.

**Checkpoint Phase 2**: al terminar, `npm run dev` muestra la home con Navbar visible y "Catálogo" en el main. Navegar manualmente a `/publicacion/cualquier-cosa` muestra "Detalle". Ir a `/foo` muestra `NotFoundPage`. Cliente Supabase importable sin errores de TS.

---

## Phase 3: User Story 1 — Explorar el catálogo (Priority P1) 🎯 MVP

**Story goal**: un visitante anónimo ingresa a `/` y ve la grilla de publicaciones en estado 'publicada'. Puede filtrar por tipo y buscar por palabra clave (con normalización de acentos). Cumple FR-001 a FR-006, FR-014, FR-015, FR-016, FR-017, FR-018.

**Independent test**: correr AC-1.1, AC-1.2, AC-1.3, AC-1.4, AC-1.5 del `quickstart.md`.

- [X] T024 [P] [US1] Crear `web/src/hooks/usePublicaciones.ts` que exporta un hook con firma `usePublicaciones(filtros: { tipo: string; keyword: string })`. Usa `useQuery` con key `['publicaciones', filtros]` que ejecuta la Q1 del `contracts/supabase-queries.md`: SELECT sobre `publicaciones_publicas` (la descripción original decía `publicaciones_searchable`; corregido el 2026-07-29 junto con el fix de RLS/PII) con columnas explícitas (SIN `telefono`/`email`/`responsable`), `.eq('estado','publicada')`, condicional `.eq('tipo_publicacion', filtros.tipo)` si `filtros.tipo !== 'todos' && filtros.tipo !== ''`, condicional `.ilike('search_text', %${normalizarBusqueda(filtros.keyword)}%)` si `filtros.keyword`. `.order('created_at', { ascending: false })`.
- [X] T025 [P] [US1] Crear `web/src/components/PublicacionCard.tsx` con prop `publicacion` según contrato de `contracts/ui-routes.md`. Renderiza: `<ImagenPublicacion>` con aspect 16:9 arriba, empresa como título, `<Badge>` de tipo (label desde `TIPO_PUBLICACION_LABEL`), rubro como sub-badge si existe, descripción resumida truncada (`descripcion_comercial ?? descripcion`, truncar a ~120 chars con clase `line-clamp-3`), zona con icono `MapPin` de lucide si existe, `<Badge>` de urgencia si existe (baja=slate, media=amber, alta=red). Card entera clickable con `<Link to={`/publicacion/${publicacion.id}`}>`.
- [X] T026 [P] [US1] Crear `web/src/components/FiltrosGrilla.tsx` con props `value: { tipo: string; keyword: string }` y `onChange: (next) => void`. Layout: Input de búsqueda con icono `Search` (debounce 300 ms interno con `useDebouncedCallback` inline usando `setTimeout`/`clearTimeout`) + `<Select>` con opciones desde `TIPO_PUBLICACION_LABEL` + opción "Todos" arriba + botón "Limpiar" visible cuando hay filtros activos. En mobile (<768px), envolver los filtros en un `<Sheet>` de shadcn abierto por botón "Filtros".
- [X] T027 [US1] Reescribir `web/src/pages/CatalogoPage.tsx` (reemplazando el stub de T021) con la composición del contrato `contracts/ui-routes.md`: sincroniza `filtros` con query string (`?tipo=...&q=...`) usando `useSearchParams`. Llama `usePublicaciones(filtros)`. Renderiza: `<FiltrosGrilla>` arriba, luego según estado — `<Skeleton>` (mientras loading), `<Alert variant="destructive">` con botón "Reintentar" (`refetch()`) si error, `<EstadoVacio variant="sin-resultados" onLimpiarFiltros={...}>` si `data.length === 0 && (filtros.tipo || filtros.keyword)`, `<EstadoVacio variant="sin-publicaciones">` si `data.length === 0 && !filtros.tipo && !filtros.keyword`, o grilla `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4` con `PublicacionCard` para cada publicación.
- [ ] T028 [US1] **Validación manual US1**: correr los escenarios AC-1.1 a AC-1.5 del `quickstart.md`. Registrar resultado (OK / issue) inline en `quickstart.md` como comentario. ~~Verificar además que la respuesta de red (DevTools → Network) NO incluye columnas `telefono`, `email`, `responsable`~~ → **la parte de PII de esta task quedó sin efecto (2026-07-29)**: mirar DevTools verifica qué pide el frontend, no qué puede pedir cualquiera con la anon key, así que el check pasaba sobre un agujero real. La verificación de SC-009 / Principio IV se hace con el check reescrito de `quickstart.md` (curl contra la API con la anon key) y se rastrea en T040, no acá.

**Checkpoint US1 = MVP entregable**: catálogo público funciona end-to-end con filtros y búsqueda. Sin detalle ni contacto, ya hay valor (descubrimiento).

---

## Phase 4: User Story 2 — Ver detalle de una publicación (Priority P2)

**Story goal**: desde la grilla o desde una URL directa, el visitante accede a `/publicacion/:id` y ve la ficha completa con datos públicos (sin `telefono`/`email` del oferente). Cumple FR-007, FR-008, FR-017, FR-019.

**Independent test**: correr AC-2.1, AC-2.2, AC-2.3, AC-2.4 del `quickstart.md`.

- [X] T029 [P] [US2] Crear `web/src/hooks/usePublicacion.ts` con firma `usePublicacion(id: string)`. `useQuery` con key `['publicacion', id]` ejecutando la Q2 del `contracts/supabase-queries.md`: SELECT sobre `publicaciones` con columnas explícitas (incluir `condicion_comercial`, `disponibilidad`, `vencimiento`, `subrubro`; excluir `telefono`, `email`, `responsable`), `.eq('id', id).eq('estado','publicada').single()`.
- [X] T030 [US2] Reescribir `web/src/pages/PublicacionDetallePage.tsx` (reemplazando el stub de T022) con la composición del contrato `contracts/ui-routes.md`. Usa `useParams<{ id: string }>()` y llama `usePublicacion(id)`. Renderiza: si loading → `<Skeleton>` para detalle; si error o data null → `<NotFoundPage variant="no-existe" />`; si data → `<ImagenPublicacion>` grande, encabezado con empresa/badges (tipo + urgencia), metadatos (rubro/subrubro, zona, vencimiento formateado con `formatearFecha`), descripción (usa `descripcion_comercial ?? descripcion`), bloques opcionales de condición comercial y disponibilidad, botón "Solicitar contacto" con `disabled` por ahora (US3 lo activa). Layout responsive (imagen full-width en mobile; imagen columna izquierda 40%, texto derecha 60% en desktop ≥ md).
- [X] T031 [US2] Verificar el `NotFoundPage` (T023) cubre AC-2.3: cuando el hook devuelve error PGRST116 (single row not found), la página muestra "Publicación no disponible" sin filtrar información técnica del error al usuario.
- [ ] T032 [US2] **Validación manual US2**: correr AC-2.1 a AC-2.4 del `quickstart.md`. Verificar en DevTools que la respuesta de `/rest/v1/publicaciones` para el detalle NO incluye `telefono`/`email`/`responsable`. Registrar resultados inline en `quickstart.md`.

**Checkpoint US2**: catálogo + detalle funcionan. Aún sin botón de contacto activo.

---

## Phase 5: User Story 3 — Solicitar contacto (Priority P3)

**Story goal**: desde el detalle, el visitante abre un dialog, completa el formulario y envía. La consulta queda registrada en `public.consultas`. Cumple FR-009 a FR-013.

**Independent test**: correr AC-3.1, AC-3.2, AC-3.3, AC-3.4 del `quickstart.md`.

- [X] T033 [P] [US3] Crear `web/src/lib/schemaConsulta.ts` con esquema zod: `empresa_interesada` (string min 2 max 200 requerido), `persona_contacto` (min 2 max 100 requerido), `telefono` (regex `/^[\d\s+\-()]{6,20}$/` requerido con mensaje "Ingresá un teléfono válido"), `email` (opcional, `.email()` si presente), `motivo` (opcional, max 500), `urgencia` (opcional, enum `['baja','media','alta']`). Exportar también el tipo inferido `type FormConsulta = z.infer<typeof schema>`.
- [X] T034 [P] [US3] Crear `web/src/hooks/useEnviarConsulta.ts` con `useMutation` que recibe `{ publicacion_id, ...formData }` y ejecuta Q3 del `contracts/supabase-queries.md`: INSERT en `public.consultas` omitiendo `id`, `estado_seguimiento`, `created_at` (defaults del schema). Devuelve el resultado. En `onSuccess`, invalidar `['consultas']` (aunque no se lea aquí, mantiene consistencia).
- [X] T035 [US3] Crear `web/src/components/DialogSolicitarContacto.tsx` con props `publicacionId`, `open`, `onOpenChange`. Contenido: `<Dialog>` shadcn envolviendo un `<Form>` (react-hook-form + `zodResolver` con schema de T033). Campos: empresa, persona, teléfono (Input), email (Input opcional), motivo (Textarea opcional), urgencia (Select opcional con "Sin especificar"/"Baja"/"Media"/"Alta"). Al submit: llama `useEnviarConsulta` mutation. En success: toast success con `sonner` (via shadcn `toast`) "Tu solicitud fue enviada, el equipo de CAPEMISA se pondrá en contacto", cerrar dialog, resetear form. En error: toast destructivo "No pudimos enviar tu solicitud, intentá de nuevo" (dialog queda abierto para reintentar).
- [X] T036 [US3] Activar el botón "Solicitar contacto" en `web/src/pages/PublicacionDetallePage.tsx` (editar T030): agregar estado local `dialogAbierto`, quitar `disabled` del botón, wire `onClick={() => setDialogAbierto(true)}` y montar `<DialogSolicitarContacto publicacionId={id} open={dialogAbierto} onOpenChange={setDialogAbierto} />` al final del JSX.
- [ ] T037 [US3] **Validación manual US3**: correr AC-3.1 a AC-3.4 del `quickstart.md`. Verificar en Supabase con MCP `execute_sql` (`SELECT * FROM consultas ORDER BY created_at DESC LIMIT 1`) que la consulta enviada quedó registrada con los campos correctos y `estado_seguimiento='nueva'` (SC-007). Registrar resultados en `quickstart.md`.

**Checkpoint US3**: circuito completo del catálogo público operativo.

---

## Phase 6: Polish & Deploy

Tareas transversales: verificar responsive/compliance en todos los breakpoints, deploy pipeline.

- [X] T038 [P] Correr los **escenarios responsive** del `quickstart.md` (375, 768, 1440 px) para US1, US2 y US3. Verificar cero scroll horizontal en ningún viewport (SC-005).
  > **2026-07-29: PASA sin ajustes.** 1/2/3 columnas en 375/768/1440, filtros colapsados en mobile, dialog a ancho completo con campos apilados, cero desbordes. Medido con Playwright contra producción. Detalle en `quickstart.md` → Registro de validación.
- [ ] T039 [P] Correr los **escenarios edge** del `quickstart.md` (imagen rota, descripción muy larga, búsqueda con paréntesis, publicación con estado no-publicada mid-flight). Ajustar donde haga falta.
- [~] T040 [P] Correr las **3 verificaciones de compliance** del `quickstart.md`: Principio II (estado no-publicada oculta), Principio IV (network no expone PII), Principio V (sin features fuera de spec). Documentar resultados en `quickstart.md`.
  > **2026-07-29: 2 de 3.** Principio II ✅ (a nivel app) y Principio V ✅. **Principio IV 🔴 NO PASA**: la vista `publicaciones_searchable` no tiene `security_invoker`, saltea el RLS y expone `telefono`/`email`/`responsable` y filas no publicadas a cualquiera con la anon key. **Issue conocido y aceptado** para no arriesgar la demo. El fix NO es sacar columnas de esa vista (rompe `capemisa_tool_buscar` en silencio) sino crear una vista separada para la web. La task queda abierta hasta que se aplique. El texto del check en `quickstart.md` también hay que corregirlo: como está redactado da verde sobre el agujero.
  >
  > **2026-07-29, actualización — mitigado en la app, cierre pendiente en la DB.**
  >
  > Hecho:
  > - `db/04_public_view.sql`: vista `publicaciones_publicas` con `security_invoker = true` y sin columnas PII.
  > - La web pasó a consumirla en grilla (`usePublicaciones`) **y** detalle (`usePublicacion`, que antes leía la tabla base). Cero referencias a `publicaciones_searchable` en código ejecutable; queda solo en `src/types/database.ts` como declaración de tipo, con comentario de "la web no debe usarla".
  > - Check de `quickstart.md` reescrito: ahora ataca la API con la anon key vía curl en vez de mirar DevTools. Los 3 pasos pasan contra la vista nueva.
  > - Specs sincronizadas: `data-model.md`, `research.md` (R-01, R-10), `plan.md`, `contracts/supabase-queries.md` (Q1, Q2, tipos), `quickstart.md`, T024/T028.
  >
  > **Falta para cerrar la task** — un solo paso, y es de DB, no de código:
  > - `REVOKE SELECT ON public.publicaciones_searchable FROM anon;` (y evaluar `authenticated`, que hoy también la tiene). Requiere ejecución explícita por el humano contra Supabase; hasta entonces cualquiera con la anon key puede leer PII y filas no publicadas de esa vista, **independientemente de que la web ya no la use**.
  > - Verificar que el bot `capemisa_tool_buscar` sigue funcionando después del revoke (consulta con `service_role`, no debería verse afectado — pero confirmarlo, no asumirlo: asumir es exactamente lo que originó este bug).
  > - Re-correr los 3 pasos del check apuntando a `publicaciones_searchable`: los 3 deben fallar con permiso denegado.
  >
  > **No confundir dos cosas distintas** (surgió como duda el 2026-07-30): "mantener
  > `publicaciones_searchable` intacta" significa **no recortarle columnas**, porque
  > `capemisa_tool_buscar` lee `p.telefono` y `texto_whatsapp` de ahí. El `REVOKE` a `anon` **no
  > modifica la vista**: `db/03_search_view.sql` la otorga a `anon, authenticated, service_role`, y
  > sacarle `anon` deja el grant de `service_role` —el rol con el que consulta el bot— sin tocar. La
  > vista se puede mantener intacta **y** cerrar el acceso anónimo; no son alternativas excluyentes.
  > Por eso la task queda abierta y no cerrada como "riesgo aceptado".
- [X] T041 Crear/configurar servicio en el dashboard de **Coolify** apuntando al repo GitHub de T001, con las variables `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` en el UI de Coolify (nunca en el repo). Ver `contracts/deploy.md` para el contrato completo.
  > **Ejecutado distinto a lo planeado (2026-07-27/29)**: se usó **build pack Dockerfile**, no build command + publish directory. `web/Dockerfile` es multi-stage (`node:24.11.1-slim` compila → `nginx:alpine` sirve) con `web/nginx.conf` haciendo fallback SPA. El tag de Node está **pinneado a propósito**: `node:24-slim` deriva a npm 12 y rompe `npm ci`. Recurso Coolify: `capemisa-demo-web:main-m42p58eu8putm5pwtq5a7qkr`, Ports Exposes `80`, Port Mappings **vacío** (poner `80:80` choca con el proxy). Dominio `https://capemisa-app.fsalva157.dev`.
- [X] T042 Primer deploy vía pipeline. Abrir el dominio asignado y verificar que la home carga el catálogo (SC-006).
  > **Completado el 2026-07-29.** El deploy estuvo bloqueado dos días porque el botón Deploy no aparecía en la UI de Coolify; era un tema de dominio/configuración del recurso, resuelto manualmente por Fernando. **Pendiente de verificar**: que un push a `main` dispare el build automáticamente sin intervención (el requisito de auto-deploy de la constitución) — el primer deploy fue manual, el webhook no se probó.
- [X] T043 [P] Actualizar `web/README.md` con: (a) URL de producción, (b) comandos locales, (c) referencia a la spec en `specs/001-catalogo-publico/`, (d) recordatorio de que deploys son via `git push origin main` únicamente.
- [ ] T044 Cerrar la feature: marcar todos los checklists (`specs/001-catalogo-publico/checklists/requirements.md` — ya está completo, y `quickstart.md` con anotaciones de validación).
  > **Gap de trazabilidad — RESUELTO 2026-07-29.** La redacción original pedía "merge de la rama `001-catalogo-publico` a `main`", algo imposible: esa rama nunca existió en `capemisa-demo-web` porque los specs vivían fuera del repo.
  >
  > **Mudanza aplicada**: `specs/`, `.specify/` y `db/` pasaron a la raíz del repo (junto a `package.json` y `src/`). Spec Kit los sigue encontrando porque `get_repo_root()` localiza el directorio `.specify` caminando hacia arriba — **no usa git**. Verificado: `check-prerequisites.sh --json` resuelve la feature en la ruta nueva. No hubo que tocar la configuración de Coolify: base directory sigue en `/` y el Dockerfile en `/Dockerfile`.
  >
  > **Ignores**: `.gitignore` fusionó las reglas del proyecto padre y suma `.specify/feature.json` (estado mutable de sesión, no artefacto). `.dockerignore` excluye `specs/`, `.specify/`, `db/` y `.claude/` — no por versionado sino para que el `COPY . .` no invalide la capa de Docker en cada edición de una spec.
  >
  > **`.claude/` también se movió adentro**: Fernando decidió que de acá en adelante abre Claude Code **desde la raíz del repo**, no desde `capemisa-app-demo/`. Con eso el cwd coincide con la raíz del repo, las 10 skills `speckit-*` quedan versionadas, y `settings.local.json` sigue ignorado por ser estado por máquina.
  >
  > **Fuera del repo, a propósito**: `backups/` (dumps regenerables de n8n, 484 KB) y los scripts sueltos (`apply_*.py`, `inspect_*.py`, SQL one-off, `Requerimientos_capemisa.docx`), que siguen en `capemisa-app-demo/`.

---

## Dependencies

### Bloqueos entre fases

- **Phase 1 (Setup) → Phase 2 (Foundational)**: Foundational requiere que Vite/Tailwind/shadcn estén inicializados.
- **Phase 2 (Foundational) → Phase 3 (US1)**: US1 requiere cliente Supabase, tipos, Router, Layout y componentes shadcn instalados.
- **Phase 2 → Phase 4 (US2)** y **Phase 2 → Phase 5 (US3)**: mismo bloqueo.
- **Phase 4 (US2) → Phase 5 (US3)**: US3 activa un botón en la página de detalle (US2). Si se implementara US3 antes que US2, faltaría el punto de entrada (el detalle).
- **Phase 3 (US1) NO bloquea Phase 4 (US2)** en teoría (podría implementarse solo detalle sin grilla), pero la iteración recomendada es P1 → P2 → P3.
- **Phase 6 (Polish/Deploy)**: puede empezar cuando la fase que se quiere desplegar esté OK (por ejemplo se puede deployar solo US1 como MVP).

### Bloqueos entre tasks dentro de fase

- **Phase 1**: T003 (scaffold Vite) debe correr antes que T005, T006, T007, T008. T005 y T006 antes de T009. T004 en paralelo con casi todo (solo requiere que la carpeta `web/` exista).
- **Phase 2**: T011 (tipos) antes de T012 (cliente tipado). T015 (main.tsx) requiere T013 (queryClient), T016 (routes), y Toaster (que viene con shadcn). T021, T022, T023 son stubs y no bloquean entre sí. T017 requiere T018 (Navbar).
- **Phase 3**: T024, T025, T026 en paralelo. T027 requiere los tres. T028 (validación) requiere T027 finalizado.
- **Phase 4**: T029 y T031 en paralelo. T030 requiere T029. T032 requiere T030.
- **Phase 5**: T033 y T034 en paralelo. T035 requiere ambos. T036 requiere T035 + T030 (US2 debe estar hecho). T037 requiere T036.

---

## Parallel Execution Examples

### Dentro de Phase 1 (después de T003 scaffold)

```
T004 (escribir .env files) ∥ T005 (deps core) ∥ T006 (tailwind) ∥ T010 (README)
```

### Dentro de Phase 2 (después de T011)

```
T012 (supabase client) ∥ T013 (queryClient) ∥ T014 (i18n)
```

### Dentro de Phase 3 (setup componentes de US1)

```
T024 (hook usePublicaciones) ∥ T025 (PublicacionCard) ∥ T026 (FiltrosGrilla)
```

### Dentro de Phase 5 (setup de US3)

```
T033 (schema zod) ∥ T034 (mutation useEnviarConsulta)
```

### Dentro de Phase 6

```
T038 (responsive) ∥ T039 (edge) ∥ T040 (compliance) ∥ T043 (README)
```

---

## Implementation Strategy

### Suggested MVP scope: Phase 1 + Phase 2 + Phase 3 (US1)

Con solo US1 implementada el catálogo ya entrega valor: un visitante puede descubrir qué oportunidades existen. Es un release publicable y demoable por sí mismo.

**MVP delivery path**: T001 → T023 (setup + foundational) → T024 → T028 (US1) → T041 → T042 (deploy). ≈ 24 tasks para el primer release.

### Incremental delivery

1. **Release 1 (MVP)**: Phase 1+2+3 → `main` → producción con solo US1. Cliente ve el catálogo pero no puede abrir detalle.
   - Nota: al no haber detalle, el click en tarjeta puede navegar a un stub temporal o directamente al `NotFoundPage`. Alternativamente, se puede deferir el link hasta el Release 2.
2. **Release 2**: agregar Phase 4 (US2) → merge a `main` → producción con detalle habilitado. Botón "Solicitar contacto" visible pero deshabilitado.
3. **Release 3**: agregar Phase 5 (US3) + Phase 6 completa → merge a `main` → circuito completo.

### Testing strategy

Testing manual/visual según constitución. En cada checkpoint (T028, T032, T037, T042), correr los AC-* correspondientes del `quickstart.md` y registrar OK/issue. NO se generan tareas de tests automatizados (Principio V).

---

## Notes

- Las tareas suponen que el usuario está autorizado a ejecutar comandos npm/git localmente y a operar el dashboard Coolify manualmente cuando corresponda (T041).
- La regla de constitución "cambios en `db/*.sql` requieren ejecución explícita por el humano" NO aplica a esta feature: no modificamos schema.
- Si al ejecutar T001 aparece la situación de repo compartido bajo `/Projects` (git toplevel != CWD), pausar y consultar con el usuario antes de crear un repo nested (ver [[db-queries-user-runs-them]] como analogía: hay decisiones de infra que no se toman unilateralmente).
