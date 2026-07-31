# Specification Quality Checklist: Login y área de miembro

**Purpose**: Validate specification completeness and quality before proceeding to planning
**Created**: 2026-07-30
**Feature**: [spec.md](../spec.md)

## Content Quality

- [x] No implementation details (languages, frameworks, APIs)
- [x] Focused on user value and business needs
- [x] Written for non-technical stakeholders
- [x] All mandatory sections completed

## Requirement Completeness

- [x] No [NEEDS CLARIFICATION] markers remain
- [x] Requirements are testable and unambiguous
- [x] Success criteria are measurable
- [x] Success criteria are technology-agnostic (no implementation details)
- [x] All acceptance scenarios are defined
- [x] Edge cases are identified
- [x] Scope is clearly bounded
- [x] Dependencies and assumptions identified

## Feature Readiness

- [x] All functional requirements have clear acceptance criteria
- [x] User scenarios cover primary flows
- [x] Feature meets measurable outcomes defined in Success Criteria
- [x] No implementation details leak into specification

## Notes

**Iteración 1 (2026-07-30)** — 17 de 18 ítems pasan.

Correcciones aplicadas durante la validación:

- Se quitaron de la spec los nombres de cuentas y direcciones de email de prueba, que aparecían
  en US1 y en Edge Cases. Son detalle de implementación/entorno y no corresponden a un documento
  dirigido a stakeholders no técnicos; viven en los seeds y en el `quickstart.md` de la feature.
- Se reformuló FR-010 y SC-005 para expresar la exigencia de que el control de acceso viva en el
  modelo de datos sin nombrar el mecanismo concreto. Es una lección directa del incidente de la
  feature 001: un criterio de seguridad redactado sobre lo que hace la interfaz se puede aprobar
  sin que el modelo de datos sea seguro. SC-005 exige probar el origen de datos directamente.
- El Edge Case de "publicación rechazada" estaba redactado como pregunta abierta; se resolvió con
  una decisión explícita (sí aparece, con su estado) y su fundamento.
- Se agregó la sección Dependencies, que el template no trae, para dejar asentadas las dos
  condiciones externas que pueden dejar historias sin valor: el circuito de aprobación (US3) y el
  permiso de lectura de solicitudes (US2).

**Iteración 2 (2026-07-30)** — 18 de 18 ítems pasan. Spec lista para `/speckit-plan`.

Los 3 marcadores [NEEDS CLARIFICATION] se resolvieron con decisión explícita del responsable del
proyecto. Las tres respuestas fueron la opción de menor alcance, y en conjunto **reducen la feature
de forma sustantiva**:

| Marcador | Decisión | Consecuencia sobre el alcance |
|---|---|---|
| FR-023 (quién aprueba) | Manual, fuera de la web, por una persona con rol de administración | No hay pantalla de administración. Se evita una quinta historia. Queda una dependencia **operativa**, no técnica: si nadie revisa la cola, US3 no cierra el ciclo. |
| FR-026 (contacto entre miembros) | El miembro ve el catálogo igual que un anónimo | No hace falta ninguna vía de lectura nueva para usuarios autenticados. El catálogo público queda intacto y no se reintroduce PII en la superficie web. |
| FR-027 (alcance de "administrar") | Solo consultar y ver interesados sobre publicaciones ya publicadas | No se amplían permisos de escritura. No hay baja, despublicación ni eliminación desde la web. |

**Efecto combinado, relevante para planificación**: el único cambio al modelo de datos que la feature
requiere es **un permiso de lectura** que le permita a un miembro ver las solicitudes de contacto de
sus propias publicaciones (condición de US2). Todo lo demás se apoya en permisos que ya existen.
Conviene verificarlo en `/speckit-plan` antes de dar por cerrado el diseño de datos.

Dos puntos que quedan explícitamente fuera y que conviene no perder de vista:

- **Cola de revisión sin dueño asignado**: FR-023 define *dónde* se aprueba, no *quién* ni *cada
  cuánto*. Acordarlo con CAPEMISA antes de mostrar la demo, o US3 se ve rota aunque funcione.
- **Asimetría con WhatsApp**: por el canal de WhatsApp un socio recibe el teléfono del oferente;
  por la web no. Es coherente con FR-026a y con el modelo de privacidad, pero es una diferencia
  visible entre canales que alguien va a preguntar durante la demo.
