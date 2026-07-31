# Implementation Plan: Login y área de miembro

**Branch**: `002-login-area-miembro` | **Date**: 2026-07-30 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/002-login-area-miembro/spec.md`

## Summary

Agregar autenticación de miembros y un área privada donde cada socio ve sus publicaciones en todos los estados, las solicitudes de contacto que recibió, y puede crear una publicación nueva o corregirla mientras no esté publicada. El visitante anónimo conserva el catálogo público sin cambios.

Las tres decisiones de alcance tomadas al cerrar la spec (aprobación manual fuera de la web, catálogo idéntico para todos, sin baja de publicaciones desde la web) reducen la superficie a **cuatro pantallas nuevas y un puñado de operaciones**, sin panel de administración ni ampliación de permisos de escritura.

La investigación encontró además que **la tabla base `publicaciones` es legible con datos de contacto por cualquiera que tenga la anon key** (R-01). Se decidió postergar el cierre: es un problema preexistente y **el login no lo amplía**, porque un miembro autenticado obtiene los mismos datos que obtendría sin autenticarse. Queda registrado como riesgo aceptado en FR-026b, junto con la T040 de la feature 001, y debe cerrarse antes de pasar a producción.

## Technical Context

**Language/Version**: TypeScript 6, React 19

**Primary Dependencies**: las ya instaladas — `@supabase/supabase-js` (autenticación incluida, sin dependencia nueva), `@tanstack/react-query`, `react-router-dom` 7, `react-hook-form` + `zod`, shadcn/ui sobre Tailwind

**Storage**: Supabase Postgres (proyecto `dpxfcmhgdieqvgdlqljf`). Esta feature **no crea tablas ni modifica objetos existentes**. Agrega exactamente tres: una vista (`mis_publicaciones`), una función auxiliar (`es_autor_de`) y una política (`consultas_select_autor`).

**Testing**: manual y visual, documentado en `quickstart.md` (Principio V). Con una exigencia agregada: los controles de acceso se verifican contra la API con credenciales reales, no desde la interfaz (R-09, SC-005).

**Target Platform**: navegadores evergreen, desktop y mobile desde 375 px. Sin PWA ni offline.

**Project Type**: aplicación de página única. Sin backend propio.

**Performance Goals**: "razonable" (constitución). Un puñado de miembros, menos de 50 publicaciones activas. Sin paginación.

**Constraints**: la aplicación usa exclusivamente la anon key; el `service_role` nunca llega al cliente. Interfaz en español rioplatense. Ninguna migración se ejecuta desde la aplicación.

**Scale/Scope**: 4 pantallas nuevas, 2 historias de lectura y 2 de escritura, 3 objetos nuevos de base, cero objetos modificados. 46 tareas.

## Constitution Check

*GATE: debe pasar antes de la fase 0 y volver a evaluarse tras el diseño.*

| Principio | Evaluación | Estado |
|---|---|---|
| **I — Spec-Driven Development** | Se siguió `specify → plan`, con los tres marcadores de clarificación cerrados por decisión explícita antes de planificar. | ✅ |
| **II — Human Gate sobre salidas de IA** | FR-016: toda publicación creada desde la web nace `pendiente`. El estado se omite en la escritura para que lo imponga la base, no el cliente. El formulario no ofrece los campos de generación asistida. La aprobación la hace una persona (FR-023). | ✅ |
| **III — Stack congelado** | Cero dependencias nuevas. La autenticación viene en el cliente de Supabase ya instalado. Formularios y componentes con el mismo stack de la feature 001. | ✅ |
| **IV — RLS y secretos** | Las tres tablas conservan RLS con políticas explícitas. Los dos objetos de lectura nuevos usan `security_invoker`, así que el RLS sigue siendo la barrera de fondo. Solo anon key en el cliente. **La feature no amplía la superficie expuesta** (FR-026b). | ✅ con deuda registrada |
| **V — YAGNI** | Sin panel de administración, sin registro público, sin recuperación de contraseña, sin gestión de seguimiento, sin baja de publicaciones. Las tres decisiones de alcance fueron todas la opción mínima. | ✅ |

**Sin violaciones. Sin entradas en Complexity Tracking.**

Una salvedad sobre el Principio IV: queda en verde por lo que esta feature **hace**, pero el proyecto arrastra dos deudas anteriores que no le pertenecen y que conviene no perder de vista. Ambas exponen los mismos datos de contacto a cualquiera con la anon key:

1. **T040 de la feature 001**: `publicaciones_searchable` mantiene acceso de lectura para anónimos, con datos de contacto y filas no publicadas.
2. **R-01**: la tabla base `publicaciones` es legible con datos de contacto por el mismo camino.

Las dos se postergaron con el mismo criterio de demo. La segunda se evaluó específicamente para esta feature y se comprobó que **el login no la agrava**: un miembro autenticado obtiene los mismos datos que obtendría sin sesión, porque la anon key es pública. Registrado en FR-026b. **Antes de producción, las dos deben cerrarse**; el procedimiento está en R-01.

### Re-evaluación posterior al diseño

Los artefactos de la fase 1 no introdujeron violaciones nuevas. Tres observaciones:

- **Los objetos nuevos conservan `security_invoker`**, así que el RLS sigue actuando como segunda barrera en toda la aplicación. Una versión anterior de este plan proponía sacrificarlo para cerrar R-01; al postergar ese cierre, la contradicción con el arreglo de la feature 001 desaparece.
- **El filtro `WHERE autor_id = auth.uid()` de `mis_publicaciones` no es redundante con el RLS.** Las políticas de `publicaciones` se combinan con OR y `publicaciones_select_publica` alcanza a `authenticated`: sin ese filtro, un miembro vería todas las publicadas de los demás con sus teléfonos. Es el punto más delicado del diseño y el más fácil de aprobar mal.
- **La validación de SC-003 exige una segunda cuenta de miembro que hoy no existe.** Sin ella no hay forma de probar que un miembro no ve datos de otro, que es el control de acceso central de esta feature. Está anotado como prerequisito en `quickstart.md`.

## Project Structure

### Documentation (this feature)

```text
specs/002-login-area-miembro/
├── plan.md              # Este archivo
├── spec.md              # Qué y por qué
├── research.md          # Fase 0 — R-01: riesgo aceptado
├── data-model.md        # Fase 1
├── quickstart.md        # Fase 1
├── contracts/
│   ├── ui-routes.md         # Rutas, pantallas y estados
│   ├── supabase-queries.md  # Operaciones contra la base
│   └── db-changes.md        # Los 3 objetos nuevos de base
└── tasks.md             # Fase 2 — lo genera /speckit-tasks
```

### Source Code (repository root)

```text
db/
├── 05_auth_miembros.sql        # NUEVO — vista, función y política (ejecución humana)
└── 06_seeds_miembro_b.sql      # NUEVO — segunda cuenta de miembro y datos de prueba

src/
├── auth/                       # NUEVO
│   ├── AuthProvider.tsx            # sesión + perfil en contexto
│   └── RutaProtegida.tsx           # con estado de carga (R-03)
├── hooks/
│   ├── useMisPublicaciones.ts      # NUEVO — listado propio
│   ├── useMiPublicacion.ts         # NUEVO — detalle propio
│   ├── useInteresados.ts           # NUEVO — solicitudes recibidas
│   ├── useCrearPublicacion.ts      # NUEVO
│   ├── useEditarPublicacion.ts     # NUEVO
│   └── (los de la feature 001 sin cambios)
├── pages/
│   ├── IngresarPage.tsx            # NUEVO
│   ├── MiAreaPage.tsx              # NUEVO
│   ├── MiPublicacionPage.tsx       # NUEVO — detalle + interesados
│   ├── PublicacionFormPage.tsx     # NUEVO — crear y editar
│   └── (las de la feature 001 sin cambios)
├── components/
│   ├── EstadoPublicacionBadge.tsx  # NUEVO — etiquetas legibles
│   ├── ListaInteresados.tsx        # NUEVO
│   ├── Navbar.tsx                  # MODIFICADO — sesión y acceso
│   └── (el resto sin cambios)
├── lib/
│   ├── schemaPublicacion.ts        # NUEVO — validación del formulario
│   ├── i18n.ts                     # MODIFICADO — etiquetas de estado
│   └── (el resto sin cambios)
├── types/database.ts           # MODIFICADO — vista nueva (se mantiene a mano)
└── routes.tsx                  # MODIFICADO — rutas nuevas
```

**Structure Decision**: se conserva la estructura de la feature 001 (páginas, hooks por operación, componentes, `lib`), agregando una carpeta `auth/` para las dos piezas transversales de sesión. No se introduce ninguna capa de servicios ni abstracción compartida entre hooks: cada uno hace su operación, coherente con el Principio V y con lo que ya existe.

## Orden de implementación sugerido

El orden lo fija `/speckit-tasks`. La dependencia dura es una sola: **los objetos de base van primero y verificados**. Sin la vista `mis_publicaciones` no hay área de miembro, sin la política nueva US2 devuelve vacío sin dar error, y si la vista quedó mal escrita el frontend construido encima muestra datos ajenos sin que nada falle.

Después de eso, las historias siguen el orden de prioridad de la spec: US1 (sesión y listado), US2 (interesados), US3 (crear), US4 (editar).

Al postergar R-01, esta fase dejó de tener la intervención riesgosa sobre producción que tenía la versión anterior del plan.

## Riesgos

| Riesgo | Impacto | Mitigación |
|---|---|---|
| **Vista `mis_publicaciones` sin el filtro por autor** | Un miembro ve las publicaciones publicadas de todos los demás **con sus teléfonos**, y a simple vista parece funcionar | Verificaciones 2 y 3, con dos cuentas distintas. Contar filas y verificar autoría, no mirar la pantalla |
| Política de solicitudes mal escrita | Un miembro lee las solicitudes de otro | Verificaciones 4 y 5 |
| Actualización bloqueada por estado que la interfaz confirma igual | El miembro cree que guardó y no guardó | AC-4.3 lo verifica explícitamente |
| Segunda cuenta de miembro no creada | SC-003 no se puede validar; los dos riesgos de arriba quedan sin comprobar | Prerequisito 2 de `quickstart.md`, tarea T002 |
| Nadie revisa la cola de pendientes | US3 parece rota aunque funcione | Dependencia operativa señalada en la spec; acordar con CAPEMISA antes de la demo |
| Que la deuda de R-01 y T040 se olvide al pasar a producción | Datos comerciales reales expuestos con una clave pública | Registrado en FR-026b con el procedimiento de cierre en R-01 |
