# Contrato — Interfaz del chat

**Feature**: 003-chat-web-catalogo

## Dónde vive

| Ruta | Chat |
|---|---|
| `/` (catálogo) | Sí |
| `/publicacion/:id` (detalle) | Sí |
| `/ingresar` | No |
| `/mi-area` y todas las rutas protegidas | No |
| `*` (404) | No |

Se monta en las dos páginas públicas donde el visitante está buscando algo. En el área de
miembro no aporta: quien está ahí administra lo suyo, no busca ofertas ajenas. Montarlo en
`App.tsx` lo pondría en todas las rutas, incluida la de acceso, que sería ruido.

**Si `VITE_N8N_CHAT_URL` no está definida, el chat no se monta** y las páginas funcionan
igual. A diferencia de `src/lib/supabase.ts`, no se lanza: sin Supabase la app no tiene
nada que mostrar, sin chat tiene todo menos el chat (R-12, FR-025).

## Componentes

### `ChatWidget.tsx`

Contiene la burbuja, el panel, la lista de mensajes y el campo de entrada. Es el único
componente con estado.

**Estados visuales**:

| Estado | Qué se ve |
|---|---|
| Cerrado | Burbuja flotante abajo a la derecha, con etiqueta accesible |
| Abierto vacío | Panel con un saludo del asistente y una sugerencia de qué preguntar |
| Conversando | Lista de turnos, el del visitante alineado a un lado y el del asistente al otro |
| Esperando | Indicador de "escribiendo…" y campo deshabilitado (FR-027) |
| Error de turno | El turno del asistente muestra el mensaje de error y un botón de reintentar |

**Comportamiento**:

- El mensaje del visitante se agrega de forma optimista y el campo se limpia al enviar.
- La lista hace scroll al último turno cuando llega una respuesta.
- Cerrar y reabrir el panel **conserva la conversación** (FR-029): el estado vive en el
  componente, que no se desmonta al cerrar; solo se oculta.
- `Enter` envía, `Shift+Enter` hace salto de línea.
- El panel se puede cerrar con `Escape`.

**Validación del campo** (antes de enviar):

| Caso | Qué pasa |
|---|---|
| Vacío o solo espacios | No se envía, sin mensaje de error: el botón queda deshabilitado |
| Más de 1000 caracteres | No se envía, con mensaje: "El mensaje es muy largo. Contame más corto." |

**Doble envío**: `disabled={isPending}` no alcanza —quedó medido en la feature 002 que dos
clicks en el mismo tick pasan igual—. Acá el riesgo es menor porque el campo se limpia de
forma optimista y el segundo envío saldría vacío, que ya está bloqueado. Si aun así se
observara duplicación en las pruebas, se agrega el guard con `useRef` del patrón de
`PublicacionFormPage`.

### `ChatResultado.tsx`

Tarjeta de un resultado. Sin estado.

Muestra: empresa, etiqueta legible del tipo de publicación, rubro y subrubro, zona,
descripción comercial, urgencia, imagen si la hay, y un enlace **"Ver publicación"** a
`/publicacion/:id`.

- Las etiquetas legibles salen de `src/lib/i18n.ts`, las mismas que usa el catálogo.
- La imagen usa `ImagenPublicacion`, el mismo componente del catálogo, con su fallback.
- **No muestra `texto_whatsapp`** aunque llegue en la respuesta: es texto para pegar en un
  grupo de WhatsApp, no para una tarjeta web.
- **No muestra ningún dato de contacto.** El tipo de TypeScript no declara `telefono`, así
  que ni siquiera es posible por accidente.

## Hook y helper

### `useChat.ts`

Encapsula el estado de la conversación y el envío.

Expone: `mensajes`, `enviar(texto)`, `enviando`, `reintentar()`.

- El `conversacion_id` se lee de `sessionStorage`; si no existe, se genera con
  `crypto.randomUUID()` y se guarda.
- El envío usa `useMutation` de TanStack Query: aporta `isPending` para el indicador y el
  manejo de error, sin escribir esa maquinaria a mano. Es el mismo patrón de
  `useEnviarConsulta`.
- **La conversación no se cachea en el `QueryClient`**: es un log que crece por append, no
  un recurso con invalidación (R-11).
- El token se toma de `useAuth().session?.access_token` en el momento del envío, no al
  montar: así una sesión que aparece o vence a mitad de conversación se refleja sola.

### `chatApi.ts`

La llamada `fetch` al webhook, con:

- `AbortController` con timeout de 45 s (R-12).
- Header `Authorization` solo si hay token.
- Los tipos `RespuestaChat` y `ResultadoChat`. **`ResultadoChat` no declara `telefono`.**
- Cualquier fallo (red, timeout, cuerpo ilegible) se traduce a un turno de error del
  asistente. Nunca lanza al componente.

## Accesibilidad

Esfuerzo razonable, como el resto del proyecto:

- La burbuja tiene `aria-label` y el panel `role="dialog"` con `aria-label`.
- La lista de mensajes es una región con `aria-live="polite"`, para que un lector de
  pantalla anuncie la respuesta cuando llega.
- El campo tiene `label` explícito, aunque esté visualmente oculto.
- Foco al campo al abrir el panel, y de vuelta a la burbuja al cerrarlo.
- Contraste AA en los dos tipos de burbuja de mensaje.

## Responsive

| Ancho | Comportamiento |
|---|---|
| 375 px | El panel ocupa casi toda la pantalla. No tapa la barra de navegación ni deja el campo bajo el teclado virtual |
| 768 px | Panel flotante de ancho fijo, anclado abajo a la derecha |
| 1440 px | Igual que 768, sin estirarse |

En todos los anchos, el catálogo por debajo sigue siendo usable con el chat cerrado, y la
burbuja no tapa controles del catálogo.

## Idioma

Todo en español rioplatense: microcopy, mensajes de error, etiquetas accesibles y el saludo
inicial. Los mensajes de error del asistente los define el workflow (ver el contrato del
endpoint) para que la voz sea la misma venga de donde venga.
