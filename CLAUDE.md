# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Qué es esto

Frontend del catálogo público de **CAPEMISA Conecta**: una demo institucional donde empresas socias publican ofertas/búsquedas de servicios y equipos, y visitantes anónimos las navegan y dejan una consulta de contacto.

El repo git es este directorio (`web/`), aunque también contiene `db/` (SQL, fuente de verdad del schema) y `specs/`. El directorio padre (`capemisa-app-demo/`) tiene el brief del cliente y scripts sueltos de n8n, y **no** está bajo control de versiones.

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

- **Router**: `src/routes.tsx` — `App.tsx` es el layout (Navbar + `<Outlet/>`), con `/` (catálogo), `/publicacion/:id` (detalle) y `*` (404).
- **Providers**: `src/main.tsx` monta `QueryClientProvider` + `RouterProvider` + `<Toaster/>` de sonner. Defaults de Query en `src/lib/queryClient.ts` (`staleTime` 30s, sin refetch on focus, 1 retry).
- **Hooks** (uno por operación, sin abstracción compartida): `usePublicaciones` (grilla, filtro por tipo + keyword), `usePublicacion` (detalle por id), `useEnviarConsulta` (mutación de inserción).
- **Alias**: `@/*` → `src/*`, configurado en `vite.config.ts` y `tsconfig.app.json`. Usarlo en imports nuevos.
- **shadcn/ui**: componentes generados viven en `src/components/ui/` — no editarlos a mano salvo necesidad; `components.json` los configura (estilo default, base slate, CSS variables, iconos lucide).

### Modelo de datos y las dos vistas de Postgres

Tablas: `perfiles`, `publicaciones` (campos de usuario + campos generados por IA + `estado`), `consultas`. Todas con RLS habilitado; `db/01_schema.sql` es la referencia.

Existen **dos** vistas de búsqueda y la distinción es de seguridad, no cosmética:

- `publicaciones_publicas` (`db/04_public_view.sql`) — **la única que la web debe usar**. Tiene `security_invoker = true`, así que respeta el RLS del que consulta (`anon` solo ve `estado='publicada'`), y excluye PII (`telefono`, `email`, `responsable`, `observaciones_internas`, `texto_whatsapp`, `autor_id`, `matches`).
- `publicaciones_searchable` (`db/03_search_view.sql`) — para el bot de n8n con `service_role`. Es `p.*` **sin** `security_invoker`, o sea saltea RLS y expone PII. El nodo `Shape resultados` de `capemisa_tool_buscar` depende de sus columnas: no recortarla, la rompe en silencio.

Los specs (`data-model.md`, `research.md` R-01/R-10, `plan.md`, `contracts/supabase-queries.md`, `quickstart.md`, T024/T028/T040) están sincronizados con esta corrección desde el 2026-07-29 y conservan el registro de por qué la versión anterior era insegura. **Cierre pendiente**: `publicaciones_searchable` sigue con `GRANT SELECT` a `anon`, así que el Principio IV no está cumplido todavía — falta el `REVOKE`, que lo corre el humano contra Supabase (ver T040 en `tasks.md`).

Las queries filtran `.eq('estado', 'publicada')` explícitamente aunque el RLS ya lo garantice: defensa en profundidad, mantener el patrón.

Búsqueda por keyword: la vista precalcula `search_text` con `extensions.unaccent(lower(...))`; el cliente normaliza el input con `normalizarBusqueda()` (`src/lib/i18n.ts`) y hace `ilike('%kw%')`. Ambos lados deben normalizar igual o la búsqueda con acentos falla.

`src/types/database.ts` es el tipado de Supabase, **mantenido a mano** — al cambiar `db/*.sql` hay que actualizarlo. Los `select()` con lista de columnas rompen la inferencia de postgrest-js, de ahí los `as unknown as T` en los hooks contra tipos declarados localmente (`PublicacionListItem`, `PublicacionDetalle`).

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
