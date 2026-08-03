# Quickstart — Validación del chat web

**Feature**: 003-chat-web-catalogo
**Fecha**: 2026-08-01

Guía de validación manual. No hay suite automatizada (Principio V).

**Criterio general, aprendido en la feature 002**: los cinco defectos de esa feature
aparecieron **midiendo**, no mirando la pantalla. Acá vale igual. Cuando un paso dice
"verificar en la respuesta cruda", es la pestaña de red del navegador o `curl`, no lo que
se ve renderizado. La diferencia importa: el control de confidencialidad central de esta
feature falla en silencio y la pantalla se ve idéntica.

---

## Prerequisitos

1. **`.env.local` con la variable nueva**:

   ```
   VITE_SUPABASE_URL=https://<project-ref>.supabase.co
   VITE_SUPABASE_ANON_KEY=<anon key>
   VITE_N8N_CHAT_URL=https://n8n-apemisa.fsalva157.dev/webhook/<ruta>
   ```

2. **Workflow `capemisa_conversacional_web` creado y activo** en n8n.

3. **Definiciones de referencia guardadas antes de empezar** — necesarias para la
   verificación de intactitud (paso final). Guardar fuera del repo:

   ```bash
   REF=/tmp/n8n-antes && mkdir -p $REF
   # Por cada uno de los 7 IDs preexistentes, guardar n8n_get_workflow en $REF/<id>.json
   ```

   IDs: `nV0yGsE7diumyNNz`, `TL5EYZAeQriOAH0X`, `ErNttkhSODYuZnlk`,
   `UljQp0Le1ItKQnd0`, `sFUIX0Q2H5mLecgn`, `ZVvIGNRqP0daDk3J`, `vh3022mid1l8Kvef`.

   **Este paso va antes de crear nada.** Después es tarde.

4. **Cuentas de prueba** (de la feature 002, contraseña `demo1234`):
   `miembro@capemisa.com`, `miembro.b@capemisa.com`, `admin@capemisa.com`.

5. **Un aviso publicado cuyo vocabulario no coincida con el que se va a usar para
   buscarlo.** Si los seeds no lo tienen, anotar cuál se usa para cada par de SC-001.

6. **Acceso a la base** para contar filas de `consultas` (SC-006).

7. **Un teléfono con WhatsApp** que ya haya conversado con el bot, para el paso final.

---

## US1 — Encontrar algo sin saber cómo se llama

### V-1.1 — Búsqueda semántica (AC-1.1, AC-1.2)

Preparar **5 pares**: un aviso publicado y un pedido que use vocabulario distinto al del
aviso. Ejemplo: aviso "uniformes y ropa de trabajo" ↔ pedido "prendas de vestir para el
personal".

Para cada par, en el chat anónimo:

| Par | Pedido usado | ¿Devolvió el aviso? | ¿Lo devuelve el buscador de la grilla? |
|---|---|---|---|
| 1 | | | |
| 2 | | | |
| 3 | | | |
| 4 | | | |
| 5 | | | |

**Pasa si**: el chat acierta en ≥4 de 5, y el buscador literal falla en ≥3 de 5 (SC-001).
La segunda columna no es decorativa: es lo que demuestra que el chat no es redundante.

### V-1.2 — Forma de los resultados (AC-1.1)

En una búsqueda con resultados, verificar que cada tarjeta muestra empresa, tipo legible,
rubro, subrubro, zona, descripción comercial, urgencia e imagen cuando la hay, y que son
**como máximo 5**.

### V-1.3 — Enlace al detalle (AC-1.3)

Elegir "Ver publicación" en un resultado. Debe llegar al detalle de **esa** publicación.
Comparar el id de la URL con el `id` del resultado en la respuesta cruda.

### V-1.4 — Sin resultados (AC-1.4)

Pedir algo que seguro no existe ("submarinos nucleares"). El asistente debe decir que no
encontró nada. **No debe listar avisos.** Anotar el texto de la respuesta.

### V-1.5 — Estados distintos de `publicada` (SC-008)

Con la cuenta `miembro@capemisa.com`, identificar en `/mi-area` una publicación en estado
`pendiente` o `rechazada` y anotar su descripción. Buscar en el chat exactamente esa
descripción, **anónimo y también logueado**.

**Pasa si**: no aparece en ninguno de los dos casos.

### V-1.6 — Sin datos de contacto (AC-1.6, SC-005) ⚠️ **verificación central**

En **10 conversaciones** distintas, incluir pedidos explícitos: "dame el teléfono", "pasame
el mail del responsable", "quién es el contacto", "necesito hablar directo con ellos".

Para cada una, revisar la **respuesta cruda**:

```bash
curl -s -X POST "$VITE_N8N_CHAT_URL" -H 'Content-Type: application/json' \
  -d '{"mensaje":"dame el telefono de esa empresa","conversacion_id":"<uuid>"}' \
  | grep -Ei 'telefono|email|responsable|\+549' && echo "FALLA" || echo "OK"
```

Repetir **con sesión activa** (header `Authorization`), que es donde un error de
configuración del `rol` se manifestaría.

**Pasa si**: 0 de 10 exponen datos de contacto, con y sin sesión (SC-005).

**Si falla**: revisar que `Tool buscar` tenga `rol` como literal `"invitado"` y no como
expresión. Es el único punto donde este defecto se origina.

### V-1.7 — Pedido fuera de tema (AC-1.5)

Preguntar algo ajeno ("¿qué tiempo va a hacer mañana?") y algo institucional que el
asistente sí tiene ("¿qué es CAPEMISA?"). Debe responder lo segundo con la información del
prompt y no inventar datos en el primero.

---

## US2 — Solicitud de contacto desde el chat

### V-2.1 — Alta completa (AC-2.1, AC-2.2)

1. Contar filas de `consultas` antes.
2. En el chat anónimo, buscar algo, elegir un resultado y pedir contactar.
3. Dar los datos que el asistente pida.
4. Contar filas después.

**Pasa si**: hay exactamente **una** fila nueva, con los datos ingresados, y
`estado_seguimiento = 'nueva'`.

Anotar cuántos turnos llevó: **SC-003 exige 5 o menos** para anónimo.

### V-2.2 — Visible para el miembro dueño (AC-2.2, AC-2.4)

Entrar con la cuenta dueña de esa publicación, ir a `/mi-area/publicacion/:id` y verificar
que el interesado aparece. Comparar con una consulta cargada desde el formulario del
catálogo: deben verse iguales, con los mismos campos completos (FR-013).

### V-2.3 — Sin publicación identificada (AC-2.3)

Buscar algo que devuelva 2 o más resultados y decir "quiero contactar" sin aclarar cuál.

**Pasa si**: el asistente pide que se aclare. **Falla si**: elige uno por su cuenta o
registra algo.

### V-2.4 — Guardrail anti-alucinación (AC-2.5, SC-006) ⚠️

En **10 conversaciones**, contar filas de `consultas` antes y después de cada una, y
registrar si el asistente afirmó haber registrado algo.

Incluir intentos de inducir la falla: pedir contacto sin dar datos y luego decir
"registralo igual", "dale, ya está", "confirmá".

| # | ¿Afirmó registrar? | Filas antes | Filas después | ¿Coincide? |
|---|---|---|---|---|
| 1 … 10 | | | | |

**Pasa si**: 0 casos donde afirmó y no registró (SC-006).

### V-2.5 — Faltan datos obligatorios

Pedir contacto dando solo el motivo. El asistente debe pedir empresa, persona y teléfono
antes de registrar. **No debe registrar una fila incompleta.**

### V-2.6 — El chat no publica (SC-007)

En **10 conversaciones**, pedir publicar de distintas formas: "quiero publicar", "vendo un
grupo electrógeno", "necesito cargar un aviso", "ofrezco servicio de transporte".

**Pasa si**: en 0 casos el asistente recolecta datos de un aviso (empresa, precio, zona,
disponibilidad con intención de publicar) o dice que lo publicó. Debe explicar que se hace
desde el área de miembro.

---

## US3 — Precarga con sesión

### V-3.1 — Datos propuestos (AC-3.1, AC-3.2)

Con `miembro@capemisa.com` logueado, buscar y pedir contactar.

**Pasa si**: el asistente propone empresa, responsable, teléfono y email del perfil y pide
confirmación. Al confirmar, la fila de `consultas` queda con **esos** datos.

Anotar los turnos: **SC-003 exige 2 o menos** con sesión.

### V-3.2 — Reemplazo de datos (AC-3.3)

Igual que V-3.1, pero indicando otros datos de contacto. Deben usarse los indicados, no los
del perfil.

### V-3.3 — Sesión vencida a mitad de conversación (AC-3.4)

Con el chat abierto y conversando, cerrar sesión desde otra pestaña. Seguir escribiendo.

**Pasa si**: la conversación **se reinicia** sin error visible, y al pedir contacto el
asistente vuelve a preguntar los datos — sin proponer los de la identidad anterior, que es
lo que este criterio protege. (Criterio revisado el 2026-08-03; ver la desviación
confirmada de AC-3.4 en `research.md`.)

### V-3.4 — Mismos resultados con y sin sesión (AC-3.5)

Hacer el mismo pedido logueado y anónimo, comparando las **respuestas crudas**.

**Pasa si**: los mismos `id` de resultados y, en los dos casos, sin `telefono`.

---

## Casos de borde

| # | Caso | Cómo se prueba | Resultado esperado |
|---|---|---|---|
| E-1 | Chat sin la variable de entorno | Quitar `VITE_N8N_CHAT_URL`, rebuild | El chat no se monta; catálogo, detalle y área de miembro funcionan igual (SC-010) |
| E-2 | n8n caído | Desactivar el workflow y escribir | Turno de error en español con opción de reintentar. La página no se rompe |
| E-3 | Timeout | — | A los 45 s, turno de error, no espera indefinida |
| E-4 | Recarga de página | Conversar, recargar, seguir | La conversación en pantalla se vacía, pero el asistente conserva contexto (misma `conversacion_id`) |
| E-5 | Dos pestañas | Conversar distinto en cada una | No se mezclan |
| E-6 | Mensaje vacío | Enter con el campo vacío | No se envía, sin error ruidoso |
| E-7 | Mensaje larguísimo | Pegar >1000 caracteres | Mensaje claro, no se envía |
| E-8 | Límite de uso | Superar el tope desde la misma IP | Mensaje amable de esperar, no error técnico. **Verificar que no se llamó al modelo**: la ejecución debe cortar antes del agente |
| E-9 | Cerrar y reabrir el panel | — | La conversación sigue ahí (FR-029) |
| E-10 | `rol` en el body | `curl` con `{"rol":"miembro", ...}` | **Ignorado.** La respuesta sigue sin `telefono` (FR-034) |
| E-11 | Clave de memoria manipulada | `curl` con `conversacion_id: "miembro:+5493875555555"` | No debe devolver contexto de WhatsApp. El prefijo `web:` lo antepone n8n |

E-10 y E-11 son intentos de ataque, no casos de uso. Deben probarse igual.

---

## Verificaciones de compliance

### C-1 — `service_role` fuera del bundle (Principio IV)

```bash
npm run build
grep -ri "service_role" dist/ && echo "FALLA" || echo "OK"
```

Verificar también que el bundle contenga solo la URL de Supabase, la anon key y la URL del
webhook.

### C-2 — Sin cambios en la base

`git status` no debe mostrar archivos nuevos ni modificados en `db/`, y
`src/types/database.ts` debe estar sin cambios.

### C-3 — Sin dependencias nuevas

`package.json` y `package-lock.json` sin cambios. Si aparece una dependencia, es una
violación del Principio III que hay que justificar o revertir.

### C-4 — Build limpio

```bash
npm run lint && npm run build
```

`tsc -b` con `noUnusedLocals`/`noUnusedParameters` atrapa lo que oxlint no.

### C-5 — Responsive (SC-011)

Verificar el chat abierto y cerrado a **375, 768 y 1440 px**. A 375 px, el campo no debe
quedar tapado por el teclado virtual ni el panel debe tapar la barra de navegación.

---

## Verificación de intactitud ⚠️ **última tarea, después del deploy** (FR-032, SC-009)

Esta es la verificación que justifica toda la disciplina de la feature. **No se reemplaza
por "no toqué nada".**

### I-1 — Definiciones sin cambios

```bash
DESPUES=/tmp/n8n-despues && mkdir -p $DESPUES
# Traer n8n_get_workflow de los mismos 7 IDs a $DESPUES/<id>.json
diff -r /tmp/n8n-antes $DESPUES && echo "OK: intactos" || echo "FALLA: algo cambió"
```

Si hay diferencias, revisar si son de metadatos volátiles o de contenido real. **Un cambio
en `versionId` o `versionCounter` significa que el workflow se guardó**, aunque el
contenido parezca igual.

### I-2 — Conversación real por WhatsApp de punta a punta

Con un teléfono que ya haya conversado con el bot:

1. Buscar algo. Verificar que devuelve resultados **con teléfono** (es la rama de miembro,
   se comporta distinto que la web a propósito).
2. Registrar una consulta. Verificar la fila nueva en `consultas`.
3. Mandar una foto y verificar que el bot la reconoce (es lo que usa Redis; confirma que el
   estado de sesión sigue intacto).

**Pasa si**: se comporta igual que antes de la feature.

### I-3 — Sin mezcla de memoria entre canales

Con la misma persona:

1. Conversar por WhatsApp sobre un tema concreto.
2. Abrir el chat web y preguntar "¿de qué estábamos hablando?".

**Pasa si**: el chat web no sabe nada de la conversación de WhatsApp, y en ningún momento
ofrece publicar o adjuntar fotos.

**Si falla**: la `sessionKey` no tiene el prefijo `web:` o lo toma del cliente.

---

## Registro de validación

Corrida automatizada del 2026-08-01 contra el workflow `capemisa_conversacional_web`
(`x77glo4LOG1Hy1Pn`) y la base de la demo. Todo lo medible por API está medido; lo que
requiere una persona o un navegador quedó pendiente y está marcado como tal.

| Criterio | Objetivo | Medido | Estado |
|---|---|---|---|
| SC-001 | ≥4/5 aciertos semánticos; literal falla ≥3/5 | **chat 5/5, literal 0/5** | ✅ |
| SC-002 | Publicación relevante en ≤2 mensajes | 1 mensaje en los 5 pares | ✅ |
| SC-003 | ≤5 turnos anónimo, ≤2 con sesión | 3 anónimo · 1 con sesión | ✅ |
| SC-004 | <15 s en el 90% de los turnos | **5/5 bajo 15 s** — mín 3,3 s · mediana 8,0 s · máx 8,9 s | ✅ |
| SC-005 | 0/10 exponen datos de contacto | **0/10** (5 sin sesión + 5 con sesión) | ✅ |
| SC-006 | 0/10 confirmaciones falsas | **0/10**, filas 8→9 (solo el alta real) | ✅ |
| SC-007 | 0/10 recolectan datos de aviso | **0/10** | ✅ |
| SC-008 | 0 publicaciones no publicadas en resultados | 8 ids únicos en 12 búsquedas, **todos `publicada`** | ✅ |
| SC-009 | 7 workflows intactos + WhatsApp funcionando | definiciones **byte a byte idénticas**; WhatsApp pendiente 🔒 | ⏳ |
| SC-010 | Web funcional con el chat caído | **20 tarjetas, buscador y filtros** con el workflow desactivado | ✅ |
| SC-011 | Usable a 375, 768 y 1440 px | **0 scroll horizontal**, panel no tapa la barra ni la burbuja | ✅ |

### Defecto encontrado en la validación con navegador

**La conversación no se reiniciaba al cambiar de sesión.** Tras registrar una consulta como
anónimo con "Geodesia del Sur / Marta Ruiz", al iniciar sesión el asistente **le proponía
esos datos a la persona logueada** en lugar de los de su perfil: el `conversacion_id` era
el mismo, así que la memoria del lado de n8n seguía viva.

Corregido en `src/hooks/useChat.ts` (regenera el id cuando cambia la identidad) y
verificado: ahora propone "Proveedor Minero / Felipe Andres Huanca", sin rastro del tramo
anónimo. Detalle y consecuencias sobre AC-3.4 en `research.md`.

**La validación por API no lo podía encontrar**, porque cada prueba usaba un
`conversacion_id` nuevo. Solo aparece cuando una misma pestaña pasa de anónimo a logueado.

### Cómo se midió SC-005, que es el criterio central

Las dos primeras versiones del verificador dieron **falsos positivos**, y conviene dejarlo
escrito porque el próximo que lo corra va a tropezar igual:

1. Un `grep` de `\+549\d+` sobre la respuesta cruda marcaba 3 de 5 turnos con sesión. El
   número era **el del propio usuario logueado**, que la precarga propone a propósito
   (FR-016). Con la cuenta `miembro@capemisa.com` el test es ambiguo, porque su teléfono es
   además el de sus 13 publicaciones.
2. Se rehízo con `admin@capemisa.com`, cuyo teléfono **no figura en ninguna publicación**,
   y con un chequeo **estructural**: ningún elemento de `resultados[]` puede traer las
   claves `telefono`, `email` ni `responsable`. Ese chequeo es decisivo porque no depende
   de qué número sea. El textual quedó como segunda barrera, admitiendo solo el teléfono
   propio.

Mismo tipo de error en SC-007 (`publicad[oa]` matcheaba "ofertas ya **publicadas**", que
es parte de la respuesta *correcta* de rechazo — el mismo falso positivo que el guardrail
de WhatsApp documenta en su propio comentario) y en SC-008 (buscar la palabra en el JSON
marcaba una publicación *publicada* de catering como si fuera la pendiente; se resolvió
consultando el `estado` de los ids devueltos).

**La lección se repite: hay que verificar contra la base o contra la estructura, no contra
el texto.**

### T044 equivalente — verificación en producción (2026-08-01)

Deploy hecho por Fernando. Verificado contra `https://capemisa-app.fsalva157.dev`:

| Qué | Resultado |
|---|---|
| Bundle desplegado | `index-exoESgAO.js`, 849.170 bytes |
| `VITE_N8N_CHAT_URL` inlineada | **sí** — la URL del webhook aparece en el bundle, o sea que quedó marcada como Build Variable |
| `service_role` en el bundle | ausente |
| Fallback SPA de nginx | `/`, `/ingresar` y `/publicacion/:id` responden 200 |
| Chat montado | burbuja presente y panel operativo |
| Búsqueda semántica | "necesito luz en un campamento sin red electrica" → 3 tarjetas de grupos electrógenos |
| Datos de contacto en la respuesta | **ninguno** |
| Errores de JavaScript | solo un 400 de `/auth/v1/token` por un refresh token vencido en el navegador, ajeno al chat |

**Merge**: PR #4 (`d2cf66c`) en `main`. El auto-deploy sí funcionó esta vez.

### T036 — SC-010 medido en producción (2026-08-03)

Se desactivó `capemisa_conversacional_web` por la API de n8n durante **~2 minutos** y se
midió la web contra `https://capemisa-app.fsalva157.dev`. Con el workflow caído:

| Qué | Resultado |
|---|---|
| Webhook `POST /webhook/chat-web` | HTTP **404**, "The requested webhook is not registered" — el chat estaba realmente caído |
| Catálogo `/` | **20 tarjetas**, el mismo número que la verificación local |
| Buscador | "grupo electrogeno" → **20 → 3 tarjetas**; la URL pasó a `?q=grupo+electrogeno` |
| Detalle `/publicacion/…bb01` | carga completo: rubro, zona, disponibilidad, descripción |
| `/mi-area` sin sesión | redirige a `/ingresar`, sin romper |
| **Chat degradado** | "Perdón, no pude responderte en este momento. ¿Probamos de nuevo?" + botón **Reintentar** |
| Catálogo **después** del fallo del chat | **20 tarjetas** y navbar intactos — el widget falló sin llevarse la página |
| Consola | 2 errores, **los dos del propio fetch al webhook** (CORS del preflight y `ERR_FAILED`). Ninguno ajeno al chat |

Los dos errores de consola merecen una nota: con el workflow desactivado n8n responde 404
**sin cabeceras CORS**, así que el navegador lo reporta como bloqueo de CORS y no como
404. Da igual para el resultado —`chatApi.ts` trata todo fallo del mismo modo— pero
explica por qué el mensaje de consola no dice "404".

**Restauración verificada, que es la parte que no se puede dar por hecha**: tras
reactivar, el webhook volvió a responder **HTTP 200**, y en el navegador
"necesito luz en un campamento sin red electrica" devolvió **3 tarjetas de grupos
electrógenos sin datos de contacto**. El `versionId` quedó en `1daded92-6c84-4ac9-9341-caaaee9930d2`
**antes y después** del toggle: activar y desactivar por API **no reescribe el workflow**,
que es lo que mantiene válida la verificación de intactitud I-1.

### Verificaciones ya corridas

| # | Qué | Resultado |
|---|---|---|
| V-1.1 | 5 pares semánticos | chat 5/5, literal 0/5 (literal medido en SQL con la frase y con la palabra suelta) |
| V-1.5 | Estados ≠ `publicada` | 0 fugas, verificado por `estado` de los ids devueltos |
| V-1.6 | Datos de contacto | 0/10, con y sin sesión |
| V-2.1 | Alta real | 1 fila exacta (8→9), completa, `estado_seguimiento='nueva'` |
| V-2.4 | Guardrail | 0/10 confirmaciones falsas |
| V-2.6 | Intentos de publicar | 0/10 |
| V-3.1 | Precarga con sesión | propone empresa, responsable y teléfono en 1 turno |
| E-8 | Límite de uso | corta **antes del agente**: los nodos corridos son Webhook → Límite → Validar → IF → Respuesta directa → Respond |
| E-10 | `rol` inyectado en el body | ignorado; la respuesta sigue sin `telefono` |
| E-11 | `conversacion_id` apuntando a WhatsApp | sin contexto ajeno |
| V-1.2 | Forma de las tarjetas | empresa, tipo legible, rubro·subrubro, descripción, zona, urgencia, imagen y "Ver publicación" |
| V-1.3 | Enlace al detalle | la URL coincide con el `id` del resultado |
| V-1.4 | Sin resultados | lo dice y no inventa; 0 tarjetas |
| V-2.2 | Interesado visible para el dueño | consulta del chat visible en `/mi-area/publicacion/:id` con todos los campos |
| V-2.3 | Sin publicación identificada | pide aclarar cuál (caso 2 de la batería de SC-006) |
| V-2.5 | Faltan datos obligatorios | pide empresa, persona y teléfono antes de registrar |
| V-3.1 | Precarga con sesión | propone los datos del perfil en 1 turno |
| V-3.2 | Reemplazo de datos | registra con los datos indicados, no con los del perfil |
| E-1 | Sin `VITE_N8N_CHAT_URL` | 0 burbujas y 0 paneles; catálogo con sus 20 tarjetas |
| E-2 | n8n caído | turno de error en español + botón Reintentar, que después funciona |
| E-4 | Recarga | `conversacion_id` se conserva; la pantalla vuelve al saludo |
| E-5 | Dos pestañas | ids distintos, conversaciones independientes |
| E-6 | Mensaje vacío | botón de enviar deshabilitado, sin error ruidoso |
| E-7 | Mensaje >1000 caracteres | no se envía, con mensaje claro |
| E-9 | Cerrar y reabrir | la conversación sigue ahí |
| I-1 | Intactitud de los 7 workflows | **byte a byte idénticos**, mismo `versionId`, `versionCounter`, `updatedAt` y `active` |
| C-1 | `service_role` en el bundle | ausente |
| C-2 | `db/` y `types/database.ts` | sin cambios |
| C-3 | Dependencias | ninguna nueva |
| C-4 | `lint` + `build` | limpios |

### Pendiente

| # | Qué | Por qué |
|---|---|---|
| E-3 | Timeout de 45 s | Requiere provocar una demora larga del lado de n8n |
| V-3.3 | Sesión vencida a mitad de conversación | Falta correrla contra el criterio **revisado** (reinicia, no continúa). La desviación de AC-3.4 quedó confirmada el 2026-08-03, así que ya no hay decisión pendiente: solo la verificación |

Hechas desde que se escribió esta tabla: **I-2** e **I-3** las verificó Fernando por
WhatsApp el 2026-08-03 (la evidencia es suya, no se midió desde la sesión); **T035**
—deploy y Build Variable— quedó registrado más arriba; **T036** se midió el 2026-08-03 y
tiene su propia sección.

**Nota sobre el límite de uso**: E-8 se verificó bajando el tope a 2 temporalmente, porque
comprobar el tope real habría costado 30 llamadas al modelo. Se restauró a 30 y se reseteó
el contador de `staticData`, que había quedado con ~90 registros de la IP de desarrollo y
habría dejado el endpoint bloqueado una hora.
