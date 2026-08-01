# Quickstart — Validar Login y área de miembro

**Feature**: 002-login-area-miembro
**Purpose**: receta operativa para verificar a mano que la feature cumple los escenarios de la spec.

Testing manual y visual (Principio V). Esta guía no reemplaza los escenarios del `spec.md`: es cómo ejecutarlos.

---

## Prerequisitos

1. **Cambios de base aplicados**: los 3 pasos de `contracts/db-changes.md`. Ninguno modifica objetos existentes: `publicaciones_publicas` no se toca y el catálogo público no corre riesgo.

2. **Dos cuentas de miembro, no una.** Los seeds actuales traen una sola (`miembro`) más una de administración. **Sin una segunda cuenta de miembro con publicaciones y solicitudes propias, SC-003 no se puede validar** — que es el criterio que prueba que un miembro no ve datos de otro. Crear la segunda cuenta es parte de la preparación, no un extra.

3. **Datos de prueba mínimos**:
   - Miembro A: al menos 3 publicaciones en estados distintos (una `publicada`, una `pendiente`, una `rechazada`), y al menos 2 solicitudes de contacto sobre la publicada.
   - Miembro B: al menos 1 publicación con 1 solicitud.
   - Una publicación sin solicitudes, para el estado vacío.

4. **Aplicación corriendo**, en local o en producción.

---

## Escenarios US1 — Entrar a mi área

| # | Acción | Resultado esperado |
|---|---|---|
| AC-1.1 | Ingresar con credenciales válidas | Llega al área; la barra muestra la empresa de la sesión |
| AC-1.2 | Ingresar con contraseña incorrecta | Mensaje genérico. **Verificar que no distinga** entre email inexistente y contraseña incorrecta |
| AC-1.3 | Ver el listado propio | Aparecen las publicaciones en todos los estados, con etiquetas legibles, no identificadores técnicos |
| AC-1.4 | Cerrar sesión | Vuelve al catálogo; `/mi-area` ya no es accesible; el botón "atrás" del navegador no muestra datos del área |
| AC-1.5 | Entrar con una cuenta sin publicaciones | Estado vacío que invita a crear la primera, no una lista en blanco |
| AC-1.6 | Sin sesión, escribir por dirección directa **las 4 rutas protegidas**: `/mi-area`, `/mi-area/nueva`, `/mi-area/publicacion/:id` y `/mi-area/publicacion/:id/editar` | Las 4 redirigen a la pantalla de acceso, sin destello de contenido ni error técnico |
| AC-1.7 | Recargar `/mi-area` **con** sesión activa | Muestra carga y luego el contenido. **No** debe pasar por la pantalla de acceso ni parpadear |
| AC-1.8 | **Con sesión activa**, navegar el catálogo público (`/` y una ficha de otro miembro) | Se ve **idéntico** a como lo ve un anónimo. No aparece teléfono, email ni responsable del oferente; la única diferencia es la barra de navegación (FR-026) |

AC-1.6 cubre las 4 rutas y no solo una, porque SC-004 exige probar cada pantalla del área.

AC-1.7 no está en la spec: verifica el estado intermedio de R-03, el error más común al implementar rutas protegidas con sesión asincrónica.

AC-1.8 verifica FR-026, una de las tres decisiones de alcance de esta feature. Sin este escenario, esa decisión no la comprueba nadie.

---

## Escenarios US2 — Ver interesados

| # | Acción | Resultado esperado |
|---|---|---|
| AC-2.1 | Abrir una publicación propia con solicitudes | Lista con empresa, persona, teléfono, email, motivo, urgencia y fecha |
| AC-2.2 | Abrir una publicación propia sin solicitudes | Estado vacío explícito |
| AC-2.3 | Ver el listado del área | La cantidad de interesados por publicación coincide con lo que muestra el detalle |
| AC-2.4 | Con sesión de B, abrir por dirección directa una publicación de A | No encontrada. **No** debe distinguirse de una publicación inexistente |
| AC-2.5 | Solicitud sin email, motivo ni urgencia | Se ve bien; indica que el interesado no los dejó, sin huecos ambiguos |

---

## Escenarios US3 — Crear publicación

| # | Acción | Resultado esperado |
|---|---|---|
| AC-3.1 | Crear una publicación completa | Confirmación que dice **enviada para revisión**, no "publicada" |
| AC-3.2 | Buscar esa publicación en el catálogo público | **No aparece** |
| AC-3.3 | Volver al área | Aparece como pendiente de revisión |
| AC-3.4 | Enviar con campos obligatorios vacíos | Señala qué corregir; no envía |
| AC-3.5 | Revisar los datos de contacto de la publicación creada | Coinciden con el perfil; no se pidieron en el formulario |
| AC-3.6 | Enviar dos veces seguidas rápido | Se crea **una** sola publicación |

---

## Escenarios US4 — Editar

| # | Acción | Resultado esperado |
|---|---|---|
| AC-4.1 | Editar una publicación en estado pendiente | Los cambios persisten tras recargar |
| AC-4.2 | Abrir una publicación publicada | **No** se ofrece editar, y se explica por qué |
| AC-4.3 | Llegar por dirección directa al formulario de edición de una publicación publicada | Mensaje explicativo. **Si se fuerza el guardado, no debe confirmar un cambio que no ocurrió** |

AC-4.3 es la trampa principal de la feature: con RLS, una actualización no permitida **no da error**, simplemente no afecta filas. Verificar explícitamente que la interfaz no muestre un mensaje de éxito.

---

## Escenarios edge

- **Sesión expirada con formulario a medio llenar**: invalidar la sesión desde otra pestaña y guardar. Debe conservar lo cargado e informar; no descartar ni redirigir de golpe.
- **Dos pestañas abiertas**: cerrar sesión en una. La otra no debe seguir mostrando datos del área.
- **Cuenta de administración**: entrar al área con ella. No debe romperse, aunque las funciones de administración no existan acá.
- **Publicación rechazada**: aparece en el listado con su estado, no oculta.

---

## Verificación de compliance con la constitución

> **Cómo leer esta sección.** En la feature 001 el check del Principio IV estaba redactado sobre lo
> que hacía la interfaz, daba verde, y había un agujero real debajo. Acá los controles de acceso se
> verifican **contra la API con las credenciales que la aplicación web tiene**, nunca mirando la
> pantalla ni las herramientas de desarrollo del navegador.

### Principio II (human gate)

Crear una publicación desde la web y confirmar que no aparece en el catálogo público hasta que una persona la pase a `publicada` a mano. Verificar además que la interfaz **nunca** dice "publicada" al confirmar la creación.

### Principio IV (RLS y secretos) — la parte crítica

Correr las **7 verificaciones de `contracts/db-changes.md`**, sección "Verificación posterior". Requieren tokens de sesión de dos miembros distintos, obtenibles autenticándose contra la API.

Las de mayor riesgo, que no deben omitirse:

| # | Qué prueba | Por qué importa |
|---|---|---|
| 2 | El miembro A ve **solo** lo suyo en `mis_publicaciones` | Si el filtro por autor falta, la respuesta incluye todas las publicadas de otros con sus teléfonos, y **parece que funciona**. Contar filas y verificar autoría |
| 3 y 5 | El miembro B no ve nada de A | Es SC-003. **Necesita la segunda cuenta**; sin ella este control no se puede correr |
| 7 | El catálogo se ve igual con sesión y sin sesión | Es FR-026, verificado también desde la interfaz en AC-1.8 |

Verificar también que el `service_role` no aparece en el bundle publicado.

**Registrar el estado conocido, no verificarlo como correcto**: las dos vías abiertas a propósito (tabla base y `publicaciones_searchable`, ambas legibles con la anon key) siguen abiertas por decisión registrada en FR-026b. Anotarlas en cada corrida para que nadie las lea como resueltas.

### Principio V (YAGNI)

Confirmar que no se agregó nada fuera de la spec: sin panel de administración, sin registro público, sin recuperación de contraseña, sin gestión del estado de seguimiento de las solicitudes, sin baja de publicaciones.

---

## Cierre

La feature está lista para desplegar cuando pasan todos los escenarios AC-*, los edge cases, y **las 7 verificaciones de base**. Los puntos 2, 3 y 5 son innegociables: son la única prueba de que un miembro no ve datos de otro.

---

# Registro de validación

## T008 — 7 verificaciones de base (2026-07-31)

Corridas **contra la API REST** con la anon key más un token de sesión por cuenta (`miembro@capemisa.com` = A, `miembro.b@capemisa.com` = B). No se usó el MCP ni psql para verificar: esa conexión saltea el RLS y no probaría nada. El MCP se usó solo para obtener los conteos de control con los que se contrastaron las respuestas de la API.

| # | Verificación | Resultado | Evidencia |
|---|---|---|---|
| 1 | `mis_publicaciones` sin sesión | ✅ | `[]` |
| 2 | `mis_publicaciones` con token de A | ✅ | 19 filas, **exactamente** las 19 que la base tiene con `autor_id = A` (total de la tabla: 26). Ninguna ajena, ni siquiera la de B, que está `publicada` y aparecería si faltara el `WHERE autor_id`. Estados presentes: `publicada`, `pendiente`, `rechazada`, `faltan_datos` |
| 3 | `mis_publicaciones` con token de B | ✅ | 1 fila (`bbbb…bb01`), la única con `autor_id = B`. Intersección de ids A ∩ B = 0 |
| 4 | `consultas` con token de A | ✅ | 4 filas, todas sobre publicaciones de A |
| 5 | `consultas` con token de B | ✅ | 1 fila, sobre la publicación de B. Intersección A ∩ B = 0; ninguna solicitud de A visible para B |
| 6 | `consultas` sin sesión | ✅ | `[]` |
| 7 | Catálogo público con sesión y sin sesión | ⚠️ ver abajo | Idéntico tal como lo consulta la aplicación; **no** idéntico a nivel de la vista cruda |

Columnas que devuelve `mis_publicaciones`: sin `observaciones_internas`, `autor_id`, `matches` ni `texto_whatsapp`, como especifica el paso 1 del contrato.

### Observación del punto 7 — la vista pública no es neutra a la sesión

`publicaciones_publicas` consultada **sin filtro** devuelve 20 filas para `anon` y **26 para el miembro A**, incluidas 4 `pendiente`, 1 `rechazada` y 1 `faltan_datos`.

Causa: la vista es `security_invoker` y las políticas de `publicaciones` se combinan con **OR**. `publicaciones_select_propia` (`autor_id = auth.uid()`, preexistente de la feature 001) le suma al autor autenticado sus propias filas no publicadas.

**No es una fuga entre miembros**: cada uno ve de más únicamente lo suyo, que ya puede ver por `mis_publicaciones`, y la vista no expone `telefono`, `email` ni `responsable`. Tampoco llega a la pantalla: `usePublicaciones.ts` y `usePublicacion.ts` filtran `.eq('estado','publicada')`, y con ese filtro las respuestas de `anon` y de A son **byte a byte idénticas** (20 filas cada una) — FR-026 se cumple en la aplicación. Es exactamente el caso que justifica el patrón de defensa en profundidad de la feature 001: si alguien quita ese `.eq()` por considerarlo redundante con el RLS, el miembro autenticado empieza a ver sus borradores en el catálogo.

Queda pendiente confirmarlo **en el navegador** (AC-1.8) cuando exista la interfaz de sesión, que es como el contrato enuncia el punto 7.

### AC-1.8 en el navegador — cierra el pendiente del punto 7

Verificado el 2026-07-31 junto con T021: con sesión de A y en un contexto anónimo limpio, `/` devuelve **20 tarjetas en los dos casos**, con el mismo texto, y la ficha de una publicación **de otro miembro** (la de B) se ve igual en ambos. Sin `telefono`, `email` ni `responsable` en ninguna de las dos. La única diferencia es la barra de navegación. FR-026 cumplido también desde la interfaz.

### Estado conocido — NO verificado como correcto (FR-026b)

Las dos vías siguen abiertas por decisión explícita, sin cambios respecto del 2026-07-30:

- Tabla base `publicaciones` con la anon key pidiendo `telefono`, `email`, `responsable` → **devuelve datos**.
- `publicaciones_searchable` con la anon key → **devuelve datos**, incluidas filas no publicadas.

### Incidente resuelto durante esta corrida — login caído para todas las cuentas

El primer intento de obtener tokens falló con HTTP 500 (`unexpected_failure`). El log de auth: `error finding user: sql: Scan error on column index 3, name "confirmation_token": converting NULL to string is unsupported`.

Los seeds insertan en `auth.users` sin las columnas de token, que quedan en `NULL`; GoTrue las lee como `string` y falla. Afectaba a **las 5 cuentas de la base**, no solo a las de esta feature: el login por contraseña estaba inutilizable de punta a punta. Se corrigió con un `UPDATE` que pone cadena vacía en las 8 columnas de token, autorizado por Fernando y aplicado por MCP. Los archivos `db/02_seeds.sql` y `db/06_seeds_miembro_b.sql` quedan pendientes de ajuste para que un re-run no reintroduzca el problema.

<!-- Anotar acá los resultados de cada corrida, con fecha, como se hizo en la feature 001. -->

---

## T021 — Validación manual US1 (2026-07-31)

Corrida en `npm run dev` (localhost:5173) contra la base real, con navegador controlado. Cada cuenta en un contexto limpio para que no se mezclen sesiones.

| # | Resultado | Evidencia |
|---|---|---|
| AC-1.1 | ✅ | Con `miembro@capemisa.com` llega a `/mi-area`; la barra muestra "Proveedor Minero", que es la empresa real de ese perfil (los seeds versionados decían "Servicios Andinos SRL": el perfil se editó fuera de ellos) |
| AC-1.2 | ✅ | Contraseña incorrecta y email inexistente devuelven **el mismo texto**: "No pudimos ingresar / El email o la contraseña no son correctos." El email cargado se conserva, la contraseña se limpia |
| AC-1.3 | ✅ | 19 publicaciones, con `Pendiente de revisión`, `Faltan datos`, `Rechazada` y `Publicada`. Cero identificadores técnicos en el texto de la página (se buscaron los 5 de tipo y los 5 de estado) |
| AC-1.4 | ✅ **tras corregir** | Ver abajo |
| AC-1.5 | ✅ | Con `admin@capemisa.com` (0 publicaciones propias): "Todavía no publicaste nada" + acción de crear la primera, no una lista en blanco |
| AC-1.6 | ✅ **completado el 2026-07-31, tras US4** | Cuando se corrió por primera vez solo existía `/mi-area`. Repetido con las 4 rutas ya en el router: las 4 redirigen a `/ingresar`, ninguna muestra contenido del área en ningún frame (instrumentado antes del mount) y ninguna deja texto técnico en pantalla |
| AC-1.7 | ✅ | Instrumentado antes de que React monte, muestreando cada frame: la ruta nunca deja de ser `/mi-area`, el formulario de acceso **no aparece en ningún frame**, y sí aparece el esqueleto de carga antes de las 19 filas |
| AC-1.8 | ✅ | Detallado más arriba, en la sección de FR-026 |

**Control extra de aislamiento**: con `miembro.b@capemisa.com` el listado muestra **1 sola publicación**, la suya, y la barra su empresa. Coincide con lo verificado por API en T008.

### Defecto encontrado y corregido — cerrar sesión terminaba en `/ingresar`

El primer intento de AC-1.4 dejaba al usuario en la pantalla de acceso en vez del catálogo. Causa: `Navbar` cerraba la sesión y **después** navegaba; estando en una ruta protegida, en cuanto la sesión pasa a `null` `RutaProtegida` redirige a `/ingresar`, y lo hace antes de que el `navigate` llegue a ejecutarse. Se corrigió invirtiendo el orden — navegar primero, cerrar sesión después — con el comentario correspondiente en `Navbar.tsx`.

Reverificado: cerrar sesión deja en `/` con la barra anónima; el botón "atrás" sobre la entrada `/mi-area` **no muestra ninguna fila del área** en ningún momento y termina en `/ingresar`; y `/mi-area` por dirección directa redirige a `/ingresar`.

### Métricas

- **SC-001** (catálogo → listado propio, objetivo < 30 s): **1,3 s** en el recorrido automatizado, sin tiempo de tipeo humano. Sirve para descartar que la aplicación sea el cuello de botella; el número con una persona real todavía no se tomó.
- **SC-009** (alguien ajeno interpreta un listado con 3 estados distintos): **pendiente**, requiere una persona.

---

## T027 — Validación manual US2 (2026-07-31)

Mismo método que T021: navegador controlado contra la base real, cada cuenta en un contexto limpio.

| # | Resultado | Evidencia |
|---|---|---|
| AC-2.1 | ✅ | `aaaa…aa01` muestra sus 3 consultas con empresa, persona, teléfono, email, motivo, urgencia y fecha |
| AC-2.2 | ✅ | `aaaa…aa10` (sin consultas): "Todavía nadie dejó una consulta" con la explicación de cuándo van a aparecer, no una lista vacía |
| AC-2.3 | ✅ | El listado dice "3 interesados" para `aaaa…aa01` y el detalle muestra exactamente 3 tarjetas |
| AC-2.4 | ✅ | Con sesión de B, la publicación de A y un id inexistente (`9999…`) devuelven **el mismo texto, carácter por carácter**: "Publicación no disponible / Puede que ya no esté publicada o que la dirección no sea válida." Nada revela que `aaaa…aa01` exista. En la misma sesión, su publicación propia sí carga |
| AC-2.5 | ✅ | La consulta de "Transportes del Valle" (sin email, motivo ni urgencia) se ve con "No dejó email", "No dejó un motivo" y "Sin urgencia indicada" — texto explícito, sin huecos |

**FR-020 de paso**: en `aaaa…aa01` (publicada) no se ofrece editar y se explica por qué; en `aaaa…aa10` (pendiente) sí se ofrece.

AC-2.4 es el control central de la feature y se apoya en dos barreras independientes: `mis_publicaciones` no devuelve la fila (verificado en T008) y `consultas_select_autor` no devuelve sus consultas. La pantalla no distingue los casos, así que tampoco filtra por diferencia de mensajes.

---

## T033 — Validación manual US3 (2026-07-31)

| # | Resultado | Evidencia |
|---|---|---|
| AC-3.1 | ✅ | "Enviamos tu publicación para revisión / El equipo de CAPEMISA la revisa antes de mostrarla en el catálogo." Se verificó por búsqueda de texto que **la palabra "publicada" no aparece** en la confirmación, y que no se promete plazo |
| AC-3.2 | ✅ | Buscando su texto distintivo en el catálogo: "No hay publicaciones que coincidan", **igual con sesión y en anónimo**. El human gate se cumple |
| AC-3.3 | ✅ | Aparece primera en el área con la etiqueta "Pendiente de revisión" y la acción de editar disponible |
| AC-3.4 | ✅ | Enviar con la descripción vacía no navega y muestra "Contá de qué se trata (mínimo 10 caracteres)" |
| AC-3.5 | ✅ | La fila creada quedó con `empresa`, `responsable`, `telefono` y `email` idénticos al perfil, y `estado = 'pendiente'` puesto por la base. El formulario **no pide** ninguno de esos cuatro campos: sus únicos controles son tipo, descripción, zona, condición comercial, disponibilidad, vencimiento e imagen |
| AC-3.6 | ✅ **tras corregir** | Ver abajo |

**SC-007** (carga completa sin ayuda, objetivo < 3 min): **1,1 s** en el recorrido automatizado, sin tiempo de tipeo humano. Falta el número con una persona real.

### Defecto encontrado y corregido — el doble envío sí duplicaba

`disabled={isPending}` **no alcanza** para AC-3.6. Tres clicks emitidos en el mismo tick ocurren antes de que React repinte el botón, así que los tres pasan: la prueba creó **3 publicaciones idénticas** (ids `6c8d0337`, `a24c36da`, `92912358`, con 5 ms de diferencia entre ellas).

Se agregó un guard imperativo con `useRef` en `PublicacionFormPage`, que no depende del ciclo de render y se libera solo si el envío falla. Reverificado con **5 clicks en el mismo tick → 1 sola publicación**.

Vale para cualquier formulario de escritura que se agregue después: el botón deshabilitado es señal para el usuario, no un control de concurrencia.

### Defecto menor corregido — el perfil en carga se leía como error

Entrando por dirección directa a `/mi-area/nueva`, la ficha de datos de contacto mostraba "No pudimos cargar tus datos de contacto" durante los ~600 ms que tarda el perfil. Ahora muestra esqueletos mientras carga y el envío queda bloqueado hasta tener el perfil; el mensaje de error queda reservado para el caso real de perfil faltante.

### Filas de prueba que quedaron en la base

5 publicaciones en `estado = 'pendiente'` con "PRUEBA T033" en la descripción: `0ccb2fbc`, `6c8d0337`, `a24c36da`, `92912358`, `d4d8d22e`. No se ven en el catálogo público por estar pendientes. **Falta borrarlas** cuando se decida.

---

## T038 — Validación manual US4 (2026-07-31)

| # | Resultado | Evidencia |
|---|---|---|
| AC-4.1 | ✅ | Editar una publicación `pendiente`: el formulario abre con los valores actuales, guarda con "Guardamos los cambios", vuelve al detalle y el cambio **persiste tras recargar** (verificado también en la base) |
| AC-4.2 | ✅ | En una publicación `publicada` no hay ninguna acción de editar, y se explica: "Está publicada en el catálogo y no se puede editar desde acá. Si necesitás cambiar algo, escribinos." |
| AC-4.3 | ✅ | Ver abajo, en sus dos partes |

### AC-4.3 — la verificación crítica

**Parte 1, por dirección directa**: entrando a `/mi-area/publicacion/<id publicada>/editar` no se renderiza ningún formulario, solo el mensaje explicativo. No hay nada que forzar desde la interfaz.

**Parte 2, el caso que de verdad importa** — el estado cambia **con el formulario ya abierto**, que es como pasa en la realidad cuando un admin revisa mientras el miembro edita:

1. Con sesión de A, se abrió el formulario de edición de una publicación `pendiente` y se modificó la zona.
2. Sin cerrar el formulario, esa fila se pasó a `publicada` en la base (simulando la revisión).
3. Se apretó Guardar.

Resultado: mensaje de **error** —"No pudimos guardar los cambios / La publicación ya no está en un estado que permita editarla"—, la pantalla **no navega**, conserva lo cargado, y en la base la `zona` **sigue en null**: no se guardó nada y tampoco se confirmó nada.

Sin el chequeo de filas afectadas esto habría mostrado un mensaje de éxito: PostgREST devolvió **HTTP 204 sin error** en los tres casos probados por API, y solo el conteo los distingue:

| Caso | Respuesta | Filas |
|---|---|---|
| Propia y `pendiente` | 204 | `content-range: 0-0/1` |
| Propia y `publicada` | 204 | `content-range: */0` |
| De otro miembro | 204 | `content-range: */0` |

Se usa `count: 'exact'` con escritura mínima, que da el conteo **sin pedir que vuelvan los datos**, así que sigue cumpliendo R-06 y no va a romperse cuando se cierre R-01.

**Nota operativa**: durante el paso 2 la fila de prueba quedó unos minutos en `publicada` y por lo tanto visible en el catálogo público. Se revirtió a `pendiente` al terminar.

---

## Fase 7 — Polish y transversales (2026-07-31)

### T039 — Sesión expirada durante un formulario (R-08)

Simulado corrompiendo el token en el almacenamiento del navegador con el formulario cargado —el caso de la pestaña abierta desde ayer— y apretando Guardar:

- **No redirige** y **no descarta nada**: descripción y zona quedaron intactas, carácter por carácter.
- Aparece un diálogo para volver a ingresar sin salir de la pantalla, con el email precargado, más un aviso persistente por si se cierra el diálogo.
- Tras reingresar, el formulario sigue completo y el mismo botón guarda bien: la publicación se creó.

**Defecto corregido durante la prueba**: el diálogo abría con el email vacío. `defaultValues` se evalúa al montar el componente —que ocurre junto con la pantalla, cuando el perfil todavía no llegó—, así que ahora el email se completa al **abrir** el diálogo.

### T040 — Responsive

Medido en 375, 768 y 1440 px sobre las 5 pantallas del área (`/ingresar`, `/mi-area`, detalle propio, alta y edición): **cero scroll horizontal** en las 15 combinaciones, y ningún elemento que exceda el ancho del documento.

### T041 — Escenarios edge

| Escenario | Resultado |
|---|---|
| Dos pestañas, se cierra sesión en una | La otra deja de mostrar el área: pasa a `/ingresar`, 0 filas, barra anónima. Antes tenía las 19 |
| Cuenta de administración en el área | Entra sin romperse: estado vacío (no tiene publicaciones propias), su empresa en la barra, **0 errores de JavaScript** |
| Publicación rechazada | Visible en el listado con su etiqueta "Rechazada", y sin ofrecer editar |
| Solicitud sin email, motivo ni urgencia | Cubierto en AC-2.5, con las tres indicaciones explícitas |

### T042 — Compliance con la constitución

- **Principio II (human gate)**: cubierto por AC-3.1/AC-3.2 — lo creado entra en `pendiente`, no aparece en el catálogo, y la confirmación nunca dice "publicada".
- **Principio IV (RLS y secretos)**: las **7 verificaciones de T008 se recorrieron de nuevo** al terminar toda la implementación y dan lo mismo. Sobre el bundle compilado: ninguna coincidencia de `service_role`, y el único JWT presente decodifica a `{"role":"anon"}`. Las dos vías de FR-026b siguen abiertas, sin cambios y **sin contarse como verificadas**.
- **Principio V (YAGNI)**: no hay `signUp` ni recuperación de contraseña en el código, `estado_seguimiento` no se selecciona en ninguna consulta, no hay ni un `.delete()`, ninguna escritura fija `estado`, y el router tiene exactamente las 7 rutas del contrato.

### T043 — El flujo de n8n

`capemisa_tool_buscar` consulta `publicaciones_searchable` filtrando `estado = 'publicada'` con la credencial de `service_role`. Ninguno de los tres objetos que agregó esta feature la toca.

Verificado contra la base: **las 13 columnas** que usan `Prepare prompt` y `Shape resultados` (`id`, `empresa`, `rubro`, `subrubro`, `zona`, `tipo_publicacion`, `descripcion`, `descripcion_comercial`, `texto_whatsapp`, `urgencia`, `imagen_url`, `telefono`, `estado`) siguen existiendo, y la consulta del bot devuelve hoy 20 filas, todas con teléfono.

**Lo que falta y no puede hacerse desde acá**: una ejecución end-to-end. El único disparador es el webhook de `capemisa_conversacional`, que **envía mensajes reales de WhatsApp**; dispararlo sería una acción hacia terceros. Las ejecuciones guardadas en n8n son del 2026-07-29, **anteriores** a los cambios de base, así que no sirven como confirmación. **Queda para Fernando: mandar un mensaje de prueba al bot y confirmar que la búsqueda responde.**

---

## Estado de cierre al 2026-07-31

**Implementación completa**: T001–T043 y T045. Las 4 historias funcionan y sus 22 escenarios de aceptación están verificados y registrados arriba.

**Defectos encontrados y corregidos durante la validación** (ninguno pendiente):

1. Login caído para las 5 cuentas por tokens `NULL` en `auth.users` (T008).
2. Cerrar sesión terminaba en `/ingresar` en vez del catálogo (T021).
3. El doble envío creaba publicaciones duplicadas (T033).
4. El perfil en carga se mostraba como error definitivo (T033).
5. El diálogo de reingreso abría con el email vacío (T039).

**Pendientes que no puede cerrar un agente**:

| Qué | Por qué | Tarea |
|---|---|---|
| SC-009: alguien ajeno interpreta el listado con 3 estados | Requiere una persona | T021 |
| SC-001 y SC-007 con una persona real | Los números registrados son de recorrido automatizado, sin tiempo de tipeo | T021, T033 |
| Ejecución end-to-end del bot de n8n | El único disparador envía mensajes reales de WhatsApp | T043 |
| Deploy y verificación en producción | `main` es producción | T044 |

**Riesgo aceptado que sigue abierto**: las dos vías de lectura de PII con la anon key (FR-026b). Verificadas como **presentes**, no como correctas. Cerrar antes de pasar de demo a producción.

---

## T044 — Deploy y verificación en producción (2026-07-31)

Merge a `main` hecho por Fernando. **El auto-deploy no se disparó solo**: tras más de 20 minutos sin cambios en línea, hizo un redeploy manual desde Coolify y ahí sí salió. Revisar el webhook de GitHub → Coolify antes del próximo push; el build en sí no tuvo problemas.

Verificado contra `https://capemisa-app.fsalva157.dev`:

| Qué | Resultado |
|---|---|
| Bundle desplegado | `index-JGkLV903.js`, 841.746 bytes — **idéntico al build local**, mismo hash |
| Catálogo público | 20 tarjetas, sin cambios (FR-024) |
| Login | Entra con `miembro@capemisa.com` y lista sus 19 publicaciones, con la empresa en la barra |
| Detalle propio | Sus 3 interesados; sin acción de editar por estar publicada |
| Recarga de `/mi-area` | Sigue en el área, sin pasar por la pantalla de acceso (R-03 también en producción) |
| Fallback SPA de nginx | `/ingresar`, `/mi-area`, `/mi-area/nueva` responden 200 |
| Errores de JavaScript | Ninguno |
| Secretos en el bundle | Sin `service_role`; solo la URL del proyecto y la anon key |

Las variables `VITE_*` quedaron correctamente inlineadas, o sea que están marcadas como **Build Variable** en Coolify, no solo runtime.
