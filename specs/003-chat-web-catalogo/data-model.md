# Data Model — Chat web del catálogo

**Feature**: 003-chat-web-catalogo
**Fecha**: 2026-08-01

## Cambios en la base de datos

**Ninguno.** Esta feature no crea ni modifica tablas, vistas, políticas, funciones ni
índices. `db/*.sql` queda igual y `src/types/database.ts` no se toca.

Es una consecuencia del diseño, no una casualidad: el chat **lee** publicaciones a través
de un workflow que ya las leía y **escribe** en `consultas` a través de un workflow que ya
escribía ahí. Es un canal de entrada nuevo hacia operaciones existentes.

---

## Entidades efímeras (viven en el cliente)

Ninguna se persiste en base. Existen mientras dure la pestaña.

### Conversación

Intercambio entre un visitante y el asistente dentro de una pestaña del navegador.

| Campo | Tipo | Origen | Notas |
|---|---|---|---|
| `id` | `string` (uuid) | `crypto.randomUUID()` en el cliente | Se guarda en `sessionStorage`. Es lo único que sobrevive a una recarga |
| `mensajes` | `Mensaje[]` | estado del componente | Se pierde al recargar; la memoria del lado de n8n sí sobrevive, así que el asistente conserva contexto aunque la pantalla quede vacía |
| `abierto` | `boolean` | estado del componente | Panel desplegado o burbuja cerrada |

**Reglas**:

- El `id` se genera una sola vez por pestaña y se reutiliza en todos los envíos.
- `sessionStorage` es por pestaña, así que dos pestañas tienen conversaciones
  independientes sin lógica adicional (FR-008, caso de borde "dos pestañas").
- El `id` viaja al workflow y se usa como `sessionKey = web:{id}` en la memoria del
  agente. **El prefijo `web:` lo agrega n8n, no el cliente**: así el cliente no puede
  elegir un prefijo que colisione con las claves de WhatsApp.

### Mensaje

Un turno de la conversación.

| Campo | Tipo | Notas |
|---|---|---|
| `id` | `string` | Local, para la key de React |
| `autor` | `"visitante" \| "asistente"` | |
| `texto` | `string` | Para el asistente, el campo `respuesta` de la respuesta del webhook |
| `resultados` | `ResultadoChat[]` opcional | Solo en mensajes del asistente que trajeron búsqueda |
| `error` | `boolean` opcional | Marca un turno que falló y ofrece reintentar |

**Reglas**:

- El mensaje del visitante se agrega **de forma optimista**, antes de la respuesta, para
  que la conversación se sienta inmediata.
- Un mensaje con `error: true` no se manda de nuevo automáticamente: el reintento es una
  acción del visitante (R-12).

### ResultadoChat

Una publicación devuelta por la búsqueda. **Es un espejo de lo que emite el nodo
`Shape resultados` de `capemisa_tool_buscar`**, con un campo deliberadamente ausente.

| Campo | Tipo | Notas |
|---|---|---|
| `id` | `string` (uuid) | Identificador de la publicación. Construye el enlace a `/publicacion/:id` |
| `empresa` | `string` | |
| `rubro` | `string \| null` | Generado por IA, ya curado |
| `subrubro` | `string \| null` | |
| `zona` | `string \| null` | |
| `tipo_publicacion` | `string` | Se muestra con la etiqueta legible de `src/lib/i18n.ts` |
| `descripcion_comercial` | `string \| null` | |
| `texto_whatsapp` | `string \| null` | Llega en la respuesta pero **la interfaz no lo muestra**: es texto pensado para pegar en un grupo de WhatsApp, no para una tarjeta web |
| `urgencia` | `"baja" \| "media" \| "alta" \| null` | |
| `imagen_url` | `string \| null` | Se renderiza con el mismo componente `ImagenPublicacion` del catálogo |
| ~~`telefono`~~ | — | **PROHIBIDO.** No debe aparecer nunca. Ver abajo |

**La ausencia de `telefono` es el punto crítico de la feature.** El nodo
`Shape resultados` lo agrega así:

```js
if (rol !== 'invitado') r.telefono = p.telefono;
```

Como el workflow web pasa `rol: "invitado"` fijo (R-04, FR-034), la rama no se ejecuta
nunca. El tipo de TypeScript **no declara** el campo, de modo que si alguna vez llegara,
la interfaz no podría mostrarlo por accidente. La verificación real es SC-005, que lo
busca en la respuesta cruda, no en la pantalla.

---

## Entidades existentes que la feature toca

### `consultas` (escritura, sin cambios de estructura)

El chat da de alta filas a través de `capemisa_tool_registrar_consulta`, que ya existía.
Ninguna columna cambia.

| Columna | Origen en el chat |
|---|---|
| `publicacion_id` | Id del resultado que el visitante eligió. **Obligatorio** |
| `empresa_interesada` | Lo dice el visitante, o sale de `perfiles.empresa` si hay sesión. **Obligatorio** |
| `persona_contacto` | Lo dice el visitante, o `perfiles.responsable`. **Obligatorio** |
| `telefono` | Lo dice el visitante, o `perfiles.telefono`. **Obligatorio** |
| `email` | Opcional. `perfiles.email` si hay sesión |
| `motivo` | Opcional |
| `urgencia` | Normalizada por el sub-workflow (`normal`→`media`, default `media`) |
| `estado_seguimiento` | Fijo en `'nueva'` por el sub-workflow |
| `created_at` | Default de la base |

**Una consulta registrada desde el chat es indistinguible de una registrada desde el
formulario del catálogo** (FR-013). No hay columna que marque el canal de origen, y no se
agrega: sería un cambio de schema para una necesidad que nadie planteó (Principio V).

Los cuatro campos obligatorios los valida el sub-workflow, que lanza un error con texto
instructivo cuando falta alguno; ese error vuelve al agente como observación y el agente
se los pide al visitante. Esa cadena ya existe y no se replica.

### `perfiles` (lectura, solo con sesión)

Se lee para precargar los datos de contacto (FR-016). Se usan `empresa`, `responsable`,
`telefono` y `email`. La lectura la hace **n8n**, después de verificar el token contra
`/auth/v1/user` y obtener el `id` del usuario. El cliente no manda datos de perfil: si lo
hiciera, serían autodeclarados y sin respaldo (R-03).

### `publicaciones_searchable` (lectura indirecta)

El chat nunca la consulta. La consulta `capemisa_tool_buscar` con `service_role`, dentro de
n8n, filtrando `estado = 'publicada'` en el propio nodo, y recorta los campos antes de
responder. **El navegador no recibe nada de esa vista que no pase por ese recorte.**

---

## Flujo de datos completo

```
navegador                    n8n                              Supabase
─────────                    ───                              ────────
mensaje + conversacion_id
+ Bearer (si hay sesión)  →  límite por IP
                             verificar token           →  GET /auth/v1/user
                             leer perfil (si 200)      →  perfiles
                             Agent
                               └ tool_buscar
                                   (rol: "invitado")   →  publicaciones_searchable
                                                          (service_role, estado=publicada)
                               └ tool_registrar_consulta →  INSERT consultas
                             guardrail
{respuesta, resultados}   ←  Respond to Webhook
```

El navegador solo ve la última línea. Todo lo que corre con `service_role` queda del lado
de n8n, y lo que vuelve está recortado por `Shape resultados` con `rol: "invitado"`.

---

## Lo que esta feature NO agrega

Registrado para que no reaparezca como pregunta:

- **No hay tabla de conversaciones.** El historial no se persiste (FR-008 lo acota a la
  pestaña) y no hay métricas de uso del chat. Sería una feature aparte.
- **No hay columna de canal en `consultas`.** Ver arriba.
- **No hay estado nuevo en `publicaciones`.** El chat solo lee las publicadas.
- **No hay tabla ni clave de rate limiting.** El conteo vive en `staticData` del workflow
  nuevo (R-09).
