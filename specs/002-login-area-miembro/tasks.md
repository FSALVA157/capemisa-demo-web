---

description: "Task list — Login y área de miembro"
---

# Tasks: Login y área de miembro

**Input**: Design documents from `specs/002-login-area-miembro/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: sin pruebas automatizadas. La spec y el Principio V de la constitución fijan validación manual y visual, documentada en `quickstart.md`. Las tareas de validación manual son parte de cada historia, no un extra.

**Organization**: agrupadas por historia de usuario para que cada una se implemente, valide y entregue por separado.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: se puede hacer en paralelo (archivos distintos, sin dependencias pendientes)
- **[Story]**: a qué historia pertenece (US1–US4)
- Rutas de archivo exactas en cada descripción

## Path Conventions

Raíz del repositorio: `db/` para SQL, `src/` para el frontend. Layout confirmado en `plan.md`.

## ⚠️ Antes de empezar

Las tareas marcadas **🔒 EJECUCIÓN HUMANA** modifican la base de datos. Por la constitución (Development Workflow) las corre una persona contra Supabase; nunca se ejecutan desde código de aplicación. Agente: preparar el SQL, no aplicarlo.

---

## Phase 1: Setup (preparación)

**Purpose**: reunir lo necesario antes de tocar la base o el frontend.

- [X] T001 [P] Crear `db/05_auth_miembros.sql` con encabezado explicativo al estilo de `db/04_public_view.sql`: qué objetos crea, por qué existe cada uno, y qué se rompe si alguien los "arregla" sin contexto. Incluir en el encabezado la nota de FR-026b sobre lo que este archivo **deliberadamente no hace** (no revoca privilegios de la tabla base, no toca `publicaciones_publicas`) y por qué. Dejar el cuerpo para T004–T006.
- [X] T002 [P] Crear `db/06_seeds_miembro_b.sql` con una **segunda cuenta de miembro** (cuenta de autenticación + identidad + fila en `perfiles`), al menos 1 publicación propia y 1 solicitud de contacto sobre ella. Sin esto, SC-003 —que un miembro no vea datos de otro— **no se puede validar**. Ver prerequisito 2 de `quickstart.md`.
- [X] T003 [P] Ampliar los datos de prueba del miembro existente en `db/06_seeds_miembro_b.sql`: publicaciones en al menos 3 estados distintos (`publicada`, `pendiente`, `rechazada`), 2 solicitudes sobre la publicada, y 1 publicación sin solicitudes para el estado vacío.

---

## Phase 2: Foundational (bloqueante)

**Purpose**: objetos de base y piezas transversales de sesión. **Ninguna historia puede empezar antes de completar esta fase.**

**Esta fase no modifica ningún objeto existente.** Solo agrega tres: una vista, una función y una política. `publicaciones_publicas` no se toca y el catálogo público no corre riesgo (ver la nota "Lo que esta feature deliberadamente NO hace" en `contracts/db-changes.md`).

- [X] T004 🔒 Agregar a `db/05_auth_miembros.sql` la vista `mis_publicaciones` (paso 1 de `contracts/db-changes.md`): `WITH (security_invoker = true)`, filtro `WHERE p.autor_id = auth.uid()`, columna calculada `cantidad_consultas`, sin `observaciones_internas` ni `autor_id` ni `matches` ni `texto_whatsapp`. `GRANT SELECT` solo a `authenticated`. **Comentar en el SQL que el `WHERE` no es redundante con el RLS**: las políticas se combinan con OR y `publicaciones_select_publica` alcanza a `authenticated`, así que sin ese filtro el miembro vería todas las publicadas de otros con sus teléfonos.
- [X] T005 🔒 Agregar a `db/05_auth_miembros.sql` la función `public.es_autor_de(uuid)` como `SECURITY DEFINER STABLE` con `SET search_path = public` (paso 2). Comentar por qué es `SECURITY DEFINER` aunque hoy una subconsulta directa funcionaría: sobrevive al cierre futuro de R-01, donde una subconsulta devolvería cero filas **sin ningún error**. Ver R-05.
- [X] T006 🔒 Agregar a `db/05_auth_miembros.sql` la política `consultas_select_autor` sobre `public.consultas` usando `public.es_autor_de(publicacion_id)` (paso 3). No agregar políticas de `UPDATE` ni `DELETE`.
- [X] T007 🔒 **Aplicar los scripts** `db/05_auth_miembros.sql` y `db/06_seeds_miembro_b.sql` contra Supabase, en ese orden.
- [X] T008 Correr las **7 verificaciones** de `contracts/db-changes.md` → "Verificación posterior", con tokens de las dos cuentas de miembro. Registrar cada resultado en `quickstart.md`. **El punto 2 es el más fácil de aprobar mal**: si la vista quedó sin el filtro por autor, a simple vista "funciona" pero incluye publicaciones ajenas. Contar filas y verificar autoría, no mirar la pantalla. Registrar además el estado conocido de las dos vías abiertas a propósito (FR-026b), para que nadie las lea como verificadas.
- [X] T009 [P] Actualizar `src/types/database.ts` agregando la vista `mis_publicaciones` a `Views`, con comentario que aclare que es la vista del área de miembro y que el archivo **se mantiene a mano** (ver R-10 de la feature 001).
- [X] T010 Crear `src/auth/AuthProvider.tsx`: contexto que expone `session`, `perfil` y `cargando`. Autentica con email y contraseña, se suscribe a los cambios de estado de autenticación (cubre expiración y sesiones en otra pestaña), y carga el perfil con la consulta Q1 de `contracts/supabase-queries.md`. Si el perfil no existe, exponerlo como estado distinguible para que la interfaz muestre un mensaje claro (R-07).
- [X] T011 Crear `src/auth/RutaProtegida.tsx`: mientras `cargando` es verdadero muestra un esqueleto; sin sesión redirige a `/ingresar` conservando el destino original. **No** redirigir durante la carga — es el origen del destello descripto en R-03.
- [X] T012 Registrar `AuthProvider` en `src/main.tsx`, envolviendo `RouterProvider` por dentro de `QueryClientProvider`.

**Checkpoint**: objetos de base creados y verificados, sesión disponible en toda la aplicación. Las historias pueden empezar.

---

## Phase 3: User Story 1 — Entrar a mi área de miembro (Priority: P1) 🎯 MVP

**Story goal**: un miembro inicia sesión, ve el listado de todas sus publicaciones con su estado, y puede cerrar sesión. Cumple FR-001 a FR-008, FR-011, FR-012, FR-014.

**Independent test**: iniciar sesión, verificar que el listado muestra solo las publicaciones propias en todos los estados con etiquetas legibles, y que cerrar sesión bloquea el acceso al área.

- [X] T013 [P] [US1] Agregar a `src/lib/i18n.ts` el mapa `ESTADO_PUBLICACION_LABEL` con las 5 etiquetas legibles del contrato `contracts/ui-routes.md` (Pendiente de revisión, Faltan datos, Aprobada por publicarse, Publicada, Rechazada) y un mapa de colores por estado, siguiendo el patrón de `URGENCIA_COLOR`.
- [X] T014 [P] [US1] Crear `src/components/EstadoPublicacionBadge.tsx` que reciba el estado y renderice el `<Badge>` con la etiqueta y el color de T013. **Nunca mostrar el identificador técnico** (FR-011).
- [X] T015 [P] [US1] Crear `src/lib/schemaLogin.ts` con el esquema zod del formulario de acceso: email válido y contraseña no vacía, con mensajes en español rioplatense siguiendo el estilo de `src/lib/schemaConsulta.ts`.
- [X] T016 [US1] Crear `src/pages/IngresarPage.tsx` con react-hook-form + zod según `contracts/ui-routes.md` → `/ingresar`. Estados: inicial, enviando (botón deshabilitado), credenciales inválidas (**mensaje genérico que no distinga email inexistente de contraseña incorrecta**, FR-005), error de red (mensaje distinto, con reintento), éxito (redirige al destino guardado o a `/mi-area`), y sesión ya activa (redirige sin mostrar el formulario). **No incluir** enlaces de registro ni de recuperación de contraseña.
- [X] T017 [P] [US1] Crear `src/hooks/useMisPublicaciones.ts` con `useQuery` sobre la vista `mis_publicaciones`, según la consulta Q2 de `contracts/supabase-queries.md`, ordenado por `created_at` descendente. **Sin filtro por autor en el cliente**: lo aplica la vista. Declarar el tipo de fila local y castear, por la limitación de inferencia documentada en la feature 001.
- [X] T018 [US1] Crear `src/pages/MiAreaPage.tsx`: encabezado con la empresa de la sesión, acción de crear publicación, y listado con `EstadoPublicacionBadge`, cantidad de interesados, fecha, y acción de editar **solo si el estado lo permite** (cuadro de estados de `data-model.md`). Estados de pantalla: cargando (esqueletos), sin publicaciones (estado vacío que invita a crear la primera), error (con reintento).
- [X] T019 [US1] Modificar `src/components/Navbar.tsx`: sin sesión, enlace a `/ingresar`; con sesión, empresa del perfil, enlace a `/mi-area` y acción de cerrar sesión. Cerrar sesión redirige a `/` y limpia la caché de las consultas del área para que no queden visibles al volver atrás.
- [X] T020 [US1] Modificar `src/routes.tsx`: agregar `/ingresar` como ruta pública y `/mi-area` envuelta en `RutaProtegida`. Las rutas del catálogo público quedan **sin cambios** (FR-024).
- [ ] T021 [US1] **Validación manual US1**: correr AC-1.1 a AC-1.8 de `quickstart.md` y registrar resultados. Prestar atención a **AC-1.7** (recargar `/mi-area` con sesión activa no debe parpadear ni pasar por la pantalla de acceso): es el error más común al implementar rutas protegidas con sesión asincrónica. Cronometrar el recorrido desde el catálogo hasta el listado propio (SC-001, objetivo: menos de 30 s) y pedirle a alguien ajeno al proyecto que interprete un listado con publicaciones en 3 estados distintos (SC-009).

**Checkpoint US1 = MVP entregable**: un socio entra y ve en qué estado quedó lo que mandó. Ya resuelve una pregunta que hoy se responde por teléfono.

---

## Phase 4: User Story 2 — Ver quién se interesó en mis publicaciones (Priority: P2)

**Story goal**: el miembro abre una publicación propia y ve las solicitudes de contacto recibidas. Cumple FR-009, FR-010, FR-013.

**Independent test**: con la cuenta A ver todas las solicitudes de sus publicaciones; con la cuenta B verificar que no ve ninguna de A.

- [X] T022 [P] [US2] Crear `src/hooks/useMiPublicacion.ts` con `useQuery` sobre `mis_publicaciones` filtrando por `id`, usando `maybeSingle()` (consulta Q3 de `contracts/supabase-queries.md`). Resultado nulo cubre por igual "no existe" y "es de otro miembro" — indistinguibles a propósito.
- [X] T023 [P] [US2] Crear `src/hooks/useInteresados.ts` con `useQuery` sobre `consultas` filtrando por `publicacion_id` (consulta Q4), ordenado por fecha descendente. **No seleccionar `estado_seguimiento`**: es seguimiento interno de CAPEMISA.
- [X] T024 [P] [US2] Crear `src/components/ListaInteresados.tsx` que renderice cada solicitud con empresa, persona, teléfono, email, motivo, urgencia y fecha (FR-013). Los tres campos opcionales pueden faltar: mostrar una indicación explícita de que el interesado no los dejó, **no un hueco vacío**. Incluir el estado vacío cuando no hay solicitudes (FR-014).
- [X] T025 [US2] Crear `src/pages/MiPublicacionPage.tsx`: ficha de la publicación propia con su estado, y debajo `ListaInteresados`. Si `useMiPublicacion` devuelve nulo, mostrar no encontrada **sin revelar si la publicación existe**. Si el estado no permite editar, no ofrecer la acción y explicar por qué (FR-020).
- [X] T026 [US2] Agregar la ruta `/mi-area/publicacion/:id` a `src/routes.tsx`, envuelta en `RutaProtegida`, y enlazar desde el listado de `MiAreaPage`.
- [X] T027 [US2] **Validación manual US2**: correr AC-2.1 a AC-2.5 de `quickstart.md`. **AC-2.4 es el control central de la feature** (la cuenta B no ve nada de la A) y requiere las dos cuentas de T003. Registrar resultados.

---

## Phase 5: User Story 3 — Publicar una oferta o búsqueda desde la web (Priority: P3)

**Story goal**: el miembro crea una publicación que queda enviada para revisión, no publicada. Cumple FR-015 a FR-018, FR-021, FR-022, FR-023a.

**Independent test**: crear una publicación, verificar que aparece en el área como pendiente y que **no** aparece en el catálogo público.

- [X] T028 [P] [US3] Crear `src/lib/schemaPublicacion.ts` con el esquema zod del formulario: `tipo_publicacion` (obligatorio, uno de los 5 valores de `TIPOS_PUBLICACION`), `descripcion` (obligatoria), y opcionales `zona`, `condicion_comercial`, `disponibilidad`, `vencimiento`, `imagen_url`. Mensajes en español rioplatense.
- [X] T029 [P] [US3] Crear `src/hooks/useCrearPublicacion.ts` con `useMutation` según la operación M1 de `contracts/supabase-queries.md`. Toma `empresa`, `responsable`, `telefono` y `email` del perfil en contexto (FR-018) y **omite `estado`** para que la base imponga `'pendiente'` (FR-016). **No pedir que la escritura devuelva la fila insertada**: tras T005 eso requeriría privilegio de lectura sobre la tabla base (R-06).
- [X] T030 [US3] Crear `src/pages/PublicacionFormPage.tsx` en modo creación, según `contracts/ui-routes.md`. Muestra los datos de contacto del perfil como información fija, no editable. **No ofrece** los campos de generación asistida (rubro, subrubro, descripción comercial, texto de WhatsApp, urgencia): contradice el Principio II. Botón deshabilitado mientras envía, para evitar publicaciones duplicadas.
- [X] T031 [US3] Implementar la confirmación de éxito: el mensaje dice **enviada para revisión** y aclara que el equipo de CAPEMISA la revisa antes de publicarla, sin prometer plazo (FR-017, FR-023a). **La palabra "publicada" no debe aparecer.** Redirige al listado.
- [X] T032 [US3] Agregar la ruta `/mi-area/nueva` a `src/routes.tsx` envuelta en `RutaProtegida`, y enlazarla desde `MiAreaPage`.
- [X] T033 [US3] **Validación manual US3**: correr AC-3.1 a AC-3.6 de `quickstart.md`. **AC-3.2** (la publicación creada no aparece en el catálogo público) es la verificación del human gate. **AC-3.6** verifica que un doble envío rápido no cree dos publicaciones. Cronometrar la carga completa de una publicación sin ayuda externa (SC-007, objetivo: menos de 3 min).

---

## Phase 6: User Story 4 — Corregir una publicación antes de que se publique (Priority: P4)

**Story goal**: el miembro edita una publicación propia mientras esté en `pendiente` o `faltan_datos`. Cumple FR-019, FR-020.

**Independent test**: editar una publicación pendiente y verificar que los cambios persisten; verificar que una publicada no ofrece editar.

- [X] T034 [P] [US4] Crear `src/hooks/useEditarPublicacion.ts` con `useMutation` según la operación M2 de `contracts/supabase-queries.md`. **No incluir `estado` ni `autor_id`** entre los campos editables.
- [X] T035 [US4] Manejar en `useEditarPublicacion.ts` el caso de **cero filas afectadas**: con RLS, una actualización no permitida por estado **no devuelve error**, simplemente no modifica nada. Detectarlo y tratarlo como fallo explicable, no como éxito. Es la trampa principal de esta historia.
- [X] T036 [US4] Extender `src/pages/PublicacionFormPage.tsx` al modo edición: carga los valores iniciales con `useMiPublicacion`, guarda con `useEditarPublicacion`, y muestra un mensaje explicativo si se llega por dirección directa a una publicación cuyo estado no permite editar.
- [X] T037 [US4] Agregar la ruta `/mi-area/publicacion/:id/editar` a `src/routes.tsx` envuelta en `RutaProtegida`, y mostrar la acción de editar en el listado y en el detalle **solo cuando el estado lo permite**.
- [X] T038 [US4] **Validación manual US4**: correr AC-4.1 a AC-4.3 de `quickstart.md`. **AC-4.3 es la verificación crítica**: forzar el guardado de una publicación publicada no debe mostrar confirmación de éxito.

---

## Phase 7: Polish y transversales

- [X] T039 [P] Implementar el manejo de **sesión expirada durante un formulario** (R-08) en `PublicacionFormPage.tsx`: conservar lo cargado, informar que la sesión expiró y ofrecer reautenticarse. **No** descartar los datos ni redirigir de golpe.
- [X] T040 [P] Verificar **responsive** en 375, 768 y 1440 px para las 4 pantallas nuevas, con cero scroll horizontal, igual que la feature 001.
- [X] T041 [P] Correr los **escenarios edge** de `quickstart.md`: dos pestañas con cierre de sesión en una, cuenta de administración entrando al área, publicación rechazada visible en el listado, solicitud sin email/motivo/urgencia.
- [X] T042 Correr las **3 verificaciones de compliance** de `quickstart.md`. La del Principio IV son las 7 verificaciones de base de T008 más la confirmación de que el `service_role` no aparece en el bundle publicado. Documentar resultados.
- [X] T043 Verificar que el **flujo de automatización de n8n sigue funcionando** después de los cambios de base. Consulta con `service_role`, así que no debería verse afectado — **confirmarlo, no asumirlo**: asumir es lo que originó el problema de la feature 001.
- [X] T044 Deploy vía push a `main` y verificación en producción de que el catálogo público y el área de miembro funcionan. Recordar que `main` es producción (constitución).
- [X] T045 Actualizar `CLAUDE.md` con lo que cambió: rutas nuevas, `AuthProvider`, la vista `mis_publicaciones`, y **el nuevo modelo de lectura** (ninguna lectura directa a la tabla base). La sección sobre las dos vistas queda desactualizada al aplicar T006.
- [X] T046 Cerrar la feature: marcar el checklist de `checklists/requirements.md` y anotar el registro de validación completo en `quickstart.md`.

---

## Dependencies

```text
Phase 1 (Setup) — T001, T002, T003 en paralelo
        │
Phase 2 (Foundational) ─── BLOQUEANTE PARA TODO
   T004, T005, T006 (SQL) ──> T007 (aplicar) ──> T008 (7 verificaciones)
   T009 (tipos) ───────────> hooks de todas las historias
   T010, T011, T012 ───────> toda ruta protegida
        │
        ├──> Phase 3 (US1, P1) 🎯 MVP
        │       ├──> Phase 4 (US2) — necesita MiAreaPage para enlazar
        │       └──> Phase 5 (US3) — independiente de US2
        │              └──> Phase 6 (US4) — reusa PublicacionFormPage de US3
        │
        └──> Phase 7 (Polish)
```

**Dependencias duras**:

- **T008 antes de cualquier historia.** Si las verificaciones de acceso no pasan, el frontend construido encima hereda el problema. En particular el punto 2: una vista sin el filtro por autor parece funcionar.
- **T009 antes de los hooks** de cualquier historia: sin el tipo de la vista, no compilan.
- **US4 después de US3**: reusa `PublicacionFormPage.tsx`.
- **US2 después de US1**: necesita el listado para enlazar al detalle.
- **US3 es independiente de US2**: se pueden hacer en cualquier orden después de US1.

**Ya no hay dependencia frágil en la fase 2.** La versión anterior de este plan acoplaba un revoke de privilegios con la reescritura de la vista pública, con riesgo de dejar el catálogo caído. Eso se quitó al decidir postergar R-01; la fase 2 ahora solo agrega objetos nuevos.

## Parallel Opportunities

**Phase 1**: T001, T002 y T003 en paralelo (archivos distintos, sin dependencias).

**Phase 2**: T004, T005 y T006 escriben el mismo archivo, así que van en orden. T009 en paralelo con las tres. T010 después de T009; T011 y T012 después de T010.

**Phase 3 (US1)**: T013, T014, T015 y T017 en paralelo. T016 y T018 dependen de ellas.

**Phase 4 (US2)**: T022, T023 y T024 en paralelo.

**Phase 5 (US3)**: T028 y T029 en paralelo.

**Phase 7**: T039, T040 y T041 en paralelo.

## Implementation Strategy

**MVP = Phase 1 + Phase 2 + Phase 3 (US1).** 21 tareas. Entrega un socio que entra y ve el estado de sus publicaciones — el mínimo con valor real.

**Incremento 2 = US2.** La función de mayor valor percibido: ver los interesados que hoy son invisibles para su destinatario.

**Incremento 3 = US3 + US4.** Canal de carga desde la web. Van juntos porque US4 reusa el formulario de US3, y un formulario sin corrección deja al miembro sin salida si se equivoca.

**Advertencia sobre el orden**: la tentación es empezar por el frontend porque se ve. Los hooks de todas las historias leen de `mis_publicaciones`, así que sin la vista aplicada (T007) y verificada (T008) no hay contra qué desarrollar. Y si la vista quedó mal escrita, el frontend construido encima muestra datos ajenos sin que nada falle.
