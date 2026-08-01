# Contrato — Endpoint del chat

**Feature**: 003-chat-web-catalogo

Contrato entre el frontend y el workflow `capemisa_conversacional_web`. Es la única
interfaz nueva que expone la feature.

## Endpoint

```
POST {VITE_N8N_CHAT_URL}
Content-Type: application/json
Authorization: Bearer <access_token>   ← opcional, solo si hay sesión
```

`VITE_N8N_CHAT_URL` es la URL de producción del webhook de n8n, inlineada en tiempo de
build. **Debe marcarse como Build Variable en Coolify**, no solo como variable de runtime:
las `VITE_*` se resuelven al compilar. Es el mismo error ya cometido con las variables de
Supabase.

## Pedido

```json
{
  "mensaje": "busco alguien que lleve gente a la mina",
  "conversacion_id": "7c3f1e28-9a4b-4d2e-8f10-5b6c7d8e9f00"
}
```

| Campo | Tipo | Obligatorio | Validación |
|---|---|---|---|
| `mensaje` | string | sí | No vacío tras recortar espacios. Máximo 1000 caracteres |
| `conversacion_id` | string (uuid) | sí | Generado por el cliente con `crypto.randomUUID()`, guardado en `sessionStorage` |

**Campos prohibidos en el pedido.** El workflow los ignora si llegan, y no debe existir
código que los lea:

| Campo | Por qué está prohibido |
|---|---|
| `rol`, `perfil`, `es_miembro` | El rol es una constante del lado de n8n (FR-034). Aceptarlo del cliente permitiría pedir los teléfonos de todas las empresas oferentes |
| `autor_id`, `user_id`, `telefono`, `empresa` | La identidad sale de verificar el token, no de lo que el navegador declare (R-03) |
| Cualquier prefijo de sesión | El `web:` de la clave de memoria lo antepone n8n. Si el cliente pudiera elegirlo, podría apuntar a una conversación de WhatsApp |

La validación de `mensaje` se hace en los dos lados: en la interfaz para dar un mensaje
claro al visitante, y en el workflow porque la interfaz no es una barrera.

## Respuesta exitosa (200)

```json
{
  "respuesta": "Encontré dos empresas que hacen traslado de personal a zona de altura.",
  "resultados": [
    {
      "id": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaa01",
      "empresa": "Transportes del Norte SRL",
      "rubro": "Logistica",
      "subrubro": "Transporte 4x4",
      "zona": "Salta / Puna",
      "tipo_publicacion": "oferta_servicio",
      "descripcion_comercial": "Camionetas 4x4 con chofer para operaciones mineras.",
      "texto_whatsapp": "🚙 SERVICIO DISPONIBLE...",
      "urgencia": "media",
      "imagen_url": "https://..."
    }
  ]
}
```

| Campo | Tipo | Notas |
|---|---|---|
| `respuesta` | string | Texto del asistente. Nunca vacío: si el modelo no produjo texto, el workflow devuelve un mensaje de reintento |
| `resultados` | array | Vacío cuando el turno no incluyó búsqueda o no hubo coincidencias. Máximo 5 elementos |

### Campo prohibido en la respuesta

**`telefono` no debe aparecer nunca**, en ningún elemento de `resultados`, para ningún
usuario, con o sin sesión.

Su ausencia depende de un solo literal: el `rol: "invitado"` que el workflow le pasa a
`capemisa_tool_buscar`. El nodo `Shape resultados` de ese sub-workflow hace
`if (rol !== 'invitado') r.telefono = p.telefono;`. Si ese literal se escribiera mal, el
campo aparecería y **el chat seguiría funcionando con normalidad**: la falla es silenciosa.

Por eso el tipo de TypeScript del frontend no declara el campo, y por eso SC-005 lo
verifica sobre la respuesta cruda (`curl` o pestaña de red), no sobre lo que se ve en
pantalla.

Los campos `email` y `responsable` tampoco aparecen: `Shape resultados` no los incluye en
ninguna rama.

## Respuestas de error

Todas devuelven un cuerpo con la misma forma, para que el frontend tenga un solo camino de
manejo:

```json
{ "respuesta": "<mensaje en español para mostrar como turno del asistente>", "resultados": [] }
```

| Situación | Código | `respuesta` |
|---|---|---|
| Límite de uso alcanzado | 200 | "Estás yendo muy rápido. Esperá un momento y volvé a escribirme." |
| `mensaje` vacío o demasiado largo | 200 | "No pude leer tu mensaje. Probá escribirlo de nuevo, más corto." |
| Falla del modelo o de una herramienta | 200 | "Perdón, se me cruzó un cable. ¿Probamos de nuevo?" |
| Guardrail bloqueó la respuesta | 200 | "Perdón, se me cruzó un cable y no pude completar esa acción. Reintentemos en un momento por favor." |

**Se responde 200 incluso en error**, a propósito: el error es contenido de la
conversación, no una falla de transporte. Un 4xx o 5xx obligaría al frontend a inventar el
texto del mensaje de error, y ese texto tiene que estar en español rioplatense y ser
coherente con la voz del asistente.

El frontend sí maneja el caso de que **no llegue nada** (red caída, timeout de 45 s, n8n
apagado): en ese caso arma él mismo un turno de error con opción de reintentar (R-12).

## CORS

El webhook debe aceptar pedidos desde el dominio de la web y desde `localhost` para
desarrollo.

**A verificar al crear el nodo**: que esta versión del nodo Webhook exponga la opción de
orígenes permitidos. Los `typeVersion` de los workflows existentes sugieren una versión
reciente donde existe, pero no se confirmó. Alternativa: devolver los headers a mano desde
`Respond to Webhook`.

CORS es una defensa del navegador, no del endpoint: con `curl` se llama igual. El control
real es el límite de uso, y el hecho de que la respuesta no contenga datos privados.

## Límite de uso

30 mensajes por hora por IP, en ventana deslizante, contados en `staticData` del workflow
nuevo (R-09). Al superarse se responde el mensaje correspondiente **sin invocar al
modelo** — que es el punto: el límite existe para no gastar tokens.

Es aproximado por diseño. Si n8n reinicia, la cuenta se pierde. Para una demo con un solo
contenedor alcanza, y errar por permisivo es el lado correcto del error: un límite que
corta una demostración en vivo sería peor que uno que deja pasar de más.

## Ejemplo de verificación manual

```bash
# Anónimo
curl -s -X POST "$VITE_N8N_CHAT_URL" \
  -H 'Content-Type: application/json' \
  -d '{"mensaje":"busco ropa de trabajo","conversacion_id":"11111111-1111-1111-1111-111111111111"}' | jq

# Verificación de SC-005: el resultado no debe contener datos de contacto
curl -s -X POST "$VITE_N8N_CHAT_URL" \
  -H 'Content-Type: application/json' \
  -d '{"mensaje":"dame el telefono de esa empresa","conversacion_id":"11111111-1111-1111-1111-111111111111"}' \
  | grep -Ei 'telefono|email|responsable|\+549' && echo "FALLA: hay datos de contacto" || echo "OK"

# Con sesión (el access_token sale de la app logueada)
curl -s -X POST "$VITE_N8N_CHAT_URL" \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -d '{"mensaje":"quiero contactar a esa empresa","conversacion_id":"22222222-2222-2222-2222-222222222222"}' | jq
```

El segundo comando es la verificación central de la feature. Debe imprimir `OK`.
