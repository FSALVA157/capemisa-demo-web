<!--
Sync Impact Report
==================
Version change: 1.0.0 → 1.0.1 (PATCH)
Rationale: aclaración operativa sobre el pipeline de deployment. No introduce principio
nuevo ni redefine uno existente; refina el "Deploy target" ya declarado y agrega una
regla de disciplina en Development Workflow. Herramienta específica (Coolify) queda
marcada como revisable sin bump.

Principles modified: none.

Sections modified:
  - Technical & Structural Constraints — expansión del bullet "Deploy target" con origen
    Git (rama `main`) y orquestador Coolify.
  - Development Workflow — nueva bullet: prohibición de deploys manuales por SSH/FTP.

Sections added / removed: none.

Templates status:
  ✅ .specify/templates/plan-template.md — sin cambios requeridos; la sección
     "Constitution Check" absorbe la nueva regla vía referencia genérica.
  ✅ .specify/templates/spec-template.md — sin cambios requeridos.
  ✅ .specify/templates/tasks-template.md — sin cambios requeridos.
  ✅ .claude/skills/speckit-*/SKILL.md — sin cambios requeridos.

Follow-up TODOs:
  - TODO(idioma-UI): confirmar en la próxima interacción si es español rioplatense estricto
    o LATAM neutro. La sección "Technical & Structural Constraints" asume rioplatense.

Historia previa:
  - 1.0.0 (2026-07-23): ratificación inicial con 5 principios (SDD, Human Gate AI, Fixed
    Stack, RLS+Secrets, YAGNI) y 3 secciones (Constraints, Workflow, Governance).
-->

# CAPEMISA Conecta Constitution

## Core Principles

### I. Spec-Driven Development (NON-NEGOTIABLE)

Toda feature MUST atravesar la secuencia SDD antes de tocar código productivo:
`constitution → specify → clarify (opcional) → plan → tasks → implement`.
Los artefactos generados (`spec.md`, `plan.md`, `tasks.md`) son la fuente de verdad; el
código refleja la spec, no al revés. Ningún commit de implementación es aceptable si no
existe un `tasks.md` aprobado que lo motive.

**Rationale**: el propósito pedagógico de este proyecto es aprender SDD con GitHub Spec
Kit. Además, forzar el ciclo evita sobre-ingeniería, mantiene trazabilidad entre
requerimiento y código, y permite retomar el trabajo entre sesiones sin perder contexto.

### II. Human Gate over AI Output (NON-NEGOTIABLE)

Todo contenido generado por IA que sea visible al usuario final MUST pasar por revisión y
aprobación explícita de un usuario con rol `admin` antes de publicarse. El pipeline
canónico es: IA genera → registro con `estado='pendiente'` → admin revisa y edita si hace
falta → admin transiciona a `estado='publicada'`. No existen atajos para "casos
evidentes", ni excepciones automáticas por confianza del modelo.

Aplica a: clasificación de rubro/subrubro, descripciones comerciales enriquecidas,
títulos, texto WhatsApp, matches oferta↔búsqueda, y cualquier salida futura de IA
destinada a un consumidor humano.

**Rationale**: la información comercial es confidencial y el cliente (CAPEMISA) asume
responsabilidad por lo que el sistema muestra. Un output IA sin curación humana rompe la
confianza institucional y expone al cliente. Requisito explícito del brief original.

### III. Fixed Stack for Demo (NON-NEGOTIABLE)

El stack de la demo está congelado:

- **Frontend**: Vite + React + TypeScript + Tailwind CSS + shadcn/ui + React Router v6 +
  TanStack Query.
- **Backend de datos**: Supabase (Postgres + Auth + Row Level Security) como única fuente
  de verdad transaccional.
- **Orquestación de IA**: n8n como cerebro compartido (WhatsApp bot + chat web + jobs),
  Claude API para razonamiento y generación.

Prohibido en la demo, incluso si "sería mejor": NestJS u otro backend propio, API oficial
de WhatsApp Business, frameworks alternativos (Angular, Vue, Svelte, Next.js, etc.),
librerías UI que compitan con shadcn (MUI, Chakra, Ant), o cualquier ORM que reemplace al
cliente Supabase.

**Rationale**: consistencia con el trabajo ya hecho (DB, workflows n8n, prompts), evita
bikeshedding, y respeta la restricción del brief que excluye la API oficial de WhatsApp.
La constitución de producción re-evaluará el stack cuando corresponda.

### IV. Security by RLS and Secrets Hygiene

Toda tabla bajo `public.*` MUST tener Row Level Security habilitado con políticas
explícitas antes de recibir tráfico. El frontend consume exclusivamente la `anon key` de
Supabase; el `service_role` key MUST permanecer server-side (solo n8n o un backend
propio) y NUNCA aparecer en el bundle del cliente, ni siquiera comentado.

Secretos residen en `.env.local` (obligatorio en `.gitignore`). El repositorio commitea
`.env.example` con nombres de variables pero sin valores. Cualquier archivo que exponga
el `service_role` en frontend es un incidente que MUST revertirse antes de continuar.

**Rationale**: defensa en profundidad. La `anon key` es de diseño pública; la barrera
real es RLS. Filtrar el `service_role` invalida toda la superficie de seguridad y expone
información comercial confidencial de las empresas socias.

### V. Demo Simplicity (YAGNI)

Preferir la solución más simple que satisfaga la spec vigente. Prohibido introducir
abstracciones, capas, wrappers o "hooks para el futuro" sin uso concreto en la spec
actual. Tres implementaciones similares es preferible a una abstracción prematura.

Testing manual/visual es el default para la demo; automatización solo se justifica cuando
la spec lo pida explícitamente por riesgo documentado. Features fuera del alcance de la
demo (upload real de archivos, registro público de usuarios, i18n, PWA, offline, dark
mode, notificaciones push) están prohibidos hasta que la spec correspondiente los
incorpore.

**Rationale**: la demo tiene ventana temporal acotada; sobre-ingeniería aquí retrasa la
validación con el cliente. La deuda técnica pragmática es aceptable porque la
constitución de producción re-evaluará el bar de calidad cuando el proyecto salte de
demo a producto.

## Technical & Structural Constraints

- **Layout monorepo**:
  - `/db` — schema, seeds, migraciones y vistas SQL (fuente de verdad de estructura).
  - `/web` — frontend React (creado por `/speckit-implement`, no antes).
  - `/discusion`, `Requerimientos_capemisa.docx` — contexto histórico y brief cliente.
  - `/docs` — documentación viva de la demo (creado on-demand).
  - `/.specify` — infraestructura SDD (no editar a mano).
  - `/.claude` — configuración del agente + skills (parcialmente gitignored).
- **Idioma UI**: español rioplatense (Argentina) para toda la interfaz, mensajes de
  error, labels y microcopy. Ver TODO en Sync Impact Report para confirmación pendiente.
- **Responsive**: mobile-first con breakpoints default de Tailwind (`sm 640`, `md 768`,
  `lg 1024`, `xl 1280`). Verificación mínima en 375, 768 y 1440 px de ancho.
- **Accesibilidad**: esfuerzo razonable — contraste WCAG AA en colores, `label` explícito
  en inputs, navegación por teclado en formularios y diálogos. Sin auditoría formal.
- **Rendimiento**: "razonable" para demo; no hay objetivos numéricos formales.
- **Deploy target**: VPS Hostinger propio, con auto-deploy desde la rama `main` de un
  repositorio GitHub del proyecto. La herramienta de orquestación actual es **Coolify**
  (elección revisable sin bump: se puede sustituir por Dokploy, Docker Compose puro u
  otra, siempre que se mantenga el pipeline Git-based). El build estático se sirve por
  HTTP; el cliente consulta Supabase directamente y a n8n vía webhook.
- **Cuentas y seeds**: los usuarios demo (`miembro@capemisa.com`, `admin@capemisa.com`,
  Fernando `33333...`, Edgardo `44444...`) son datos de prueba y no representan
  producción; el registro público está deshabilitado.

## Development Workflow

- Toda feature nueva sigue el ciclo SDD: `/speckit-specify → /speckit-plan → /speckit-tasks
  → /speckit-implement`. Comandos opcionales `/speckit-clarify`, `/speckit-checklist` y
  `/speckit-analyze` se invocan cuando aportan valor (spec ambigua, requisitos
  regulados, artefactos numerosos).
- Cada fase produce un artefacto Markdown revisable por humano antes de avanzar. El
  humano tiene autoridad de veto en cada transición.
- Cambios que afecten un principio de esta constitución MUST pasar por
  `/speckit-constitution` con bump de versión (ver Gobernanza).
- Cambios en `db/*.sql` requieren ejecución explícita por el humano contra el proyecto
  Supabase (o autorización explícita para ejecutar vía MCP). Nunca migraciones
  automáticas desde código de aplicación.
- Cambios en workflows n8n se hacen vía MCP (`n8n-capemisa`), no manualmente en la UI,
  para mantener trazabilidad.
- **Pipeline de deploy**: toda salida a producción MUST pasar por push/merge a la rama
  `main` del repositorio GitHub del proyecto, disparando auto-deploy al VPS Hostinger.
  Deploys manuales por SSH, SFTP, FTP, `scp` o edición directa en el VPS están
  prohibidos, incluso para hotfixes urgentes: el hotfix se materializa como commit en
  `main`. La rama `main` se considera producción; cualquier trabajo en curso vive en
  ramas feature.
- Formato de commits: libre para la demo; se sugiere Conventional Commits pero no es
  obligatorio.
- Code review formal: N/A (proyecto individual). El humano actúa como reviewer implícito
  en cada gate del flujo SDD.

## Governance

Esta constitución rige por encima de cualquier otra guía del proyecto (READMEs, notas,
memoria del agente). En caso de conflicto, la constitución prevalece.

**Enmiendas**: requieren invocar `/speckit-constitution` con la propuesta de cambio,
seguir el flujo interactivo del skill, y bump de versión según SemVer:

- **MAJOR**: eliminación o redefinición backwards-incompatible de un principio
  NON-NEGOTIABLE, o cambio de gobernanza.
- **MINOR**: incorporación de un principio nuevo o expansión material de una sección.
- **PATCH**: aclaración de redacción, corrección de tipos, refinamientos no semánticos.

Toda enmienda MUST propagarse a los templates dependientes (`plan-template.md`,
`spec-template.md`, `tasks-template.md`) y a los skills instalados en `.claude/skills/`
si aplica. La propagación se documenta en el Sync Impact Report del propio archivo.

**Cumplimiento**: cualquier commit que viole un principio NON-NEGOTIABLE (I, II, III) MUST
revertirse antes de continuar. Excepciones puntuales requieren justificación escrita en la
spec de la feature correspondiente y aprobación humana explícita.

**Alcance temporal**: esta constitución cubre exclusivamente la fase de demo. Cuando el
proyecto transicione a producción, se ratificará una constitución nueva (v2.0.0 o
proyecto separado) que revisará testing, deploy, backend propio (NestJS), upload real y
demás dimensiones diferidas.

**Version**: 1.0.1 | **Ratified**: 2026-07-23 | **Last Amended**: 2026-07-23
