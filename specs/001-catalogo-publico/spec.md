# Feature Specification: Catálogo público de publicaciones

**Feature Branch**: `001-catalogo-publico`

**Created**: 2026-07-23

**Status**: Draft

**Input**: User description: "Catálogo público de publicaciones — visitante anónimo entra al sitio, ve la grilla de ofertas y búsquedas publicadas, filtra, revisa detalle y puede solicitar contacto a la empresa oferente/demandante. Es el primer punto de valor del sistema y no requiere autenticación."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Explorar el catálogo (Priority: P1)

Un visitante llega al sitio de CAPEMISA Conecta sin cuenta. Ve una grilla con las publicaciones activas del ecosistema (ofertas de servicio, ventas de equipos, búsquedas de proveedores y de equipos). Puede filtrar por tipo de publicación y buscar por palabra clave. Cada tarjeta muestra la empresa que publica, el tipo, el rubro asignado por el equipo de CAPEMISA, un resumen comercial, la zona y el nivel de urgencia. El visitante entiende de un vistazo qué oportunidades hay activas.

**Why this priority**: es el valor más básico del sistema. Sin el catálogo funcionando, no hay razón para que un visitante vuelva. Reemplaza el "scroll infinito del grupo de WhatsApp" con una vista ordenada. Sin esta historia, ninguna otra tiene contexto.

**Independent Test**: se prueba entrando al sitio como usuario anónimo con la base sembrada de publicaciones (al menos los 3 casos precargados del brief: camionetas 4x4 a la Puna, búsqueda de neumáticos, venta de grupo electrógeno). El visitante ve las 3 tarjetas, aplica un filtro de tipo y la grilla se reduce; escribe una palabra clave y la grilla se filtra; borra los filtros y vuelve a ver todo. Entrega valor por sí solo: descubrimiento de oportunidades.

**Acceptance Scenarios**:

1. **Given** la base tiene 3 publicaciones en estado 'publicada', **When** el visitante ingresa a la home, **Then** ve las 3 tarjetas ordenadas de la más reciente a la más antigua.
2. **Given** la grilla muestra 3 publicaciones de tipos distintos, **When** el visitante elige el filtro "oferta de servicio", **Then** solo ve las tarjetas que son ofertas de servicio.
3. **Given** la grilla muestra publicaciones, **When** el visitante escribe "camioneta" en la búsqueda, **Then** solo ve las tarjetas cuyo texto (rubro, descripción comercial o descripción original) coincida con esa palabra (sin distinguir mayúsculas ni acentos).
4. **Given** no hay publicaciones que matcheen los filtros aplicados, **When** el visitante mira la grilla, **Then** ve un mensaje claro tipo "No hay publicaciones que coincidan con tu búsqueda" con la opción de limpiar filtros.
5. **Given** no hay ninguna publicación en estado 'publicada' en la base, **When** el visitante ingresa a la home, **Then** ve un mensaje amable de "Todavía no hay publicaciones activas".

---

### User Story 2 - Ver el detalle de una publicación (Priority: P2)

El visitante identificó una tarjeta que le interesa. Al hacer clic accede a una página de detalle con toda la información pública de esa publicación: empresa, tipo, rubro y subrubro asignados por CAPEMISA, descripción comercial completa, descripción original del oferente, zona, condición comercial, disponibilidad, vencimiento e imagen si existe. La página tiene URL propia (compartible por WhatsApp).

**Why this priority**: sin detalle, el visitante no tiene información suficiente para decidir si le interesa contactar. Además la URL única permite compartir la oportunidad afuera del sitio (por ejemplo, un miembro reenviándola en su propio grupo de WhatsApp). La grilla sola convierte poco; el detalle convierte.

**Independent Test**: se prueba haciendo clic en cualquier tarjeta de la grilla; la URL cambia a `/publicacion/<id>` y aparece la vista de detalle con todos los campos disponibles. Se copia la URL, se pega en otra pestaña anónima, y también carga correctamente. Si se pega una URL con id inexistente, se ve un mensaje "Publicación no encontrada". Entrega valor por sí solo: evaluación de una oportunidad.

**Acceptance Scenarios**:

1. **Given** el visitante está en la grilla, **When** hace clic en una tarjeta, **Then** navega a la URL única de esa publicación y ve todos sus campos públicos.
2. **Given** un visitante recibe una URL de publicación por fuera del sitio, **When** la abre directamente, **Then** ve el detalle sin necesidad de pasar por la grilla ni loguearse.
3. **Given** una publicación cambia de estado 'publicada' a otro estado (por ejemplo 'rechazada'), **When** el visitante intenta abrir su URL, **Then** ve el mensaje "Publicación no disponible" (no ve el contenido).
4. **Given** una publicación no tiene imagen, **When** el visitante ve el detalle, **Then** el layout no se rompe y se muestra un placeholder o simplemente se omite el bloque de imagen.

---

### User Story 3 - Solicitar contacto con la empresa (Priority: P3)

Desde el detalle de una publicación, el visitante quiere contactar a la empresa. Hace clic en "Solicitar contacto", completa un formulario corto (su empresa, su nombre, teléfono, opcionalmente email, motivo, urgencia) y envía. Ve una confirmación clara. La consulta queda registrada para que el equipo de CAPEMISA la derive.

**Why this priority**: es el "call to action" que cierra el circuito de valor. Sin esta historia, el catálogo es informativo pero no funcional. Se coloca P3 porque las anteriores (US1 y US2) ya entregan valor de descubrimiento por sí solas, y esta se puede agregar en un segundo release sin bloquear el lanzamiento del catálogo.

**Independent Test**: se prueba entrando al detalle de una publicación, haciendo clic en "Solicitar contacto", completando el formulario y enviándolo. Se verifica que aparece el mensaje de éxito y que la consulta quedó registrada en la base para el equipo de CAPEMISA. Entrega valor por sí solo: expresión de interés capturada.

**Acceptance Scenarios**:

1. **Given** el visitante está en el detalle de una publicación, **When** hace clic en "Solicitar contacto", **Then** ve un formulario con los campos: empresa interesada, persona de contacto, teléfono, email (opcional), motivo (opcional) y urgencia (opcional).
2. **Given** el formulario está completo con los campos obligatorios, **When** el visitante envía, **Then** ve un mensaje de éxito ("Tu solicitud fue enviada, el equipo de CAPEMISA se pondrá en contacto") y el formulario se cierra o se resetea.
3. **Given** el formulario está incompleto (faltan empresa, persona o teléfono), **When** el visitante intenta enviar, **Then** el envío se bloquea y se marcan los campos faltantes con un mensaje inline.
4. **Given** la consulta fue enviada, **When** un admin de CAPEMISA revisa el sistema, **Then** la consulta aparece en su bandeja con toda la información capturada más una referencia a la publicación de origen.

---

### Edge Cases

- **Publicación con imagen rota o URL inaccesible**: el layout muestra un placeholder sin romper el diseño; el resto de la tarjeta/detalle sigue siendo utilizable.
- **Publicación aprobada pero con campos de IA vacíos** (rubro, descripción comercial, texto WhatsApp sin generar): la tarjeta usa la descripción original como fallback en lugar del texto comercial; los filtros por rubro siguen funcionando (esa publicación simplemente no matchea filtros de rubro).
- **URL de detalle con id que no existe** o con id que sí existe pero cuyo estado no es 'publicada': se muestra la misma página "Publicación no disponible" — nunca se filtra información de estados internos.
- **Visitante en mobile (375 px de ancho)**: la grilla se ve en 1 columna; los filtros son accesibles vía un botón/expandible; el formulario de contacto se ve completo sin scroll horizontal.
- **Publicaciones con texto muy largo**: la tarjeta muestra la descripción truncada con un indicador visual (elipsis o "ver más"); el detalle muestra el texto completo.
- **Filtros aplicados producen cero resultados**: mensaje amable + botón de "limpiar filtros" siempre visible.
- **Visitante intenta enviar la misma consulta muchas veces**: la demo no aplica rate limiting; el mensaje de confirmación ya visible desincentiva el reenvío.
- **Publicaciones cuyo campo `vencimiento` ya pasó**: se muestran igual (el estado 'publicada' es autoritativo, no la fecha de vencimiento); un futuro job de mantenimiento las moverá de estado.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El sistema MUST mostrar únicamente publicaciones cuyo estado sea 'publicada'. Publicaciones en cualquier otro estado (pendiente, faltan_datos, aprobada, rechazada) NUNCA son visibles al público.
- **FR-002**: El catálogo MUST ser accesible sin autenticación (usuario anónimo).
- **FR-003**: Cada tarjeta del catálogo MUST mostrar como mínimo: empresa que publica, tipo de publicación, rubro asignado (si existe), descripción comercial resumida (o descripción original si no existe la comercial), zona, indicador de urgencia si existe, e imagen si existe.
- **FR-004**: El sistema MUST permitir filtrar la grilla por tipo de publicación (los 5 tipos del modelo: oferta_servicio, oferta_equipo, venta_equipo, busqueda_proveedor, busqueda_equipo).
- **FR-005**: El sistema MUST permitir buscar por palabra clave. La búsqueda MUST ignorar mayúsculas y acentos, y debe alcanzar al menos: rubro, subrubro, descripción comercial, texto WhatsApp y descripción original.
- **FR-006**: El sistema MUST ordenar la grilla por defecto de la publicación más reciente a la más antigua.
- **FR-007**: Cada publicación MUST tener una URL única y estable de detalle (compartible externamente).
- **FR-008**: La página de detalle MUST mostrar todos los campos públicos de la publicación (los mismos de la tarjeta más: subrubro, descripción original completa, condición comercial, disponibilidad, vencimiento, imagen en tamaño grande si existe).
- **FR-009**: El sistema MUST proveer un formulario "Solicitar contacto" como único mecanismo público para manifestar interés en una publicación. La ficha pública (tarjeta y detalle) MUST mostrar el nombre de la empresa que publica y la zona, pero NUNCA su teléfono ni su email: el contacto se canaliza siempre por CAPEMISA a través de la consulta registrada. Esta regla implementa el rol institucional de mediación descripto en el brief.
- **FR-010**: El formulario de solicitud de contacto MUST capturar como mínimo: nombre de la empresa interesada, persona de contacto, teléfono. Los campos email, motivo y nivel de urgencia MUST ser opcionales.
- **FR-011**: Al enviar una solicitud exitosamente, el sistema MUST mostrar una confirmación visual clara al visitante.
- **FR-012**: Al fallar la validación del formulario (campos obligatorios vacíos, formato inválido de teléfono/email), el sistema MUST bloquear el envío y marcar los campos problemáticos con un mensaje inline.
- **FR-013**: La solicitud de contacto MUST quedar registrada con: publicación de origen, datos de la empresa interesada, fecha/hora, y estado inicial "nueva".
- **FR-014**: La interfaz MUST ser responsive y funcional en anchos de pantalla desde 375 px (mobile) hasta 1440 px (desktop), verificada en los breakpoints intermedios (768 px tablet).
- **FR-015**: La interfaz MUST estar en español rioplatense (Argentina) para toda la microcopy visible.
- **FR-016**: Cuando el catálogo no tiene publicaciones activas o los filtros producen cero resultados, el sistema MUST mostrar un estado vacío con mensaje explicativo y (si aplica) acción de limpiar filtros.
- **FR-017**: El sistema MUST manejar publicaciones con campos opcionales vacíos (imagen, rubro, descripción comercial) sin romper el layout ni exponer valores nulos al usuario.
- **FR-018**: La operación de sumar una nueva publicación al catálogo (por parte del equipo de CAPEMISA, fuera de esta feature) MUST reflejarse en la próxima carga de la grilla; no se requiere actualización en tiempo real.
- **FR-019**: Los datos de contacto del oferente (teléfono y email de la empresa que publica) MUST permanecer ocultos al público en toda superficie (tarjeta, detalle, meta tags, código fuente HTML). Solo el equipo de CAPEMISA con rol admin puede acceder a esos datos internamente.

### Key Entities

- **Publicación**: la oferta o búsqueda que una empresa asociada carga en el sistema. Atributos relevantes para esta feature (sin implementación): empresa que publica, responsable, tipo de publicación, rubro y subrubro (asignados por IA + validados por admin), descripción original, descripción comercial, texto para WhatsApp, zona, condición comercial, disponibilidad, vencimiento, imagen, urgencia y estado (solo 'publicada' es visible aquí).
- **Consulta**: la manifestación de interés que un visitante envía sobre una publicación. Atributos: publicación de origen, empresa interesada, persona de contacto, teléfono, email opcional, motivo opcional, urgencia opcional, estado de seguimiento (inicial: 'nueva'), fecha de creación.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Un visitante nuevo puede pasar de la home al detalle de una publicación de su interés en menos de 30 segundos.
- **SC-002**: El 100 % de las publicaciones mostradas al público están en estado 'publicada'; ninguna en pendiente/faltan_datos/aprobada/rechazada es visible (compliance con el gate humano definido en la constitución).
- **SC-003**: El envío de una solicitud de contacto se completa (desde el clic en "Solicitar contacto" hasta la confirmación) en menos de 60 segundos.
- **SC-004**: El 100 % de los envíos exitosos de solicitud muestran feedback visual explícito al usuario.
- **SC-005**: El catálogo es utilizable a 375 px de ancho: cero elementos requieren scroll horizontal, todas las acciones principales son accesibles con el pulgar en un solo tramo de pantalla.
- **SC-006**: Los 3 casos precargados del brief (camionetas 4x4 a la Puna, búsqueda de neumáticos, venta de grupo electrógeno) están visibles en el catálogo desde el primer acceso, sin pasos manuales adicionales.
- **SC-007**: Una consulta enviada por un visitante queda disponible para el equipo de CAPEMISA (en la bandeja correspondiente, fuera de scope de esta feature) dentro de los 5 segundos posteriores al envío.
- **SC-008**: La búsqueda por palabra clave devuelve resultados relevantes con y sin acentos en la consulta (por ejemplo, "camion" y "camión" retornan lo mismo).
- **SC-009**: El 100 % de las fichas públicas (tarjeta y detalle) ocultan el teléfono y el email de la empresa que publica; una auditoría manual sobre cualquier publicación no encuentra esos datos ni en pantalla ni en el HTML entregado al cliente.

## Assumptions

- La base de datos ya está poblada con al menos los 3 casos precargados del brief en estado 'publicada' (semillas de `/db`).
- La búsqueda por palabra clave es "contains" simple sobre texto normalizado (sin ranking semántico ni tolerancia a errores de tipeo). La sofisticación semántica queda para releases posteriores.
- No hay paginación en la grilla: se asume volumen bajo (<50 publicaciones activas durante la demo). Si en el futuro la base crece, se agregará como enhancement con su propia spec.
- La demo no aplica rate limiting sobre el envío de consultas; se confía en que el escenario controlado no tendrá abuso.
- El idioma UI es español rioplatense por defecto; el TODO abierto en la constitución sobre rioplatense vs LATAM neutro no bloquea esta spec (asumir rioplatense).
- No se ofrece registro público de nuevos usuarios en esta feature; el catálogo es 100 % anónimo por diseño.
- No se envía notificación al oferente cuando llega una consulta: esa notificación es un flujo aparte (probablemente vía WhatsApp por n8n) y no forma parte de esta spec.
- El teléfono se acepta como texto libre en el formulario (validación de formato ligera, ej. dígitos y símbolos comunes), sin obligar formato E.164; el equipo de CAPEMISA normaliza si necesita usarlo.
- No hay ordenamientos alternativos (por urgencia, por vencimiento) en esta primera iteración: default por fecha de creación descendente.
- La imagen de una publicación es una URL externa ya existente (hardcoded en seeds durante la demo); no hay upload real en esta feature.
- La transición de una publicación a un estado no-visible (por ejemplo rechazada) mientras un visitante tenía la ficha abierta se resuelve al próximo intento de acceso, no en tiempo real.
