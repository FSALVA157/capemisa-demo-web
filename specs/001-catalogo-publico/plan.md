# Implementation Plan: Catálogo público de publicaciones

**Branch**: `001-catalogo-publico` | **Date**: 2026-07-23 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/001-catalogo-publico/spec.md`

## Summary

Primer punto de valor de CAPEMISA Conecta: un visitante anónimo entra al sitio, ve una grilla responsive de publicaciones activas (estado 'publicada'), filtra por tipo o por palabra clave (con normalización de acentos), abre el detalle en una URL propia y — si le interesa — envía una solicitud de contacto que queda registrada en la base para que el equipo de CAPEMISA medie. Sin exposición del contacto directo del oferente en la ficha pública.

**Enfoque técnico**: SPA en React+TypeScript montada bajo `/web/`, servida como build estático desde el VPS Hostinger vía Coolify (pipeline GitHub `main` → auto-deploy). El frontend consume Supabase directamente con la `anon key` y confía en las políticas RLS ya desplegadas en `/db` (que ya filtran por `estado='publicada'` para `anon`). Sin backend propio en esta feature. UI en español rioplatense, Tailwind + shadcn/ui, formulario de consulta con react-hook-form + zod. Testing manual/visual (Principio V de la constitución).

## Technical Context

**Language/Version**: TypeScript 5.x sobre Node 20 LTS (dev tooling). Runtime del cliente = navegadores evergreen.

**Primary Dependencies**:

- `react` 18, `react-dom` 18
- `vite` 5 (build + dev server)
- `tailwindcss` 3 + `@tailwindcss/postcss` y `autoprefixer`
- `shadcn/ui` (componentes copy-paste sobre Radix UI)
- `react-router-dom` 6 (data router)
- `@tanstack/react-query` 5
- `@supabase/supabase-js` 2
- `react-hook-form` 7 + `zod` 3 (para el formulario "Solicitar contacto")
- `clsx` + `tailwind-merge` (helper `cn` de shadcn)
- `lucide-react` (iconos, viene con shadcn)

**Storage**: Supabase Postgres 17 (proyecto `dpxfcmhgdieqvgdlqljf`, región us-west-2). Esta feature **consume** el schema ya existente en `/db`; NO crea tablas nuevas. Objetos involucrados: `public.publicaciones` (tabla base, nunca consultada directo por la web), `public.publicaciones_publicas` (vista `security_invoker` con `search_text` normalizado y sin PII — **la única que lee la web**, grilla y detalle), `public.consultas` (INSERT abierto vía RLS).

> **Desvío del plan original (2026-07-29)**: el plan decía "NO crea tablas nuevas" y eso sigue siendo
> cierto, pero la feature **sí terminó creando un objeto de base de datos**: la vista
> `publicaciones_publicas` (`/db/04_public_view.sql`), necesaria para corregir el problema de RLS/PII
> documentado en `data-model.md` y R-01. El plan asumía consumir `publicaciones_searchable` tal cual.

**Testing**: Manual/visual únicamente (Principio V + decisión de constitución). Los acceptance scenarios de la spec se validan a mano contra la app corriendo. Sin Vitest, sin Playwright en esta feature.

**Target Platform**: navegadores evergreen (últimas 2 versiones de Chrome, Firefox, Safari, Edge). Desktop y mobile (a partir de 375 px de ancho). Sin soporte para navegadores legacy ni offline/PWA.

**Project Type**: web application single-page (SPA). Sin backend propio; Supabase actúa como backend-as-a-service. Estructura de repositorio = monorepo con `/db` (SQL) y `/web` (frontend).

**Performance Goals**: "razonable" (constitución). Objetivos concretos deliberadamente no numéricos para esta demo. Como piso subjetivo: la grilla debe cargar de forma perceptualmente instantánea con <50 publicaciones (una sola query a Supabase); el envío de consulta debe confirmarse en <2 s en condiciones normales.

**Constraints**:

- Build estático (sin SSR) servible desde VPS Hostinger + Coolify.
- Pipeline de deploy = push a `main` en GitHub → auto-deploy (Constitución v1.0.1).
- Solo `anon key` de Supabase en el bundle; jamás `service_role` (Principio IV).
- Sin dark mode, sin i18n, sin PWA, sin upload real (Principio V + Assumptions de la spec).
- Idioma UI: español rioplatense.

**Scale/Scope**: <50 publicaciones activas simultáneas durante la demo. Sin paginación. Volumen de consultas esperado: <100 durante el ciclo demo. Volumen de visitantes concurrentes: bajo (uso presencial en reuniones + accesos individuales).

## Constitution Check

*GATE: pasar antes de Phase 0. Re-evaluar después de Phase 1.*

Evaluación contra los 5 principios de `.specify/memory/constitution.md` v1.0.1:

| Principio | Estado | Justificación |
|-----------|--------|---------------|
| I. Spec-Driven Development (NON-NEGOTIABLE) | ✅ Pass | Este plan proviene de `/speckit-specify` con `spec.md` aprobado; el `tasks.md` posterior lo va a materializar. No hay código antes de `/speckit-implement`. |
| II. Human Gate over AI Output (NON-NEGOTIABLE) | ✅ Pass | FR-001 y SC-002 fuerzan que solo se muestren publicaciones en estado 'publicada' — el gate humano de admin es prerequisito para llegar a ese estado. La feature no genera contenido con IA, solo consume el ya curado. |
| III. Fixed Stack for Demo (NON-NEGOTIABLE) | ✅ Pass | Stack elegido = el declarado por la constitución (Vite+React+TS+Tailwind+shadcn+RRv6+TanStack Query+Supabase). Ninguna dependencia prohibida (no NestJS, no WhatsApp API oficial, no otras UI libraries). |
| IV. Security by RLS & Secrets Hygiene | ✅ Pass | El cliente usa solo `anon key` (bundle-safe por diseño). Las políticas RLS ya desplegadas (`publicaciones_select_publica` y `consultas_insert_open`) implementan la seguridad de esta feature sin que el código las duplique. `.env.local` y `.env.example` según regla. |
| V. Demo Simplicity (YAGNI) | ✅ Pass | Sin abstracciones prematuras: un `supabase` client, hooks TanStack Query directos, componentes de página con lógica inline razonable. Testing manual. Sin features fuera de spec (nada de PWA/dark/i18n/upload/registro). |

Reglas adicionales de la constitución (Constraints y Workflow):

- **Deploy pipeline** (VPS Hostinger + Coolify desde `main`): se cubre en Phase 1 con `contracts/deploy.md`.
- **Idioma UI**: español rioplatense — todos los textos del plan y del código lo respetarán.
- **Layout monorepo**: la feature se materializa en `/web/` como establece la constitución; `/db` no se toca.

**Resultado del gate**: ✅ **PASS sin violaciones**. La sección "Complexity Tracking" queda vacía.

## Project Structure

### Documentation (this feature)

```text
specs/001-catalogo-publico/
├── plan.md              # este archivo (/speckit-plan output)
├── spec.md              # /speckit-specify output
├── research.md          # Phase 0 output — decisiones técnicas de esta feature
├── data-model.md        # Phase 1 output — cómo la feature usa el modelo existente
├── quickstart.md        # Phase 1 output — cómo validar end-to-end
├── contracts/
│   ├── supabase-queries.md   # queries exactas que ejecuta el frontend
│   ├── ui-routes.md          # rutas y contratos de página
│   └── deploy.md             # contrato del pipeline GitHub → Coolify → VPS
├── checklists/
│   └── requirements.md   # de /speckit-specify
└── tasks.md             # (creado por /speckit-tasks)
```

### Source Code (repository root)

Al terminar esta feature, la estructura del repo queda:

```text
capemisa-app-demo/
├── .specify/                 # infraestructura Spec Kit (existe)
├── .claude/                  # skills + config agente (existe)
├── db/                       # SQL — NO se toca en esta feature
│   ├── 01_schema.sql
│   ├── 02_seeds.sql
│   └── 03_search_view.sql
├── discusion                 # brief histórico (existe)
├── Requerimientos_capemisa.docx
├── specs/                    # docs SDD por feature
│   └── 001-catalogo-publico/
├── web/                      # frontend React — CREADO por esta feature
│   ├── index.html
│   ├── package.json
│   ├── vite.config.ts
│   ├── tsconfig.json
│   ├── tailwind.config.ts
│   ├── postcss.config.js
│   ├── components.json       # config shadcn
│   ├── .env.example
│   ├── .env.local            # gitignored
│   └── src/
│       ├── main.tsx          # bootstrap + QueryClient + Router
│       ├── App.tsx           # layout raíz + Navbar
│       ├── index.css         # Tailwind + CSS vars shadcn
│       ├── routes.tsx        # definición de rutas
│       ├── lib/
│       │   ├── supabase.ts   # cliente Supabase único
│       │   ├── queryClient.ts
│       │   └── utils.ts      # helper `cn` de shadcn
│       ├── types/
│       │   └── database.ts   # tipos generados vía `supabase gen types`
│       ├── hooks/
│       │   ├── usePublicaciones.ts   # lista + filtros
│       │   ├── usePublicacion.ts     # detalle por id
│       │   └── useEnviarConsulta.ts  # mutation
│       ├── components/
│       │   ├── ui/           # shadcn (button, card, input, badge, dialog, form, textarea, select, toast, skeleton)
│       │   ├── Navbar.tsx
│       │   ├── PublicacionCard.tsx
│       │   ├── FiltrosGrilla.tsx
│       │   ├── EstadoVacio.tsx
│       │   ├── ImagenPublicacion.tsx  # con placeholder fallback
│       │   └── DialogSolicitarContacto.tsx
│       └── pages/
│           ├── CatalogoPage.tsx           # US1
│           ├── PublicacionDetallePage.tsx # US2 y punto de entrada de US3
│           └── NotFoundPage.tsx
├── .gitignore
└── README.md                 # a crear en tasks (breve)
```

**Structure Decision**: aplicamos **Option 2 (Web application) simplificado**: solo `web/` como frontend, sin `backend/` propio (Supabase reemplaza esa capa por completo). El SQL de la base vive en `/db` y es compartido con el resto del proyecto (n8n workflows, etc.); esta feature lo consume sin modificarlo.

## Complexity Tracking

_No aplica — el gate de constitución pasó sin violaciones._

## Referencia a artefactos de diseño

- **Phase 0 (research)**: [research.md](./research.md) — decisiones técnicas específicas de esta feature.
- **Phase 1 (data model)**: [data-model.md](./data-model.md) — cómo se usan las tablas existentes.
- **Phase 1 (contracts)**: [contracts/](./contracts/) — 3 archivos (Supabase queries, UI routes, deploy pipeline).
- **Phase 1 (quickstart)**: [quickstart.md](./quickstart.md) — pasos para validar la feature end-to-end.
