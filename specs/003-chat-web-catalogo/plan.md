# Implementation Plan: Chat web del catálogo

**Branch**: `003-chat-web-catalogo` | **Date**: 2026-08-01 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/003-chat-web-catalogo/spec.md`

## Summary

Agregar al catálogo público un chat conversacional que busca publicaciones por significado
—no por coincidencia literal de texto— y permite dejar una solicitud de contacto sin salir
de la conversación. Las capacidades son las de la rama de **invitado** del bot de WhatsApp:
buscar y registrar consultas. Publicar y editar quedan fuera, porque la web ya los ofrece
en el área de miembro desde la feature 002.

La investigación (fase 0) llegó a dos conclusiones que definen la forma del trabajo:

1. **`capemisa_conversacional` es inalcanzable desde la web** por cinco razones
   estructurales independientes (trigger de WhatsApp, salida a WhatsApp sin retorno,
   identidad por teléfono, memoria por teléfono, formato de salida de WhatsApp). Se crea un
   workflow nuevo. Ver R-01.
2. **Los dos sub-workflows que importan se reutilizan intactos.** `capemisa_tool_buscar` y
   `capemisa_tool_registrar_consulta` cubren lo que la feature necesita tal como están:
   ambos exponen `executeWorkflowTrigger`, ambos aceptan `callerPolicy:
   workflowsFromSameOwner`, y `tool_buscar` ya recibe `rol` como parámetro previsto.
   **No hace falta ningún workflow gemelo**: la cláusula FR-031 queda disponible pero sin
   uso. Ver R-02.

El resultado es una feature de superficie chica: **un workflow n8n nuevo de ~10 nodos, un
hook, dos componentes, cero cambios en la base de datos y cero dependencias nuevas.**

La restricción central (FR-030: prohibido alterar workflows existentes) no obliga a
concesiones de diseño. Todo lo que la feature necesita se obtiene invocando lo existente
en las condiciones en que ya funciona. La única precaución activa es que el trabajo se
hace **exclusivamente creando artefactos nuevos**, y que la intactitud de lo anterior se
verifica al final comparando definiciones, no confiando en la intención.

## Technical Context

**Language/Version**: TypeScript 6, React 19. El workflow n8n se define en JSON vía MCP.

**Primary Dependencies**: las ya instaladas — `@tanstack/react-query` (para el envío),
`@supabase/supabase-js` (solo para leer el token de la sesión ya existente), shadcn/ui
sobre Tailwind. **Cero dependencias nuevas**, incluida la ausencia deliberada de una
librería de Markdown (R-08).

**Storage**: ninguno propio. La conversación vive en memoria del componente y en
`sessionStorage` (solo el identificador). La memoria del agente vive en el nodo
`Simple Memory` de n8n. **No se usa Redis** (R-05). **No hay cambios en `db/*.sql`**: la
feature no crea ni modifica tablas, vistas ni políticas.

**Testing**: manual y visual, documentado en `quickstart.md` (Principio V), con la
exigencia de medir en vez de mirar: contar filas en `consultas`, buscar cadenas concretas
en las respuestas, y **comparar la definición de cada workflow preexistente antes y
después** (R-13, SC-009).

**Target Platform**: navegadores evergreen, desktop y mobile desde 375 px. El workflow
corre en la instancia n8n propia (`n8n-apemisa.fsalva157.dev`).

**Project Type**: aplicación de página única. Sin backend propio: n8n cumple ese rol, tal
como la constitución anticipa ("n8n como cerebro compartido — WhatsApp bot + chat web").

**Performance Goals**: respuesta del asistente en menos de 15 s en el 90% de los turnos
(SC-004), con timeout de contención en 45 s del lado del cliente (R-12). Un turno con
búsqueda encadena tres llamadas a modelos, así que el objetivo es de expectativa, no de
garantía.

**Constraints**: `service_role` nunca en el cliente. `rol: "invitado"` fijo del lado de
n8n, jamás del body (R-04). Interfaz y respuestas en español rioplatense. Ningún workflow
preexistente se modifica. Redis prohibido sin consulta previa.

**Scale/Scope**: 1 workflow n8n nuevo (~10 nodos), 2 sub-workflows reutilizados sin tocar,
1 hook, 2 componentes nuevos, 2 páginas modificadas, 1 variable de entorno nueva, 0
objetos de base, 0 dependencias nuevas.

## Constitution Check

*GATE: debe pasar antes de la fase 0 y volver a evaluarse tras el diseño.*

| Principio | Evaluación | Estado |
|---|---|---|
| **I — Spec-Driven Development** | Se siguió `specify → plan`. La spec cerró sin marcadores de clarificación: las tres decisiones de alcance (limitarse a la rama de invitado, precargar datos del logueado, topear el uso anónimo) se resolvieron con el responsable antes de redactar. | ✅ |
| **II — Human Gate sobre salidas de IA** | El chat **no genera contenido publicable**: solo lee publicaciones ya aprobadas (`estado='publicada'`, garantizado por el filtro dentro de `tool_buscar`) y escribe en `consultas`, que no es contenido curado. FR-022 le prohíbe explícitamente crear o editar publicaciones. El human gate no se puentea por ningún camino nuevo. | ✅ |
| **III — Stack congelado** | Cero dependencias nuevas. La constitución nombra el chat web como uso previsto de n8n. Sin backend propio, sin librería de Markdown, sin librería de chat. | ✅ |
| **IV — RLS y secretos** | `service_role` sigue únicamente en n8n. El cliente solo manda su propio `access_token`, que ya tiene. Con `rol: "invitado"` constante, la respuesta **nunca** contiene teléfono, email ni responsable: el chat devuelve **estrictamente menos** que lo que la anon key ya expone. La feature **no amplía** la superficie de datos. | ✅ |
| **V — YAGNI** | Sin publicar desde el chat, sin adjuntar imágenes, sin historial persistente, sin panel de conversaciones, sin métricas, sin streaming, sin Markdown renderizado. Cada una fue la opción mínima. | ✅ |

**Sin violaciones. Sin entradas en Complexity Tracking.**

Una observación sobre el Principio IV que conviene dejar escrita: esta feature **no mueve
nada** del riesgo aceptado que arrastran las features 001 y 002 (lectura de datos de
contacto con la anon key desde la tabla base y desde `publicaciones_searchable`). El chat
consume `publicaciones_searchable` a través de `tool_buscar`, que corre con `service_role`
**dentro de n8n** y recorta los campos antes de responder. El navegador nunca ve esos
datos por este camino. El riesgo sigue abierto por decisión explícita y postergado
indefinidamente, pero no se agrava.

### Re-evaluación posterior al diseño

Los artefactos de la fase 1 no introdujeron violaciones nuevas. Cuatro observaciones que
salieron del diseño y no eran evidentes al empezar:

- **La constante `rol: "invitado"` es el único control de confidencialidad de la feature**,
  y es un literal en un campo de un nodo. Es trivial de escribir mal y su falla es
  silenciosa: el chat seguiría funcionando y devolvería teléfonos sin que nada se rompa.
  Por eso SC-005 lo verifica pidiendo explícitamente los datos de contacto en 10
  conversaciones, y por eso el contrato del webhook declara `telefono` como campo
  **prohibido** en la respuesta, no simplemente ausente.
- **La verificación de sesión no es un control de seguridad**, es autocompletado (R-03).
  Como el rol es constante, un token falso o vencido no habilita nada. Esto simplifica el
  manejo de errores: el nodo de verificación degrada a anónimo y sigue, en vez de abortar.
- **El prefijo `web:` de la memoria no es cosmético.** Sin él, un miembro que use ambos
  canales arrastraría a la web contexto donde el asistente le ofrecía publicar y adjuntar
  fotos —capacidades que el chat web no tiene—, produciendo respuestas que prometen lo que
  no puede cumplir.
- **`tool_registrar_consulta` no valida que la publicación exista ni esté publicada.** Su
  única defensa es la clave foránea de `consultas.publicacion_id`. En la práctica alcanza
  (un id inventado da error y el agente lo reporta), pero significa que **el agente podría
  registrar una consulta contra una publicación despublicada** si arrastra un id de un
  turno anterior. Es un caso de borde documentado, no un bloqueante: el miembro recibiría
  un interesado en algo que ya no está publicado, que es molesto pero no peligroso.

## Project Structure

### Documentation (this feature)

```text
specs/003-chat-web-catalogo/
├── plan.md              # Este archivo
├── spec.md              # Qué y por qué
├── research.md          # Fase 0 — R-01 a R-14
├── data-model.md        # Fase 1
├── quickstart.md        # Fase 1
├── contracts/
│   ├── chat-endpoint.md     # Contrato del webhook: pedido, respuesta, errores
│   ├── n8n-workflow.md      # El workflow nuevo y lo que reutiliza sin tocar
│   └── ui-chat.md           # Componentes, estados y comportamiento de interfaz
├── checklists/
│   └── requirements.md  # Validación de la spec
└── tasks.md             # Fase 2 — lo genera /speckit-tasks
```

### Source Code (repository root)

```text
src/
├── components/
│   ├── ChatWidget.tsx          # NUEVO — burbuja, panel, lista de mensajes, input
│   ├── ChatResultado.tsx       # NUEVO — tarjeta de un resultado, enlaza al detalle
│   └── (el resto sin cambios)
├── hooks/
│   └── useChat.ts              # NUEVO — envío al webhook, estado de la conversación
├── lib/
│   ├── chatApi.ts              # NUEVO — llamada al webhook, timeout, tipos de respuesta
│   └── (el resto sin cambios)
├── pages/
│   ├── CatalogoPage.tsx        # MODIFICADO — monta el chat
│   ├── PublicacionDetallePage.tsx  # MODIFICADO — monta el chat
│   └── (el resto sin cambios)
└── (types/database.ts SIN CAMBIOS — no hay objetos de base nuevos)

.env.example                    # MODIFICADO — VITE_N8N_CHAT_URL
```

**Fuera del repositorio** (instancia n8n, vía MCP `n8n-capemisa`):

```text
capemisa_conversacional_web     # NUEVO — el único artefacto que se crea en n8n

capemisa_tool_buscar            # SIN TOCAR — se invoca
capemisa_tool_registrar_consulta # SIN TOCAR — se invoca
capemisa_conversacional         # SIN TOCAR — ni se invoca
capemisa_tool_publicar          # SIN TOCAR — ni se invoca
capemisa_tool_enviar_imagen     # SIN TOCAR — ni se invoca
capemisa_tool_actualizar_imagen # SIN TOCAR — ni se invoca
capemisa_procesar_imagen_pendiente # SIN TOCAR — ni se invoca
```

**Structure Decision**: se conserva la estructura de las features 001 y 002 —componentes,
un hook por operación, helpers en `lib/`— sin introducir capas nuevas. El chat no necesita
una carpeta propia: son dos componentes, un hook y un helper, exactamente el mismo peso
que `DialogSolicitarContacto` + `useEnviarConsulta` de la feature 001. Crear
`src/chat/` sería estructura sin contenido (Principio V).

`src/types/database.ts` **no se toca**: no hay objetos de base nuevos, y los tipos de la
respuesta del chat viven en `lib/chatApi.ts` porque no son datos de Supabase sino del
webhook.

## Orden de implementación sugerido

El orden final lo fija `/speckit-tasks`. Las dependencias duras son dos:

1. **El workflow n8n va primero y verificado a mano** (ejecución de prueba desde n8n, sin
   frontend). Sin él, el frontend no tiene contra qué desarrollarse, y un error en el
   contrato de respuesta obliga a rehacer el hook. Antes de escribir una línea de React
   tiene que existir un `curl` al webhook que devuelva `{respuesta, resultados}`.
2. **La constante `rol: "invitado"` y el guardrail se verifican antes de dar el workflow
   por bueno**, no al final. Son los dos únicos puntos donde un error produce daño real y
   silencioso.

Después, las historias en el orden de prioridad de la spec: US1 (buscar y ver resultados),
US2 (registrar consulta), US3 (precarga con sesión). US3 es la última a propósito: es la
única que depende de la verificación de sesión, y el chat es demostrable sin ella.

La verificación de intactitud (FR-032) es **la última tarea de la feature**, después del
deploy, e incluye una conversación real por WhatsApp de punta a punta.

## Riesgos

| Riesgo | Impacto | Mitigación |
|---|---|---|
| **`rol` mal escrito o tomado del body** | El chat devuelve teléfono, email y responsable de todas las empresas oferentes, con la anon key, y **todo parece funcionar bien** | Literal fijo en el nodo (R-04). SC-005 lo verifica pidiendo los datos explícitamente en 10 conversaciones. El contrato declara `telefono` como campo prohibido en la respuesta |
| **Modificar un workflow existente por accidente** | Se rompe la automatización que está en uso frente al cliente, y no se nota hasta la próxima demo | FR-030 a FR-032. Se trabaja solo creando artefactos nuevos. La verificación final compara definiciones antes/después y corre una conversación real de WhatsApp |
| **Usar Redis "porque es más prolijo"** | Colisión con las claves de estado de sesión e imagen pendiente del flujo de WhatsApp, indexadas por teléfono | FR-033: consultar antes de escribir nada. R-05 documenta que la memoria ya se resuelve sin Redis en el flujo existente |
| **Memoria sin el prefijo `web:`** | Contexto de WhatsApp filtrado a la web: el asistente ofrece publicar y adjuntar fotos, que en la web no puede hacer | `sessionKey = web:{conversacion_id}` (R-05), verificado en `quickstart.md` con la misma cuenta en ambos canales |
| **El agente confirma un registro que no ocurrió** | El visitante cree que dejó su contacto y el miembro nunca lo recibe | Guardrail copiado (R-07). SC-006 lo verifica contando filas en `consultas` antes y después |
| **Caída de n8n o del proveedor de IA** | El chat no responde | FR-025: el chat es un componente aislado; sin `VITE_N8N_CHAT_URL` ni siquiera se monta. SC-010 lo verifica |
| **Consumo de tokens por abuso del endpoint público** | Costo real sin techo | Límite por IP con `staticData` (R-09). Errar por permisivo: un límite que corta una demo en vivo es peor |
| **`VITE_N8N_CHAT_URL` no marcada como Build Variable en Coolify** | El chat no se monta en producción y en local anda perfecto | Es el mismo error ya cometido con las variables de Supabase. Anotado como paso explícito del deploy |
| **Consulta registrada contra una publicación despublicada** | El miembro recibe un interesado en algo que ya no está publicado | Caso de borde aceptado. Molesto, no peligroso. Documentado en la re-evaluación |
| **La opción de CORS no existe en esta versión del nodo Webhook** | El navegador bloquea las llamadas y el chat no funciona en producción | Verificar al crear el nodo (R-10). Alternativa: devolver los headers a mano desde `Respond to Webhook` |
