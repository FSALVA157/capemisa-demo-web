# Contrato — Workflow n8n

**Feature**: 003-chat-web-catalogo

## Regla que gobierna este documento

**Se crea un único artefacto en n8n: el workflow `capemisa_conversacional_web`.**
Todo lo demás en la instancia se invoca o se ignora, jamás se edita (FR-030).

Los cambios van por el MCP `n8n-capemisa`, no por la interfaz de n8n (constitución,
Development Workflow).

## Inventario de la instancia y su tratamiento

Estado verificado el 2026-08-01 por inspección de solo lectura.

| Workflow | ID | Tratamiento |
|---|---|---|
| `capemisa_conversacional_web` | *(nuevo)* | **CREAR** |
| `capemisa_tool_buscar` | `TL5EYZAeQriOAH0X` | **INVOCAR sin tocar** |
| `capemisa_tool_registrar_consulta` | `ErNttkhSODYuZnlk` | **INVOCAR sin tocar** |
| `capemisa_conversacional` | `nV0yGsE7diumyNNz` | **NO TOCAR — ni invocar** |
| `capemisa_tool_publicar` | `UljQp0Le1ItKQnd0` | **NO TOCAR — ni invocar** |
| `capemisa_tool_enviar_imagen` | `sFUIX0Q2H5mLecgn` | **NO TOCAR — ni invocar** |
| `capemisa_tool_actualizar_imagen` | `ZVvIGNRqP0daDk3J` | **NO TOCAR — ni invocar** |
| `capemisa_procesar_imagen_pendiente` | `vh3022mid1l8Kvef` | **NO TOCAR — ni invocar** |
| `My workflow` | `qpn034B0PWZDvoqP` | Ajeno a la feature. No tocar |

"No tocar" incluye: no cambiar nodos ni parámetros, no renombrar, no activar ni desactivar,
no cambiar credenciales, no editar prompts, no ajustar `settings`, y no guardar aunque no
se haya cambiado nada.

## Estructura del workflow nuevo

```
Webhook (POST, responseMode: responseNode)
  → Limite por IP                    [code]
  → IF ¿superó el límite?
       ├── sí → Respuesta de límite  [set] ──────────────┐
       └── no ↓                                          │
  → Verificar sesión                 [httpRequest]       │
       GET {SUPABASE_URL}/auth/v1/user                    │
       headers: Authorization (passthrough) + apikey      │
       onError: continueRegularOutput                     │
  → Resolver contexto                [code]               │
       200 → busca perfil por id; otro → anónimo          │
  → Buscar perfil                    [supabase, opcional] │
  → Armar contexto                   [set]                │
  → Agent Web                        [agent]              │
       ├─ Anthropic (modelo)                              │
       ├─ Simple Memory  sessionKey = web:{conversacion_id}
       ├─ Tool buscar             → TL5EYZAeQriOAH0X      │
       └─ Tool registrar consulta → ErNttkhSODYuZnlk      │
  → Extraer resultados               [code]               │
  → Guardrail escritura              [code]               │
  → Respond to Webhook               [respondToWebhook] ←─┘
```

**No hay nodo Redis.** Si en algún momento pareciera necesario: detener e ir a FR-033.

## Nodos y sus contratos

### Webhook

- Método `POST`, ruta propia, `responseMode: responseNode`.
- Orígenes permitidos: dominio de producción de la web + `localhost` para desarrollo.
  **Verificar que la opción exista en esta versión del nodo** (R-10); si no, headers a
  mano en el `Respond to Webhook`.

### Límite por IP

Cuenta en `$getWorkflowStaticData('global')`, ventana deslizante de 1 hora, tope 30. La
IP sale del header de reenvío que provee el proxy. Al superarse, el flujo corta **antes**
del agente: el objetivo es no gastar tokens.

Es `staticData` del workflow nuevo, así que no puede interferir con nada existente.

### Verificar sesión

```
GET {SUPABASE_URL}/auth/v1/user
Authorization: <el que vino del cliente, tal cual>
apikey: <anon key>
```

`onError: continueRegularOutput` es **obligatorio**: un 401 tiene que caer a la rama
anónima, no abortar la ejecución (FR-019). Sin sesión, este nodo se saltea o devuelve
error y se sigue igual.

**Esto no es un control de seguridad.** Como el rol es constante, un token inválido no
habilita nada: el peor caso es que el visitante tenga que tipear sus datos de contacto.

### Armar contexto

Produce los campos que consume el prompt:

| Campo | Con sesión | Sin sesión |
|---|---|---|
| `mensaje` | el del pedido | el del pedido |
| `conversacion_id` | el del pedido | el del pedido |
| `tiene_sesion` | `true` | `false` |
| `empresa`, `responsable`, `telefono`, `email` | de `perfiles` | vacíos |

### Agent Web

- `promptType: define`, `text: {{ $json.mensaje }}`
- `returnIntermediateSteps: true` — **obligatorio**: de ahí salen los `resultados` (R-06)
  y de ahí lee el guardrail.
- Modelo: el mismo que usa el agente de WhatsApp, con un tope de tokens acorde a
  respuestas de chat.

**El prompt es una copia derivada del `Agent Invitado`**, no una referencia. Se conservan:
quién es CAPEMISA, reglas críticas sobre herramientas y memoria, la regla de oro de no
confirmar escrituras sin haber llamado la tool, la prohibición absoluta de publicar, y la
regla de buscar en el primer turno. Se eliminan: formato de WhatsApp, estado de sesión con
imagen pendiente, eventos internos de audio/imagen/documento, `tool_enviar_imagen`.

Se agregan dos bloques:

1. **Datos de contacto precargados** cuando `tiene_sesion` es `true`: proponerlos y pedir
   confirmación antes de registrar, y aceptar que el visitante los reemplace (FR-016,
   FR-017).
2. **No repetir en prosa los datos de los resultados**, porque las tarjetas ya los
   muestran (R-06). Y **texto simple, sin Markdown** (R-08).

### Simple Memory

```
sessionIdType: customKey
sessionKey: =web:{{ $json.conversacion_id }}
contextWindowLength: 8
```

**El prefijo `web:` lo antepone n8n en la expresión, no el cliente.** Si el cliente pudiera
mandar la clave completa, podría apuntar a `miembro:+549...` y leer una conversación de
WhatsApp ajena.

### Tool buscar

```
workflowId: TL5EYZAeQriOAH0X
workflowInputs:
  rol: "invitado"          ← LITERAL FIJO. No expresión, no dato del pedido
  query: {{ $fromAI('query', '...keywords...', 'string') }}
```

**El literal `"invitado"` es el único control de confidencialidad de la feature.** Ver el
contrato del endpoint para qué pasa si se escribe mal.

La descripción de la tool se copia de la del flujo de WhatsApp: ya está afinada para que
el modelo la llame cuando corresponde.

### Tool registrar consulta

```
workflowId: ErNttkhSODYuZnlk
workflowInputs:
  query: {{ $fromAI('query', 'JSON con publicacion_id, empresa_interesada, persona_contacto, telefono, email, motivo, urgencia', 'string') }}
```

No hay que validar los obligatorios ni normalizar `urgencia`: el sub-workflow ya lo hace y
devuelve un error instructivo que el agente sabe usar (R-02).

### Extraer resultados

Recorre `intermediateSteps`, encuentra la última observación de `tool_buscar`, parsea su
`resultados[]`. Si no hubo búsqueda en el turno, devuelve `[]`.

Debe tolerar que la observación llegue como string JSON o como objeto: el mismo criterio
defensivo que usa `Parse LLM args` en los sub-workflows.

### Guardrail escritura

Copia recortada del nodo homónimo del flujo de WhatsApp, con **solo la rama `registrar`**:
si el texto afirma haber registrado una consulta y `tool_registrar_consulta` no aparece en
`intermediateSteps` de ese turno, se reemplaza el texto por el mensaje de reintento.

Las ramas `publicar` y `actualizar` se recortan porque esas tools no existen acá. Es una
copia independiente: que diverja del original con el tiempo es esperado y correcto.

### Respond to Webhook

Devuelve exactamente `{ respuesta, resultados }`. Ver el contrato del endpoint.

## Verificación de intactitud (FR-032)

**Última tarea de la feature, después del deploy.** No es opcional ni se reemplaza por
"no toqué nada".

1. **Antes de empezar**: guardar la definición de los 7 workflows preexistentes
   (`n8n_get_workflow` por ID) en archivos de referencia fuera del repo.
2. **Al terminar**: volver a traerlas y comparar. Prestar atención a `versionId`,
   `versionCounter` y `updatedAt`, además del contenido de los nodos.
3. **Conversación real por WhatsApp de punta a punta**: buscar algo y registrar una
   consulta, con el mismo número que se usó antes. Debe comportarse igual.
4. **Verificar que la memoria no se mezcló**: usar la misma cuenta en ambos canales y
   comprobar que el asistente web no menciona nada de la conversación de WhatsApp ni
   ofrece publicar.

Los pasos 3 y 4 son los que atrapan lo que la comparación de definiciones no ve: colisiones
de estado en tiempo de ejecución.
