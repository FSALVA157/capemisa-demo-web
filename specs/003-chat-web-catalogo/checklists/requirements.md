# Specification Quality Checklist: Chat web del catálogo

**Purpose**: Validate specification completeness and quality before proceeding to planning
**Created**: 2026-08-01
**Feature**: [spec.md](../spec.md)

## Content Quality

- [x] No implementation details (languages, frameworks, APIs) — *con excepción deliberada, ver Nota 1*
- [x] Focused on user value and business needs
- [x] Written for non-technical stakeholders
- [x] All mandatory sections completed

## Requirement Completeness

- [x] No [NEEDS CLARIFICATION] markers remain
- [x] Requirements are testable and unambiguous
- [x] Success criteria are measurable
- [x] Success criteria are technology-agnostic (no implementation details) — *ver Nota 2*
- [x] All acceptance scenarios are defined
- [x] Edge cases are identified
- [x] Scope is clearly bounded
- [x] Dependencies and assumptions identified

## Feature Readiness

- [x] All functional requirements have clear acceptance criteria
- [x] User scenarios cover primary flows
- [x] Feature meets measurable outcomes defined in Success Criteria
- [x] No implementation details leak into specification — *ver Nota 1*

## Notes

**Nota 1 — excepción deliberada sobre detalles de implementación.** La sección
"Restricciones de integración" (FR-030 a FR-035) nombra workflows de n8n concretos,
Redis y la clave `service_role`. Es una violación consciente de la regla de mantener la
spec agnóstica de implementación, y está aquí por pedido explícito del responsable del
proyecto: la automatización nombrada está en uso frente al cliente y una modificación
accidental no es recuperable dentro de la ventana de la demo. Nombrar los artefactos es
justamente lo que hace la restricción verificable; una redacción genérica
("no romper integraciones existentes") no sería testable. La constitución contempla
excepciones puntuales con justificación escrita en la spec y aprobación humana explícita
(sección Gobernanza / Cumplimiento). El resto de la spec —US1 a US3, FR-001 a FR-029,
SC-001 a SC-011— se mantiene agnóstico.

**Nota 2 — SC-009 menciona n8n y WhatsApp.** Por la misma razón que la Nota 1: es el
criterio que verifica que no se rompió lo que ya funciona, y para ser verificable tiene
que nombrar qué debe seguir intacto.

**Nota 3 — sin [NEEDS CLARIFICATION].** Las tres decisiones que podrían haberlo requerido
—alcance limitado a la rama de invitado, precarga de datos para usuarios con sesión, y
tope de uso anónimo— fueron resueltas explícitamente con el responsable del proyecto
antes de redactar, y quedaron registradas en Assumptions.

**Nota 4 — valores ajustables.** El tope de 30 mensajes por hora por origen (FR-024) y el
umbral de 15 segundos de respuesta (SC-004) son valores de demo elegidos por defecto, no
requisitos derivados de una medición. Ajustarlos no requiere reabrir la spec.
