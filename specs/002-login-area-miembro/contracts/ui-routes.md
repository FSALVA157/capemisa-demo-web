# Contract — Rutas y pantallas

**Feature**: 002-login-area-miembro

Las rutas del catálogo público (`/`, `/publicacion/:id`) **no cambian** (FR-024). Esta feature agrega la pantalla de acceso y el área de miembro.

---

## Mapa de rutas

| Ruta | Pantalla | Acceso | Historia |
|---|---|---|---|
| `/` | Catálogo público | público | 001 (sin cambios) |
| `/publicacion/:id` | Detalle público | público | 001 (sin cambios) |
| `/ingresar` | Inicio de sesión | público, redirige si ya hay sesión | US1 |
| `/mi-area` | Listado de mis publicaciones | **protegida** | US1 |
| `/mi-area/publicacion/:id` | Detalle propio + interesados | **protegida** | US2 |
| `/mi-area/nueva` | Crear publicación | **protegida** | US3 |
| `/mi-area/publicacion/:id/editar` | Editar publicación | **protegida** | US4 |
| `*` | No encontrado | público | 001 (sin cambios) |

Las rutas protegidas se envuelven con la ruta protegida de R-03. Sin sesión, redirigen a `/ingresar` conservando el destino.

---

## `/ingresar` — Inicio de sesión

**Contenido**: formulario con email y contraseña, botón de envío, y un enlace para volver al catálogo.

**No incluye** (FR-002 y Assumptions): enlace de registro, recuperación de contraseña, ni acceso con proveedores externos. Si algo de eso aparece en pantalla, la demo promete algo que no existe.

**Estados**:

| Estado | Comportamiento |
|---|---|
| Inicial | Campos vacíos, botón habilitado |
| Enviando | Botón deshabilitado con indicador de progreso; evita doble envío |
| Credenciales inválidas | Mensaje genérico, sin distinguir si falló el email o la contraseña (FR-005). Los campos conservan lo cargado excepto la contraseña |
| Error de red | Mensaje distinto al de credenciales, con opción de reintentar |
| Éxito | Redirige al destino guardado, o a `/mi-area` si no había |
| Ya hay sesión | Redirige a `/mi-area` sin mostrar el formulario |

---

## `/mi-area` — Mis publicaciones

**Contenido**: encabezado con la empresa de la sesión activa y acción de cerrar sesión (FR-004, FR-006); acción de crear publicación; listado de publicaciones propias.

**Cada elemento del listado muestra**: tipo, descripción resumida, **estado en lenguaje comprensible** (FR-011), cantidad de interesados (FR-012), fecha de creación, y acción de editar **solo si** el estado lo permite (ver cuadro de estados en `data-model.md`).

**Etiquetas de estado** — no mostrar el identificador técnico:

| Estado | Etiqueta sugerida |
|---|---|
| `pendiente` | Pendiente de revisión |
| `faltan_datos` | Faltan datos |
| `aprobada` | Aprobada, por publicarse |
| `publicada` | Publicada |
| `rechazada` | Rechazada |

**Estados de pantalla**:

| Estado | Comportamiento |
|---|---|
| Cargando | Esqueletos, no pantalla en blanco |
| Sin publicaciones | Estado vacío que invita a crear la primera (FR-014, escenario 5 de US1) |
| Error | Aviso con opción de reintentar |
| Sesión resolviéndose | Esqueleto, **no** redirección — evita el destello descripto en R-03 |

---

## `/mi-area/publicacion/:id` — Detalle propio e interesados

**Contenido**: ficha de la publicación propia con todos sus datos y su estado; debajo, la lista de solicitudes de contacto recibidas.

**Cada solicitud muestra** (FR-013): empresa interesada, persona de contacto, teléfono, email, motivo, urgencia y fecha. Los tres campos opcionales pueden faltar: mostrar una indicación de "no lo dejó" en lugar de un espacio vacío ambiguo.

**Estados**:

| Estado | Comportamiento |
|---|---|
| Sin interesados | Estado vacío explícito (FR-014) |
| Publicación ajena o inexistente | Mismo resultado en ambos casos: no encontrada, sin revelar que existe (edge case de la spec) |
| Estado no editable | La acción de editar no se ofrece, con una línea que explica por qué (FR-020) |

---

## `/mi-area/nueva` y `/mi-area/publicacion/:id/editar` — Formulario

Ambas rutas usan el mismo formulario; cambia el origen de los valores iniciales y la operación de guardado.

**Campos**: tipo de publicación (obligatorio), descripción (obligatorio), zona, condición comercial, disponibilidad, vencimiento, imagen.

**Campos que NO se piden** (FR-018): empresa, responsable, teléfono, email — se toman del perfil. Conviene mostrarlos como información fija, para que el miembro vea con qué datos se va a publicar.

**Campos que NO se ofrecen**: rubro, subrubro, descripción comercial, texto de WhatsApp, urgencia y coincidencias. Son de generación asistida y curación de CAPEMISA; ofrecerlos al miembro contradice el Principio II.

**Estados**:

| Estado | Comportamiento |
|---|---|
| Validación fallida | Señala qué corregir antes de permitir enviar (FR-021) |
| Enviando | Botón deshabilitado; evita doble envío y publicaciones duplicadas |
| Éxito al crear | Confirmación que dice **enviada para revisión**, no "publicada" (FR-017, FR-023a), y redirige al listado |
| Éxito al editar | Confirmación de cambios guardados |
| Sesión expirada | **Conserva lo cargado**, informa, ofrece reautenticarse (R-08) |
| Edición no permitida por estado | No se llega por interfaz; si se llega por dirección directa, mensaje explicativo |

---

## Navegación

La barra superior existente suma:

- Sin sesión: enlace a `/ingresar`.
- Con sesión: nombre de la empresa, enlace a `/mi-area`, acción de cerrar sesión.

Cerrar sesión redirige a `/` y limpia los datos en memoria del área de miembro, para que no queden visibles al volver atrás en el navegador.

**El catálogo público se ve igual con sesión y sin sesión** (FR-026). La única diferencia visible es la barra de navegación.
