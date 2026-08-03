# Research — Chat web del catálogo

**Feature**: 003-chat-web-catalogo
**Fecha**: 2026-08-01

Este documento resuelve las incógnitas técnicas de la feature antes de diseñar. Cada
decisión indica qué se verificó contra la instancia real de n8n y qué queda como
suposición a confirmar durante la implementación, porque la diferencia importa: la
restricción central de esta feature (FR-030) hace que un error de lectura sobre lo
existente sea caro.

**Lo que se inspeccionó** (solo lectura, vía MCP `n8n-capemisa`, 2026-08-01):
`capemisa_conversacional` (38 nodos, completo), `capemisa_tool_buscar` (12 nodos,
completo), `capemisa_tool_registrar_consulta` (4 nodos, completo),
`capemisa_tool_publicar`, `capemisa_tool_enviar_imagen` (estructura), y el listado de los
8 workflows de la instancia. **No se modificó nada.**

---

## R-01 — Por qué un workflow nuevo y no reutilizar `capemisa_conversacional`

### Decision

Se crea un workflow **nuevo**, `capemisa_conversacional_web`. El flujo conversacional de
WhatsApp no se toca ni se invoca.

### Rationale

No es una preferencia de diseño: `capemisa_conversacional` es **estructuralmente
inalcanzable** desde la web, por cinco razones independientes verificadas en su
definición:

1. **Entrada**: el trigger es `n8n-nodes-base.whatsAppTrigger`. Solo lo dispara la
   plataforma de WhatsApp. No expone una URL que el navegador pueda invocar.
2. **Salida**: el flujo termina en `WhatsApp Send`. No hay `Respond to Webhook`: la
   respuesta se emite hacia el celular del usuario y **nunca vuelve al que invocó**.
   Aunque se pudiera disparar, la web no recibiría nada.
3. **Identidad**: el nodo `Supabase Buscar perfil` filtra `perfiles.telefono = eq
   {{ telefono }}`, y el teléfono sale de `messages[0].from` del trigger. Un usuario de
   la web no aporta teléfono, y el de su perfil puede no existir o no coincidir.
4. **Memoria**: `Memory Miembro` usa `sessionKey = miembro:{{ telefono }}` y
   `Memory Invitado` su equivalente. Están indexadas por teléfono.
5. **Formato**: el nodo final `Formato WhatsApp` y ambos prompts imponen sintaxis de
   WhatsApp (`*negrita*`, sin Markdown, sin enlaces `[texto](url)`). Renderizado en una
   web se ve roto.

Cualquiera de los cinco puntos bastaría. Los cinco juntos hacen que "adaptarlo" signifique
reescribirlo, que es exactamente lo que FR-030 prohíbe.

### Alternatives considered

- **Agregar un segundo trigger (Webhook) al flujo existente**: prohibido por FR-030, y de
  todos modos no resolvería la salida (punto 2) sin ramificar el final del flujo.
- **Duplicar `capemisa_conversacional` completo y podarlo**: se descartó por tamaño. El
  flujo tiene 38 nodos, de los cuales ~20 son manejo de multimedia de WhatsApp (audio,
  imagen, documento, typing indicator, Redis) que la web no usa. Partir de cero con ~10
  nodos es menos código y menos superficie de error que podar 38.

---

## R-02 — Qué se reutiliza intacto, y por qué no hace falta ningún gemelo

### Decision

Se invocan **sin modificar** dos sub-workflows:

| Workflow | ID | Entrada | Salida |
|---|---|---|---|
| `capemisa_tool_buscar` | `TL5EYZAeQriOAH0X` | `{ rol, query }` | `{ ok, keywords, cantidad, resultados[] }` |
| `capemisa_tool_registrar_consulta` | `ErNttkhSODYuZnlk` | `{ query }` | `{ ok, consulta_id, mensaje }` |

**No se necesita ningún workflow gemelo.** La cláusula FR-031 queda disponible pero sin
uso previsto.

### Rationale

Se verificó nodo por nodo que ambos cubren lo que la feature necesita tal como están:

- Los dos arrancan con `executeWorkflowTrigger`, o sea que están hechos para ser invocados
  desde otro workflow.
- Los dos tienen `settings.callerPolicy: "workflowsFromSameOwner"`, y el proyecto n8n es
  personal y único (`Fernando Javier fsalva157@gmail.com`). Un workflow nuevo del mismo
  owner los puede invocar sin cambiarles la política.
- El nodo `Parse LLM args` de ambos acepta el argumento envuelto como `query`, `input`,
  `text`, `args` o `tool_input`, y también campos sueltos en la raíz. Es tolerante: no hay
  que ajustarle el formato de entrada.
- `capemisa_tool_buscar` ya recibe `rol` como campo de primer nivel (su
  `jsonExample` de trigger lo declara: `{"rol":"invitado","query":"..."}`). Pasarle
  `"invitado"` es uso previsto, no un hack.
- `capemisa_tool_registrar_consulta` valida los obligatorios (`publicacion_id`,
  `empresa_interesada`, `persona_contacto`, `telefono`) y **lanza un error con texto
  instructivo** cuando falta alguno. Ese error vuelve al agente como observación de la
  tool, que puede entonces pedirle los datos al usuario. Es el comportamiento que FR-011
  pide, y ya está construido.
- También normaliza `urgencia` con un mapa (`normal`→`media`, `urgent`→`alta`, etc.) y
  default `media`. No hay que replicarlo.

### Lo que NO se reutiliza y por qué

- **`capemisa_tool_enviar_imagen`** (`sFUIX0Q2H5mLecgn`): su nodo central es un
  `httpRequest` contra la API de WhatsApp. En la web no solo es inútil: enviaría una foto
  al WhatsApp de un número arbitrario. Queda fuera. Las imágenes las renderiza el
  frontend a partir del `imagen_url` que `tool_buscar` ya devuelve en cada resultado.
- **`capemisa_tool_publicar`** (`UljQp0Le1ItKQnd0`): fuera de alcance por FR-022. Además,
  encadena `capemisa_procesar_imagen_pendiente` y termina en un `Redis DEL sesion`
  indexado por teléfono. Invocarlo desde la web con el teléfono real de un miembro
  **borraría su estado de sesión de WhatsApp**. Es la razón concreta detrás de FR-033.
- **`capemisa_tool_actualizar_imagen`** (`ZVvIGNRqP0daDk3J`): fuera de alcance por
  FR-022, y depende de la imagen pendiente en Redis por teléfono.

### Alternatives considered

- **Consultar Supabase directamente desde el workflow nuevo, sin `tool_buscar`**: se
  descartó. Perdería el matcher semántico (nodo `LLM matcher`, Claude Haiku 4.5 con
  temperatura 0 sobre los avisos publicados), que es justamente el valor diferencial de la
  feature frente al buscador literal que ya existe. Además duplicaría lógica probada.

---

## R-03 — Cómo sabe n8n quién está del otro lado

### Decision

El cliente manda el `access_token` de Supabase en el header `Authorization: Bearer <jwt>`
cuando hay sesión. El workflow lo valida con un `HTTP Request` a
`GET {SUPABASE_URL}/auth/v1/user`, reenviando ese mismo `Authorization` más el header
`apikey` con la anon key. Si responde 200, el body trae el `id` del usuario y se busca su
perfil; si responde 401 o el header no vino, se sigue en modo anónimo.

El nodo de verificación debe tener `onError: continueRegularOutput` (o equivalente) para
que un 401 **no aborte la ejecución** sino que caiga a la rama anónima (FR-019).

### Rationale

- Es el mecanismo del propio proveedor de identidad: no hay que verificar firmas ni
  distribuir secretos nuevos, y un token vencido o revocado da 401 sin lógica extra.
- La anon key ya viaja en el bundle, así que usarla como header `apikey` en n8n no expone
  nada nuevo.
- **Consecuencia relevante**: como el rol de búsqueda es constante (R-04), esta
  verificación **no es un control de seguridad**, es una comodidad. Si fallara, el peor
  caso es que un usuario logueado tenga que tipear sus datos de contacto. Eso la hace
  mucho menos frágil que un control del que dependa la confidencialidad.

### Alternatives considered

- **Verificar la firma del JWT dentro de n8n**: requiere el secreto JWT del proyecto
  Supabase en n8n y código de verificación propio. Más superficie, mismo resultado.
- **Que el cliente mande directamente empresa/responsable/teléfono en el body**: se
  descartó. Serían datos autodeclarados sin respaldo, y ensuciarían la tabla `consultas`
  con lo que cualquiera quiera escribir. Con la verificación, los datos precargados salen
  de `perfiles` y son los reales.

---

## R-04 — El rol de búsqueda es una constante, no un dato del pedido

### Decision

El nodo `Tool buscar` del workflow nuevo pasa `rol: "invitado"` como **literal fijo**.
No se deriva del body, ni del resultado de la verificación de sesión, ni de nada que el
navegador pueda influir.

### Rationale

Esto no es cosmético. En `capemisa_tool_buscar`, el nodo `Shape resultados` decide así:

```js
if (rol !== 'invitado') r.telefono = p.telefono;
```

y el origen de los datos es la vista `publicaciones_searchable`, que corre con
`service_role` y **saltea RLS**. Si el `rol` viniera del cliente, un `POST` con
`{"rol":"miembro"}` devolvería el teléfono de todas las empresas oferentes. Con la
constante, la respuesta **nunca** contiene `telefono`, para ningún usuario (FR-021,
FR-034).

Efecto secundario deseable: el chat web devuelve **estrictamente menos** que lo que la
anon key ya expone hoy al navegador. La feature no amplía la superficie de datos y no
mueve nada del riesgo aceptado registrado en la feature 002 (R-01 de esa spec).

Además, `capemisa_tool_buscar` filtra `estado = 'publicada'` en su propio nodo de
Supabase, así que ninguna publicación en otro estado puede llegar al chat (FR-006) aunque
la vista saltee RLS.

---

## R-05 — Memoria de conversación sin Redis

### Decision

Se usa el nodo `Simple Memory` (`memoryBufferWindow`) con
`sessionIdType: customKey` y `sessionKey = web:{{ conversacion_id }}`, con
`contextWindowLength: 8`. **No se usa Redis.**

### Rationale

Se verificó que el flujo de WhatsApp **ya resuelve su memoria conversacional con
`memoryBufferWindow`, no con Redis**: `Memory Miembro` y `Memory Invitado` son ambos
`@n8n/n8n-nodes-langchain.memoryBufferWindow`. Redis aparece en ese flujo únicamente para
el **estado de sesión de multimedia** (`guardar-imagen-pendiente`, `Redis GET sesion`,
`Redis DEL sesion`), que es una funcionalidad de WhatsApp que la web no tiene.

O sea: el diseño por defecto sin Redis no es una limitación aceptada, es la misma solución
que ya funciona en producción para lo único que la web necesita.

El prefijo `web:` es obligatorio y distinto de `miembro:` / `invitado:` (FR-009). Sin él,
un miembro que use ambos canales podría arrastrar contexto de WhatsApp a la web, con el
efecto pernicioso concreto de que los prompts de WhatsApp instruyen sobre publicar y
adjuntar fotos, capacidades que el chat web no tiene.

### Si en algún momento pareciera necesario Redis

**Detener la implementación y consultar a Fernando** (FR-033). El espacio de claves de
WhatsApp está indexado por número de teléfono; cualquier clave nueva tiene que
demostrarse disjunta antes de escribirse, no después.

---

## R-06 — Cómo llegan los resultados estructurados al frontend

### Decision

El agente se configura con `returnIntermediateSteps: true`. Un nodo de código posterior
extrae de `intermediateSteps` la última observación de `tool_buscar`, parsea su
`resultados[]`, y el `Respond to Webhook` devuelve:

```json
{ "respuesta": "<texto del asistente>", "resultados": [ ... ] }
```

El frontend renderiza `respuesta` como texto y `resultados` como tarjetas.

### Rationale

- `tool_buscar` ya devuelve JSON estructurado con los campos que las tarjetas necesitan
  (`id`, `empresa`, `rubro`, `subrubro`, `zona`, `tipo_publicacion`,
  `descripcion_comercial`, `urgencia`, `imagen_url`). Desperdiciarlo y pedirle al modelo
  que reescriba todo en prosa sería peor en dos sentidos: se pierde el enlace confiable al
  detalle (`id`) y se abre la puerta a que el modelo altere los datos al reescribirlos.
- El patrón de leer `intermediateSteps` **ya está en uso y probado en este proyecto**: el
  nodo `Guardrail escritura` del flujo de WhatsApp hace exactamente eso para detectar si
  una tool corrió. No es una técnica nueva a validar.
- Los `id` que llegan permiten armar el enlace a `/publicacion/:id` sin adivinar.

### Riesgo conocido y su mitigación

El prompt del agente debe pedirle que **no repita los datos de los resultados en el
texto**, para que la respuesta no duplique lo que las tarjetas ya muestran. Si el modelo
igual los repite, la interfaz sigue siendo correcta aunque redundante: es un defecto
cosmético, no funcional.

---

## R-07 — Guardrail anti-alucinación

### Decision

Se **copia** el nodo `Guardrail escritura` del flujo de WhatsApp al workflow nuevo,
recortado a la única acción de escritura que el chat web puede hacer: `registrar`.
Copiar significa duplicar el código en el workflow nuevo — el original no se toca ni se
referencia.

### Rationale

El riesgo que ese nodo cubre es idéntico en ambos canales: el modelo escribe "listo,
registré tu consulta" sin haber llamado la tool. En WhatsApp ya ocurrió lo suficiente como
para justificar construirlo. FR-014 y SC-006 lo exigen acá.

Las ramas `publicar` y `actualizar` del guardrail original quedan sin efecto porque esas
tools no existen en el workflow nuevo. Se pueden conservar (código muerto inofensivo) o
recortar; se recorta por claridad, ya que es una copia nueva y no hay riesgo de divergir
del original: **son artefactos independientes por diseño**.

### Dos correcciones que surgieron al medir (2026-08-01)

La copia literal del guardrail bloqueaba **4 de cada 10 turnos legítimos**. Se corrigió, y
la copia diverge del original en dos puntos. El original **no se toca** (FR-030); estas
correcciones valen solo para el chat web.

1. **Se eliminó la cláusula `un admin ... te contacta`.** El asistente web ofrece ese paso
   *antes* de registrar nada ("puedo registrar una solicitud y un admin te contacta"), que
   es exactamente lo que debe hacer, y el guardrail lo reemplazaba por el mensaje de error.
2. **Se pasó a evaluar por oración, descartando interrogativas y subjuntivos.** Esta es la
   corrección de fondo: `registr[eé]` matchea igual `registré` (afirmación consumada) que
   `registre` (subjuntivo de ofrecimiento), y el modelo omite tildes la mitad de las veces.
   La frase que disparaba el bloqueo era `"¿Querés que te registre la solicitud?"`. Una
   afirmación de escritura consumada nunca es una pregunta ni viene introducida por "que".

La lógica corregida se probó fuera de n8n contra 6 afirmaciones falsas que **debe**
bloquear y 8 ofrecimientos que **no**: 14/14. Después, en 10 conversaciones reales pidiendo
datos de contacto, 0 falsos positivos.

**El original de WhatsApp arrastra la misma debilidad.** No se toca por FR-030, pero queda
registrado acá por si alguna vez se decide revisarlo con su propia spec.

---

## R-08 — Formato de salida: Markdown, no sintaxis de WhatsApp

### Decision

El prompt del agente web instruye Markdown acotado (negrita, listas, sin encabezados) y el
frontend lo renderiza como texto plano con saltos de línea respetados. **No se instala
ninguna librería de Markdown**: se muestra el texto tal cual, con `whitespace-pre-wrap`.

### Rationale

- El prompt del `Agent Invitado` de WhatsApp tiene un bloque `FORMATO DE SALIDA` que
  prohíbe Markdown y exige `*negrita*` de WhatsApp. Copiarlo tal cual a la web mostraría
  asteriscos literales.
- Agregar `react-markdown` sería una dependencia nueva para un chat de demo cuyo contenido
  rico ya son las tarjetas. Contradice YAGNI (Principio V) y el stack congelado
  (Principio III). Si el texto sale con algún asterisco suelto, es un defecto menor.
- El prompt debe pedir explícitamente **texto simple, sin Markdown**, que es la opción más
  robusta: no depende de que el modelo acierte una sintaxis que igual no vamos a renderizar.

---

## R-09 — Límite de uso sin Redis y sin base

### Decision

Un nodo de código al inicio del workflow lleva la cuenta por IP usando
`$getWorkflowStaticData('global')`, con ventana deslizante de 1 hora y tope de 30
mensajes. Al superarse, se responde con un mensaje amable en español y **sin invocar al
modelo** (que es el punto: el límite existe para no gastar tokens).

### Rationale

- No requiere Redis (FR-033) ni tabla nueva en Supabase (mantiene `db/*.sql` intacto en
  esta feature).
- `staticData` es del workflow nuevo, así que no puede interferir con nada existente.
- Es aproximado: si n8n corre en varias instancias o reinicia, la cuenta se pierde o se
  fragmenta. Para una demo con un solo contenedor es suficiente, y errar por permisivo es
  el lado correcto del error acá — un límite que corta una demostración en vivo sería peor
  que uno que deja pasar de más.

### Alternatives considered

- **Rate limit en nginx o Coolify**: más robusto, pero el chat vive en otro host (n8n), no
  en el que sirve el frontend. No aplica.
- **Sin límite**: se descartó. El endpoint es público y cada mensaje cuesta dinero real
  (Sonnet 4.5 del agente + Haiku 4.5 del matcher, más de una llamada por turno cuando hay
  búsqueda).

---

## R-10 — Exposición del endpoint y CORS

### Decision

El webhook es público y se protege con: `POST` únicamente, el límite de R-09, orígenes
permitidos restringidos al dominio de la web y a `localhost` para desarrollo, y un cuerpo
validado (mensaje no vacío, longitud máxima).

**VERIFICADO el 2026-08-01**: la opción existe y funciona. El preflight responde
`204` con `access-control-allow-origin: http://localhost:5173` y
`access-control-allow-methods: OPTIONS, POST`. No hizo falta la alternativa de devolver
los headers a mano.

**Hallazgo no previsto, al crear el nodo por la API**: n8n **no genera el `webhookId`**
cuando el workflow se crea por la API; lo hace la interfaz web. Sin ese campo, el
workflow figura `active: true`, con `activeVersionId` y `triggerCount: 1`, pero la ruta de
producción **no queda registrada** y responde `404 "The requested webhook POST chat-web is
not registered"`. El síntoma es engañoso porque todo el estado indica que está activo, y
el mensaje de error sugiere activarlo desde la interfaz.

Se resolvió inyectando un UUID en `webhookId` del nodo y reactivando. Los triggers de los
workflows existentes lo tienen (el `WhatsApp Trigger` de `capemisa_conversacional` trae
`webhookId: 13471c97-...`), que fue la pista para encontrarlo.

### Rationale

Conviene ser explícito sobre qué protege y qué no: CORS es una defensa del navegador, no
del endpoint. Cualquiera con `curl` puede llamarlo igual. **El control real es el límite
de uso**, y el hecho de que el peor caso de un abuso sea consumo de tokens, no fuga de
datos: la respuesta no contiene PII (R-04) ni permite escribir nada más que una fila en
`consultas` con datos que el atacante inventa —que es exactamente lo que ya puede hacer
hoy contra el formulario público del catálogo—.

---

## R-11 — Estado del chat en el cliente

### Decision

Estado local con `useState` dentro de un componente de chat, y un hook `useChat` que
encapsula el envío con `useMutation` de TanStack Query. El `conversacion_id` se genera con
`crypto.randomUUID()` y se guarda en `sessionStorage`. **No se cachea la conversación en
el `QueryClient`.**

### Rationale

- Una conversación es un log que crece por append, no un recurso cacheable con
  invalidación. Meterla en el cache de Query sería usar la herramienta al revés.
- `useMutation` sí aporta: da `isPending` para el indicador de "escribiendo" (FR-027) y
  `isError` para el reintento, sin escribir esa maquinaria a mano. Es el mismo patrón que
  `useEnviarConsulta`.
- `sessionStorage` (no `localStorage`) implementa literalmente el requisito: la
  conversación vive mientras dure la pestaña, y dos pestañas tienen conversaciones
  independientes porque `sessionStorage` es por pestaña.

### Defecto encontrado al validar en el navegador (2026-08-01)

**La conversación sobrevivía al cambio de sesión.** El `conversacion_id` se generaba una vez
por pestaña y no se tocaba nunca más, así que al iniciar sesión el asistente seguía usando
la misma memoria del lado de n8n. Consecuencia medida: después de que alguien registrara
una consulta como anónimo dando "Geodesia del Sur / Marta Ruiz / +5493870000009", al
iniciar sesión **el asistente le proponía esos datos a la persona logueada** en lugar de
los de su perfil, porque el contexto reciente de la conversación le pesaba más que el
bloque de precarga.

Es un problema de corrección de datos, no solo cosmético: si el usuario confirma sin leer,
la consulta queda registrada a nombre de otra empresa.

**Corrección**: `useChat` observa la identidad (`session?.user?.id`) y, cuando cambia,
genera un `conversacion_id` nuevo y reinicia los mensajes. `cargando` es imprescindible en
esa comparación: la sesión se resuelve de forma asincrónica y arranca en `null`, así que
sin esperar a que termine, **cada recarga se vería como un cambio de identidad** y
reiniciaría la conversación sola.

**No lo detectó la validación por API** porque cada prueba usaba un `conversacion_id`
nuevo. Solo aparece cuando una misma pestaña atraviesa anónimo → logueado, que es
exactamente lo que hace una persona.

**Efecto colateral sobre AC-3.4**: la spec decía que al vencer la sesión "la conversación
continúa sin error visible". Con esta corrección, la conversación **se reinicia**. Se
eligió así porque dejar visible la conversación de la persona anterior tras un cierre de
sesión es peor que perderla. En la práctica el caso es raro —Supabase renueva el token
solo mientras la pestaña está abierta, así que llegar a `null` implica que la renovación
falló—, pero **es una desviación consciente del criterio de aceptación**.

**Confirmada por Fernando el 2026-08-03**: se adopta el reinicio como comportamiento
correcto, no como concesión. AC-3.4 en `spec.md` quedó reescrito para decir lo que el
código hace. Si en algún momento se quiere volver a "continúa", hay que resolver antes
cómo se purga la memoria del lado de n8n sin tirar la conversación, que es el problema que
el reinicio esquiva.

### Nota sobre el doble envío

Aplica lo aprendido en la feature 002: `disabled={isPending}` **no evita el doble envío**
en el mismo tick. El campo de mensaje debe limpiarse de forma optimista al enviar, lo que
ya hace que un segundo envío inmediato mande vacío y sea rechazado; si aun así se
detectara duplicación, se agrega el guard con `useRef` del patrón de
`PublicacionFormPage`.

---

## R-12 — Errores, demoras y degradación

### Decision

- Timeout del lado del cliente en 45 segundos.
- Cualquier fallo (red, 4xx, 5xx, timeout) produce un mensaje del asistente en español con
  opción de reintentar, no un toast ni una pantalla de error.
- El chat se monta de forma que un fallo suyo no pueda tumbar la página que lo contiene.
- Si falta `VITE_N8N_CHAT_URL`, el chat **no se monta** y el resto de la web funciona
  igual. No se lanza como hace `src/lib/supabase.ts` con sus variables.

### Rationale

FR-025 y SC-010 exigen que el catálogo sobreviva a la caída del chat. La diferencia de
criterio con `supabase.ts` —que sí lanza si faltan sus variables— es deliberada: sin
Supabase la app no tiene nada que mostrar, sin chat tiene todo menos el chat.

45 segundos es holgado a propósito: un turno con búsqueda encadena una llamada a Sonnet
4.5, una a Haiku 4.5 y una segunda a Sonnet para redactar la respuesta. El objetivo de
SC-004 (15 s en el 90%) es la expectativa; el timeout es la red de contención.

### Riesgo aceptado — `ChatWidget` sin error boundary propio

**Aceptado por Fernando el 2026-08-03, con criterio de demo.**

FR-025 dice que una falla del chat no debe afectar al catálogo. Hoy eso se cumple **por
convención, no por estructura**: `chatApi.ts` no lanza nunca —traduce todo fallo de red,
4xx, 5xx y timeout a un mensaje del asistente— y por eso no hay camino conocido en el que
el widget tire una excepción de render. Pero si alguna vez la tirara, no hay boundary que
la contenga: la atraparía el `errorElement` de React Router y se caería la ruta entera,
catálogo incluido, que es exactamente lo que FR-025 quiere evitar.

Se decide **no** agregar el boundary durante la demo. Lo que lo convierte en riesgo real es
cualquier cambio que rompa la invariante de `chatApi.ts`: si alguien hace que el módulo
lance, o mete lógica que pueda romper en render dentro de `ChatWidget` /
`ChatResultado`, hay que envolver el widget en su propio `ErrorBoundary` **en el mismo
cambio**. Es la condición que cierra este riesgo, no una tarea de mantenimiento suelta.

---

## R-13 — Testing

### Decision

Validación manual/visual documentada en `quickstart.md`, con conteos y comparaciones
explícitas, no impresiones. Sin suite automatizada.

### Rationale

Es el default de la constitución (Principio V) y la spec no pide lo contrario. Pero la
lección de la feature 002 aplica con fuerza acá: **los cinco defectos que aparecieron se
encontraron midiendo, no mirando la pantalla**. Los criterios de esta feature están
escritos para ser medidos: SC-005 y SC-006 se verifican contando filas en `consultas` y
buscando cadenas concretas en las respuestas, no leyendo la conversación con buena fe.

Punto crítico: **SC-009 (los workflows existentes quedaron intactos) se verifica
comparando la definición de cada workflow preexistente antes y después**, más una
conversación real de WhatsApp de punta a punta. No alcanza con "no los toqué".

---

## R-14 — Prompt del agente web

### Decision

Se escribe un prompt nuevo **derivado** del `Agent Invitado` de WhatsApp: se conservan los
bloques que siguen aplicando (quién es CAPEMISA, reglas críticas sobre herramientas y
memoria, regla de oro sobre no confirmar escrituras, prohibición de publicar, regla de
primer turno de búsqueda) y se eliminan o reescriben los que no (formato WhatsApp, estado
de sesión con imagen pendiente, eventos internos de audio/imagen/documento,
`tool_enviar_imagen`).

Se agregan dos bloques nuevos: el de datos de contacto precargados cuando hay sesión
(FR-016), y la instrucción de no repetir en prosa los datos que ya van en las tarjetas
(R-06).

### Rationale

Los bloques que se conservan no son adorno: cada uno corresponde a un defecto observado en
el canal de WhatsApp (responder resultados desde la memoria en vez de rebuscar, confirmar
registros que no ocurrieron, aceptar recolectar datos de un aviso pese a no poder
publicar). Reescribirlos de cero repetiría los mismos errores.

**Es una copia, no una referencia.** El prompt del workflow existente no se toca (FR-030) y
el nuevo evoluciona por separado. Que diverjan con el tiempo es aceptable y esperado: son
dos canales con capacidades distintas.

---

## Resumen de decisiones

| # | Decisión | Impacto en restricciones duras |
|---|---|---|
| R-01 | Workflow nuevo `capemisa_conversacional_web` | Cumple FR-030: no se toca el existente |
| R-02 | Reutiliza `tool_buscar` y `tool_registrar_consulta` intactos | **No hace falta ningún gemelo** (FR-031 sin uso) |
| R-03 | Sesión verificada contra `/auth/v1/user`, degrada a anónimo | FR-019, FR-020 |
| R-04 | `rol: "invitado"` como literal fijo en el nodo | FR-021, FR-034 — la respuesta nunca trae PII |
| R-05 | Memoria con `Simple Memory`, prefijo `web:` | **Sin Redis** (FR-033), sin colisión con WhatsApp |
| R-06 | Resultados vía `intermediateSteps` → `{respuesta, resultados}` | — |
| R-07 | Copia recortada del guardrail | FR-014, y es copia: FR-030 intacto |
| R-08 | Texto plano, sin librería de Markdown | Principios III y V |
| R-09 | Límite por IP con `staticData` del workflow nuevo | FR-024, sin Redis, sin tocar la base |
| R-10 | Webhook público + CORS + límite; CORS **a verificar** | FR-024 |
| R-11 | Estado local + `useMutation`, `sessionStorage` | FR-008, FR-029 |
| R-12 | Sin `VITE_N8N_CHAT_URL` el chat no se monta y la web sigue | FR-025, SC-010 |
| R-13 | Validación manual medida, con verificación de intactitud | FR-032, SC-009 |
| R-14 | Prompt derivado del `Agent Invitado`, copiado | FR-030 |

**Cambios en `db/*.sql`**: ninguno. Esta feature no crea ni modifica tablas, vistas ni
políticas. Escribe en `consultas` a través de un workflow existente que ya lo hacía.
