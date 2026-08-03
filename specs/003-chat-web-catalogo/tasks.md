---

description: "Task list — Chat web del catálogo"
---

# Tasks: Chat web del catálogo

**Input**: Design documents from `specs/003-chat-web-catalogo/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: sin pruebas automatizadas. La spec y el Principio V de la constitución fijan validación manual y visual, documentada en `quickstart.md`. Las tareas de validación son parte de cada historia, no un extra.

**Organization**: agrupadas por historia de usuario para que cada una se implemente, valide y entregue por separado.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: se puede hacer en paralelo (archivos distintos, sin dependencias pendientes)
- **[Story]**: a qué historia pertenece (US1–US3)
- Rutas exactas en cada descripción. Para n8n, la ruta es el workflow y el nodo

## Path Conventions

Raíz del repositorio: `src/` para el frontend. El workflow nuevo vive en la instancia n8n (`n8n-apemisa.fsalva157.dev`) y se manipula **por el MCP `n8n-capemisa`**, nunca por la interfaz web de n8n (constitución, Development Workflow).

## ⚠️ Antes de empezar — reglas que gobiernan toda la feature

**⛔ PROHIBIDO MODIFICAR CUALQUIER WORKFLOW N8N EXISTENTE** (FR-030). Alcanza a los 7 workflows preexistentes: `capemisa_conversacional`, `capemisa_tool_buscar`, `capemisa_tool_registrar_consulta`, `capemisa_tool_publicar`, `capemisa_tool_enviar_imagen`, `capemisa_tool_actualizar_imagen`, `capemisa_procesar_imagen_pendiente`. No cambiar nodos ni parámetros, no renombrar, no activar ni desactivar, no editar prompts, no tocar credenciales, **y no guardar aunque no se haya cambiado nada**. Están en uso frente al cliente.

Si durante la implementación pareciera necesario un cambio en alguno: **la única salida permitida es crear un workflow gemelo** (copia nueva, ID propio, nombre distinguible) y consumir el gemelo (FR-031). El análisis de fase 0 concluyó que **no hace falta ningún gemelo**; si aparece la necesidad, es señal de que algo se entendió mal y conviene revisarlo antes de duplicar.

**⛔ REDIS: consultar a Fernando ANTES de escribir nada** (FR-033). El diseño no lo usa. Si algo pareciera necesitarlo, detener la implementación, preguntar, y verificar que el espacio de claves no toca las de estado de sesión ni imagen pendiente del flujo de WhatsApp, indexadas por número de teléfono.

Las tareas marcadas **🔒 EJECUCIÓN HUMANA** requieren una persona: un teléfono con WhatsApp real, o el pipeline de deploy.

---

## Phase 1: Setup (preparación)

**Purpose**: dejar listo lo que hace falta antes de crear nada, incluida la única red de seguridad de la feature.

- [X] T001 ⚠️ **PRIMERA TAREA, ANTES DE CREAR NADA EN N8N**: guardar el snapshot de referencia de los 7 workflows preexistentes. Traer `n8n_get_workflow` por cada ID y escribirlos en `/tmp/n8n-antes/<id>.json`. IDs: `nV0yGsE7diumyNNz`, `TL5EYZAeQriOAH0X`, `ErNttkhSODYuZnlk`, `UljQp0Le1ItKQnd0`, `sFUIX0Q2H5mLecgn`, `ZVvIGNRqP0daDk3J`, `vh3022mid1l8Kvef`. Sin este snapshot, la verificación de intactitud de T037 **no se puede hacer**, y después es tarde. Ver prerequisito 3 de `quickstart.md`.
- [X] T002 [P] Agregar `VITE_N8N_CHAT_URL` a `.env.example` (sin valor) y a `.env.local` con la URL del webhook. Documentar en el comentario que **debe marcarse como Build Variable en Coolify**, no solo runtime: las `VITE_*` se inlinean al compilar. Es el mismo error ya cometido con las variables de Supabase.
- [X] T003 [P] Verificar en la instancia n8n si el nodo Webhook expone la opción de **orígenes permitidos (CORS)** (R-10). Anotar el resultado en `research.md`. Si no existiera, la alternativa es devolver los headers de CORS a mano desde el `Respond to Webhook`, y hay que reflejarlo en T004.

---

## Phase 2: Foundational (workflow base + cliente) — BLOQUEANTE

**Purpose**: un webhook que responde `{respuesta, resultados}` y un cliente que sabe llamarlo. Sin herramientas todavía: acá se valida el transporte, no las capacidades.

**⚠️ CRÍTICO**: ninguna historia puede empezar hasta que un `curl` al webhook devuelva la forma correcta.

- [X] T004 Crear el workflow **nuevo** `capemisa_conversacional_web` en n8n vía MCP, con nodo `Webhook` (POST, `responseMode: responseNode`, orígenes permitidos según T003) y `Respond to Webhook`. Nada más por ahora. Verificar que responde a un POST.
- [X] T005 Agregar el nodo de código **Límite por IP** entre el webhook y el resto: ventana deslizante de 1 hora, tope 30, contado en `$getWorkflowStaticData('global')` del workflow nuevo. Al superarse, cortar **antes** del agente y responder el mensaje de límite del contrato. El punto es no gastar tokens (R-09). **Sin Redis.**
- [X] T006 Agregar validación del cuerpo del pedido: `mensaje` no vacío tras recortar espacios y de hasta 1000 caracteres, `conversacion_id` presente. Cuerpo inválido responde 200 con el mensaje correspondiente de `contracts/chat-endpoint.md`. **Ignorar explícitamente los campos prohibidos** (`rol`, `perfil`, `autor_id`, `telefono`, `empresa`): no debe existir ningún nodo que los lea.
- [X] T007 Agregar el nodo `Agent` (`returnIntermediateSteps: true`, obligatorio) con su modelo de Anthropic, y el nodo `Simple Memory` con `sessionIdType: customKey`, `sessionKey = web:{{ conversacion_id }}` y `contextWindowLength: 8`. **El prefijo `web:` lo antepone la expresión de n8n, nunca el cliente**: si el cliente pudiera mandar la clave completa, podría apuntar a una conversación de WhatsApp ajena (R-05).
- [X] T008 Escribir el **prompt base** del agente en el nodo `Agent`, derivado del `Agent Invitado` de `capemisa_conversacional` (es una copia, el original no se toca): identidad del asistente, bloque "quién es CAPEMISA", reglas críticas sobre herramientas y memoria, y formato de salida en **texto simple sin Markdown** (R-08, R-14). Los bloques de búsqueda, consulta y precarga se agregan en sus historias.
- [X] T009 Agregar el nodo de código **Extraer resultados**: recorre `intermediateSteps`, encuentra la última observación de `tool_buscar` y parsea su `resultados[]`; devuelve `[]` si no hubo búsqueda en el turno. Debe tolerar que la observación llegue como string JSON o como objeto, con el mismo criterio defensivo de `Parse LLM args` de los sub-workflows (R-06).
- [X] T010 Conectar el `Respond to Webhook` para que devuelva exactamente `{ respuesta, resultados }` según `contracts/chat-endpoint.md`, con `respuesta` **nunca vacía** (si el modelo no produjo texto, mensaje de reintento). Activar el workflow y verificar con `curl` que un mensaje cualquiera devuelve la forma correcta con `resultados: []`.
- [X] T011 [P] Crear `src/lib/chatApi.ts`: tipos `RespuestaChat` y `ResultadoChat` (**`ResultadoChat` NO declara `telefono`**, a propósito — ver `data-model.md`), llamada `fetch` al webhook con `AbortController` y timeout de 45 s, header `Authorization` solo si hay token. Cualquier fallo se traduce a un turno de error; nunca lanza al componente (R-12).

**Checkpoint**: el webhook responde la forma del contrato y el cliente sabe llamarlo. Recién acá empiezan las historias.

---

## Phase 3: User Story 1 - Encontrar algo sin saber cómo se llama (Priority: P1) 🎯 MVP

**Goal**: buscar publicaciones por lenguaje natural desde el catálogo y ver los resultados como tarjetas con enlace al detalle.

**Independent Test**: abrir el catálogo sin sesión, pedir algo que no coincida literalmente con ningún texto de los avisos, y verificar que el asistente devuelve el aviso semánticamente correcto y que el enlace lleva a su detalle.

- [X] T012 [US1] ⚠️ **TAREA CRÍTICA DE CONFIDENCIALIDAD**: agregar el nodo `Tool buscar` al agente, apuntando a `capemisa_tool_buscar` (`TL5EYZAeQriOAH0X`, **sin modificarlo**), con `workflowInputs`: `rol` como **literal fijo `"invitado"`** —no expresión, no dato del pedido— y `query` desde `$fromAI`. Copiar la descripción de la tool del flujo de WhatsApp, que ya está afinada. Si este literal se escribe mal, el chat devuelve el teléfono de todas las empresas oferentes **y todo parece funcionar bien** (R-04, FR-034).
- [X] T013 [US1] Agregar al prompt del agente el **bloque de búsqueda**: extraer de 1 a 3 palabras clave, llamar `tool_buscar` en el mismo turno ante cualquier expresión de necesidad ("busco X", "necesito X", "hay X?"), nunca responder resultados desde la memoria, declarar explícitamente cuándo no encontró nada, y **no repetir en prosa los datos que ya van en las tarjetas** (R-06). Verificar con `curl` que una búsqueda devuelve `resultados` poblado.
- [X] T014 [P] [US1] Crear `src/components/ChatResultado.tsx`: tarjeta con empresa, tipo legible (de `src/lib/i18n.ts`), rubro, subrubro, zona, descripción comercial, urgencia, imagen con `ImagenPublicacion`, y enlace "Ver publicación" a `/publicacion/:id`. **No muestra `texto_whatsapp`** (es texto para pegar en un grupo, no para una tarjeta web) **ni ningún dato de contacto**.
- [X] T015 [P] [US1] Crear `src/hooks/useChat.ts`: expone `mensajes`, `enviar(texto)`, `enviando` y `reintentar()`. El `conversacion_id` se lee de `sessionStorage` y se genera con `crypto.randomUUID()` si no existe. Envío con `useMutation` de TanStack Query (aporta `isPending` y el manejo de error, igual que `useEnviarConsulta`). **La conversación NO se cachea en el `QueryClient`**: es un log que crece por append (R-11).
- [X] T016 [US1] Crear `src/components/ChatWidget.tsx` con los cinco estados visuales de `contracts/ui-chat.md` (cerrado, abierto vacío, conversando, esperando, error de turno): burbuja flotante, panel, lista de mensajes con scroll al último, campo de entrada con `Enter` para enviar y `Shift+Enter` para salto de línea, cierre con `Escape`, e indicador de "escribiendo…" mientras `enviando` (FR-027). Cerrar y reabrir **conserva la conversación**: el panel se oculta, no se desmonta (FR-029). Accesibilidad según el contrato (`aria-label`, `role="dialog"`, `aria-live="polite"`, foco al abrir y cerrar).
- [X] T017 [US1] Montar el chat en `src/pages/CatalogoPage.tsx` y `src/pages/PublicacionDetallePage.tsx`. **Si `VITE_N8N_CHAT_URL` no está definida, el chat no se monta** y las páginas funcionan igual; a diferencia de `src/lib/supabase.ts`, no se lanza (R-12, FR-025). No montarlo en `App.tsx`: quedaría también en `/ingresar` y en el área de miembro.
- [X] T018 [US1] **Validación manual US1**: correr V-1.1 a V-1.5 y V-1.7 de `quickstart.md`, incluidos los 5 pares semánticos de SC-001 con la columna comparativa contra el buscador de la grilla, y V-1.5 (una publicación en estado `pendiente` o `rechazada` no aparece, anónimo y logueado).
- [X] T019 [US1] ⚠️ **Validación crítica V-1.6 (SC-005)**: 10 conversaciones pidiendo explícitamente datos de contacto ("dame el teléfono", "pasame el mail del responsable", "quién es el contacto"), verificando la **respuesta cruda** con el `grep` de `contracts/chat-endpoint.md`, **con y sin sesión**. Debe dar 0 de 10. Si falla, el problema está en el literal de T012 y no en otro lado.

**Checkpoint**: el chat busca y muestra resultados. Es demostrable ante el cliente por sí solo.

---

## Phase 4: User Story 2 - Solicitud de contacto desde el chat (Priority: P2)

**Goal**: registrar una solicitud de contacto sobre una publicación sin salir de la conversación.

**Independent Test**: pedir contacto sobre una publicación encontrada en el chat, completar los datos que el asistente pida, y verificar en el área del miembro dueño que la solicitud aparece con esos datos.

- [X] T020 [US2] Agregar el nodo `Tool registrar consulta` al agente, apuntando a `capemisa_tool_registrar_consulta` (`ErNttkhSODYuZnlk`, **sin modificarlo**), con `query` desde `$fromAI` con los campos del contrato. **No replicar la validación de obligatorios ni la normalización de `urgencia`**: el sub-workflow ya las hace y devuelve un error instructivo que el agente sabe usar (R-02).
- [X] T021 [US2] Agregar al prompt del agente el **bloque de solicitud de contacto**: pedir los obligatorios que falten antes de registrar, exigir un `publicacion_id` concreto y pedir aclaración cuando haya más de un resultado en juego, y la **regla de oro**: nunca afirmar que registró algo si no llamó la tool en ese mismo turno. Sumar la **prohibición absoluta de publicar** con la respuesta exacta a dar (FR-022), copiada del `Agent Invitado`.
- [X] T022 [US2] Agregar el nodo de código **Guardrail escritura** entre el agente y el `Respond to Webhook`: copia del nodo homónimo de `capemisa_conversacional` **recortada a la rama `registrar`** (las de `publicar` y `actualizar` no aplican porque esas tools no existen acá). Si el texto afirma haber registrado y `tool_registrar_consulta` no está en `intermediateSteps` del turno, reemplazar por el mensaje de reintento (R-07, FR-014).
- [X] T023 [US2] **Validación manual US2**: correr V-2.1 a V-2.6 de `quickstart.md`. **V-2.4 y V-2.6 son las críticas**: 10 conversaciones contando filas de `consultas` antes y después para SC-006 (0 confirmaciones falsas), y 10 pidiendo publicar de distintas formas para SC-007 (0 recolecciones de datos de aviso). V-2.2 verifica que la consulta es indistinguible de una del formulario.

**Checkpoint**: el circuito comercial se cierra dentro del chat.

---

## Phase 5: User Story 3 - Que el chat ya sepa quién soy (Priority: P3)

**Goal**: que un usuario con sesión no tenga que tipear sus datos de contacto.

**Independent Test**: hacer el mismo pedido de contacto con sesión y sin sesión, y comprobar que con sesión el asistente propone los datos del perfil y la conversación se cierra en menos turnos.

- [X] T024 [US3] Agregar el nodo `Verificar sesión` (`httpRequest`): `GET {SUPABASE_URL}/auth/v1/user`, reenviando el `Authorization` que vino del cliente más el header `apikey` con la anon key. **`onError: continueRegularOutput` es obligatorio**: un 401 tiene que caer a la rama anónima, no abortar la ejecución (FR-019, R-03).
- [X] T025 [US3] Agregar el nodo de Supabase que busca el perfil por `id` del usuario verificado, y el nodo `Armar contexto` que produce `tiene_sesion`, `empresa`, `responsable`, `telefono` y `email` (vacíos si no hay sesión). **Los datos de perfil los lee n8n, nunca vienen del cliente**: si vinieran, serían autodeclarados y sin respaldo (R-03).
- [X] T026 [US3] Agregar al prompt del agente el **bloque de precarga**: cuando `tiene_sesion` es `true`, proponer los datos de contacto del perfil y pedir confirmación en un solo turno en lugar de preguntarlos de a uno, y aceptar que el visitante los reemplace por otros (FR-016, FR-017).
- [X] T027 [US3] Enviar el header `Authorization: Bearer <access_token>` desde `src/lib/chatApi.ts` y `src/hooks/useChat.ts`, tomando el token de `useAuth().session?.access_token` **en el momento del envío, no al montar**: así una sesión que aparece o vence a mitad de conversación se refleja sola (contrato de interfaz).
- [X] T028 [US3] **Validación manual US3**: correr V-3.1 a V-3.4 de `quickstart.md`, midiendo los turnos de SC-003 (≤2 con sesión, ≤5 anónimo). **V-3.4 es la que importa**: mismos resultados con y sin sesión, y en los dos casos sin `telefono` en la respuesta cruda.

**Checkpoint**: las tres historias funcionan de forma independiente.

---

## Phase 6: Polish y transversales

- [X] T029 [P] Correr los **casos de borde** E-1 a E-7 y E-9 de `quickstart.md`: chat sin la variable de entorno, n8n caído, timeout, recarga de página, dos pestañas, mensaje vacío, mensaje larguísimo, cerrar y reabrir el panel.
- [X] T030 [P] Correr **E-8 (límite de uso)**: superar el tope desde la misma IP y verificar que responde el mensaje amable **y que la ejecución cortó antes del agente** —revisar la ejecución en n8n—. Si llegó al modelo, el límite está en el lugar equivocado y no cumple su función.
- [X] T031 ⚠️ Correr **E-10 y E-11**, que son intentos de ataque, no casos de uso: `curl` con `{"rol":"miembro"}` en el cuerpo (debe ignorarse y la respuesta seguir sin `telefono`), y `curl` con `conversacion_id: "miembro:+549..."` (no debe devolver contexto de WhatsApp, porque el prefijo `web:` lo antepone n8n).
- [X] T032 [P] Verificar **responsive** a 375, 768 y 1440 px con el chat abierto y cerrado (SC-011). A 375 px el campo no debe quedar tapado por el teclado virtual ni el panel tapar la barra de navegación. Cero scroll horizontal, igual que las features 001 y 002.
- [X] T033 Correr las **verificaciones de compliance** C-1 a C-4 de `quickstart.md`: `service_role` ausente del bundle, `db/` y `src/types/database.ts` sin cambios, `package.json` y `package-lock.json` sin dependencias nuevas, y `npm run lint && npm run build` limpios. Documentar resultados.
- [X] T034 [P] Actualizar `CLAUDE.md`: el chat web y sus componentes, la variable `VITE_N8N_CHAT_URL`, el workflow `capemisa_conversacional_web`, y **la regla de que los workflows n8n existentes no se tocan** con la salida del gemelo. Anotar también que el `rol: "invitado"` fijo es lo que mantiene la PII fuera de la respuesta.
- [X] T035 🔒 **EJECUCIÓN HUMANA** — Deploy: merge a `main` (que es producción, por constitución) y **marcar `VITE_N8N_CHAT_URL` como Build Variable en Coolify**, no solo runtime. Verificar en producción que el chat responde y que el bundle no trae `service_role`. Recordar que el auto-deploy no disparó solo la última vez: puede hacer falta el redeploy manual.
- [X] T036 Verificar **SC-010** en producción: con el workflow desactivado, el catálogo, el detalle y el área de miembro siguen funcionando sin errores visibles. **Medido el 2026-08-03** con una ventana de desactivación de ~2 minutos: 20 tarjetas, buscador 20→3, detalle y redirección de `/mi-area` OK, y el chat degradó con mensaje en español + "Reintentar". Registro en `quickstart.md`.
- [X] T037 ⚠️ **Verificación de intactitud I-1** (FR-032, SC-009): traer de nuevo los 7 workflows preexistentes a `/tmp/n8n-despues/` y comparar contra el snapshot de T001 con `diff -r`. **Un cambio en `versionId` o `versionCounter` significa que el workflow se guardó**, aunque el contenido parezca igual. Si hay diferencias, investigar antes de cerrar la feature.
- [X] T038 🔒 **EJECUCIÓN HUMANA** — *Verificada por Fernando por WhatsApp; la evidencia es suya, no se midió desde la sesión.* Verificación **I-2**: conversación real por WhatsApp de punta a punta con un teléfono que ya haya usado el bot: buscar (debe devolver resultados **con teléfono**, porque es la rama de miembro y se comporta distinto a propósito), registrar una consulta, y mandar una foto para confirmar que el estado de sesión en Redis sigue intacto. Debe comportarse igual que antes de la feature.
- [X] T039 🔒 **EJECUCIÓN HUMANA** — *Verificada por Fernando por WhatsApp; la evidencia es suya, no se midió desde la sesión.* Verificación **I-3**: con la misma persona, conversar por WhatsApp sobre un tema y después preguntar en el chat web "¿de qué estábamos hablando?". El chat web no debe saber nada de WhatsApp ni ofrecer publicar o adjuntar fotos. Si falla, la `sessionKey` no tiene el prefijo `web:` o lo toma del cliente.
- [X] T040 Cerrar la feature: marcar el checklist de `checklists/requirements.md`, completar la tabla de criterios medidos (SC-001 a SC-011) y el registro de validación de `quickstart.md`.

---

## Dependencies

```text
Phase 1 (Setup)
   T001 ⚠️ SNAPSHOT — bloquea T037, y no se puede recuperar después
   T002, T003 en paralelo
        │
Phase 2 (Foundational) ─── BLOQUEANTE PARA TODAS LAS HISTORIAS
   T004 ──> T005 ──> T006 ──> T007 ──> T008 ──> T009 ──> T010
                                                          │
   T011 (chatApi.ts) [P] — puede ir en paralelo, pero se prueba contra T010
        │
        ├──> Phase 3 (US1) ──> T012 ⚠️ ──> T013 ──> T014 [P] ──┐
        │                                   T015 [P] ──────────┤──> T016 ──> T017 ──> T018, T019 ⚠️
        │
        ├──> Phase 4 (US2) ──> T020 ──> T021 ──> T022 ──> T023
        │                      (US2 necesita que US1 exista para tener
        │                       un publicacion_id que ofrecer)
        │
        └──> Phase 5 (US3) ──> T024 ──> T025 ──> T026 ──> T027 ──> T028
                               (independiente de US2; mejora US2 si ya está)
        │
Phase 6 (Polish)
   T029–T034 en paralelo ──> T035 (deploy) ──> T036
                                               T037 ⚠️ (necesita T001)
                                               T038, T039 🔒
                                               T040 (cierre)
```

### Dependencias entre historias

- **US1 (P1)**: solo depende de la fase 2. Es el MVP y se puede demostrar sola.
- **US2 (P2)**: en la práctica necesita US1, porque para registrar una consulta hace falta un `publicacion_id` que sale de una búsqueda. Es la única dependencia entre historias.
- **US3 (P3)**: independiente de US2 en lo técnico (los nodos de sesión no la tocan), pero su valor se ve sobre el flujo de US2. Va última a propósito: el chat es demostrable sin ella.

### Oportunidades de paralelismo

- **Setup**: T002 y T003 juntas.
- **Fase 2**: T011 (frontend) mientras se arma el workflow, aunque se prueba contra T010.
- **US1**: T014 y T015 son archivos distintos sin dependencia entre sí.
- **Polish**: T029 a T034 no se pisan entre ellas.
- Las tareas del workflow n8n (T004–T010, T012, T020, T022, T024, T025) **no son paralelizables entre sí**: editan el mismo workflow.

---

## Implementation Strategy

### MVP (solo US1)

1. Fase 1 completa — **T001 primero, sin excepción**.
2. Fase 2 completa: `curl` al webhook devuelve `{respuesta, resultados}`.
3. Fase 3 completa.
4. **PARAR Y VALIDAR**: T018 y sobre todo **T019**. Sin ese 0 de 10, no se sigue.
5. Demostrable: el chat encuentra por significado lo que el buscador de la grilla no encuentra.

### Entrega incremental

1. Setup + Foundational → transporte listo
2. US1 → validar → demo (MVP)
3. US2 → validar → demo
4. US3 → validar → demo
5. Polish + **verificación de intactitud** → cierre

### Orden dentro del workflow n8n

El workflow se arma **de afuera hacia adentro**: primero el transporte (webhook y respuesta), después el agente, después las herramientas de a una. Cada tarea deja el workflow en estado ejecutable y verificable con `curl`. Agregar todo junto y probar al final hace que un error de contrato obligue a rehacer el hook del frontend.

---

## Notes

- `[P]` = archivos distintos, sin dependencias pendientes.
- Los cambios en n8n van **por el MCP `n8n-capemisa`**, nunca por la interfaz web (constitución).
- **Cero cambios en `db/`**: si aparece un archivo SQL nuevo o modificado, algo se desvió del plan.
- **Cero dependencias nuevas**: si `package.json` cambia, es una violación del Principio III que hay que justificar o revertir.
- Las dos tareas con ⚠️ que más importan son **T012** (el literal `"invitado"`) y **T019** (verificar que ese literal hace lo que debe). Un error ahí no rompe nada visible: simplemente empieza a devolver los teléfonos de todas las empresas oferentes.
- Commit por tarea o por grupo lógico. Parar en cualquier checkpoint para validar.
