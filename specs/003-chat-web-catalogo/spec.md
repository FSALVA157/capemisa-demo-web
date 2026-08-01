# Feature Specification: Chat web del catálogo

**Feature Branch**: `003-chat-web-catalogo`

**Created**: 2026-08-01

**Status**: Draft

**Input**: User description: "Chat web asistido por IA para el catálogo público de CAPEMISA Conecta. Un chat conversacional que permite a cualquier visitante —anónimo o logueado— buscar publicaciones por lenguaje natural y registrar una solicitud de contacto sobre una de ellas, reutilizando la automatización de n8n que hoy atiende WhatsApp. El chat no publica ni edita: esas funciones ya existen en el área de miembro."

## User Scenarios & Testing *(mandatory)*

Hoy la web ofrece dos formas de encontrar algo en el catálogo: mirar la grilla o escribir una palabra en el buscador, que hace coincidencia literal de texto. Quien no acierta la palabra exacta que usó el oferente, no encuentra nada. Del otro lado, el bot de WhatsApp ya resuelve esto por lenguaje natural desde hace semanas, pero solo para quien tiene el número.

Esta feature trae esa misma conversación a la web, con las capacidades de la rama de **invitado** del bot: buscar y dejar una solicitud de contacto. Las historias están ordenadas para que cada una entregue valor sola: US1 es un buscador conversacional utilizable aunque nunca se implemente US2, y US3 solo reduce fricción sobre lo que US2 ya hace.

### User Story 1 - Encontrar algo sin saber cómo se llama (Priority: P1)

Un visitante entra al catálogo buscando "gente que lleve personal a la mina". No sabe que el aviso que le sirve está cargado como "traslado de personal 4x4" bajo el rubro Logística. Abre el chat, lo escribe con sus palabras, y el asistente le devuelve los avisos relevantes como tarjetas, con la empresa, la zona, la descripción y la foto, cada una con un enlace para ver la publicación completa.

**Why this priority**: es la razón de existir de la feature. El buscador actual falla exactamente en este caso, y es el escenario que el brief del cliente pone como ejemplo de asistencia con IA. Por sí sola, esta historia ya es demostrable ante CAPEMISA.

**Independent Test**: abrir el catálogo sin sesión, pedir en lenguaje natural algo que no coincida literalmente con ningún texto de los avisos cargados, y verificar que el asistente devuelve el aviso semánticamente correcto y que el enlace lleva a su detalle.

**Acceptance Scenarios**:

1. **Given** un visitante anónimo en el catálogo, **When** abre el chat y describe lo que necesita con sus propias palabras, **Then** recibe hasta 5 publicaciones relevantes presentadas como tarjetas con empresa, rubro, zona, descripción, urgencia e imagen cuando la tenga.
2. **Given** un visitante que usó un sinónimo o jerga distinta a la del aviso ("ropa de trabajo" cuando el aviso dice "uniformes"), **When** envía el mensaje, **Then** el asistente igualmente encuentra el aviso.
3. **Given** un resultado mostrado en el chat, **When** el visitante elige verlo completo, **Then** llega al detalle de esa publicación en la web.
4. **Given** un pedido para el que no hay ninguna publicación relevante, **When** el asistente responde, **Then** dice claramente que no encontró nada y ofrece reformular, en lugar de inventar avisos.
5. **Given** un visitante que pregunta algo ajeno al catálogo, **When** el asistente responde, **Then** se mantiene dentro de su función y no improvisa datos institucionales que no tiene.
6. **Given** cualquier resultado devuelto, **When** el visitante lo lee, **Then** no aparece el teléfono, el email ni el nombre del responsable de la empresa oferente.

---

### User Story 2 - Dejar una solicitud de contacto sin salir del chat (Priority: P2)

Al visitante le interesa uno de los avisos que el asistente le mostró. En vez de cerrar el chat, entrar al detalle y llenar el formulario, le dice al asistente que quiere contactar a esa empresa. El asistente le pide los datos que faltan —empresa, persona, teléfono, motivo, urgencia—, se los confirma, y registra la solicitud. Esa solicitud queda igual que las que entran por el formulario del catálogo: visible para el miembro dueño de la publicación en su área.

**Why this priority**: cierra el circuito comercial dentro de la conversación y alimenta el mismo registro de solicitudes que ya existe. Sin esta historia el chat informa pero no genera negocio; con ella, la demo muestra el paso "otro interesado solicita contacto" del brief sin cambiar de pantalla.

**Independent Test**: pedir contacto sobre una publicación encontrada en el chat, completar los datos que el asistente pida, y verificar en el área del miembro dueño que la solicitud aparece con los datos ingresados.

**Acceptance Scenarios**:

1. **Given** un visitante que vio resultados en el chat, **When** pide contactar a una de las empresas, **Then** el asistente le solicita los datos obligatorios que falten antes de registrar nada.
2. **Given** un visitante que dio todos los datos, **When** el asistente confirma el registro, **Then** la solicitud queda efectivamente guardada y aparece entre los interesados de esa publicación en el área del miembro dueño.
3. **Given** un visitante que dice "quiero contactar" sin indicar cuál publicación, **When** hay más de un resultado en pantalla, **Then** el asistente le pide que aclare cuál en lugar de elegir por su cuenta.
4. **Given** una solicitud registrada desde el chat, **When** el miembro la ve en su área, **Then** es indistinguible en formato y completitud de una registrada desde el formulario del catálogo.
5. **Given** cualquier turno de la conversación, **When** el asistente afirma haber registrado una solicitud, **Then** esa solicitud existe realmente; nunca se confirma un registro que no ocurrió.

---

### User Story 3 - Que el chat ya sepa quién soy (Priority: P3)

Un miembro con sesión abierta usa el chat igual que cualquier visitante, pero cuando decide contactar a un oferente el asistente ya conoce su empresa, su responsable, su teléfono y su email. Se los propone, el miembro confirma, y la solicitud queda registrada en un turno en vez de cuatro.

**Why this priority**: es comodidad, no capacidad. El chat funciona completo sin esta historia; con ella, la demostración ante el cliente es notablemente más corta y muestra que el login sirve para algo en el chat.

**Independent Test**: hacer el mismo pedido de contacto con sesión y sin sesión, y comprobar que con sesión el asistente propone los datos del perfil y la conversación se cierra en menos turnos, con la solicitud registrada con esos mismos datos.

**Acceptance Scenarios**:

1. **Given** un usuario con sesión activa, **When** pide contactar a un oferente, **Then** el asistente le propone los datos de contacto de su perfil y le pide confirmación en lugar de preguntarlos de a uno.
2. **Given** un usuario con sesión activa, **When** confirma los datos propuestos, **Then** la solicitud se registra con los datos de su perfil.
3. **Given** un usuario con sesión activa, **When** prefiere usar otros datos de contacto, **Then** puede indicarlos y el asistente los usa en lugar de los del perfil.
4. **Given** un usuario cuya sesión venció mientras el chat estaba abierto, **When** sigue conversando, **Then** la conversación continúa sin error visible y el asistente vuelve a pedir los datos de contacto.
5. **Given** un usuario con sesión activa, **When** usa el chat para buscar, **Then** obtiene exactamente los mismos resultados y la misma información que un visitante anónimo, sin datos de contacto de los oferentes.

---

### Edge Cases

- **Sin resultados**: el pedido no matchea ningún aviso publicado. El asistente lo dice y sugiere reformular; no inventa publicaciones ni promete avisar cuando haya.
- **El visitante pide publicar**: el chat no publica. Debe explicar que para publicar hay que ser miembro y usar el área de miembro, sin recolectar datos de un aviso ni simular que lo cargó.
- **El visitante pide el teléfono del oferente**: el asistente no lo tiene y no debe inventarlo; ofrece registrar una solicitud de contacto como camino.
- **El servicio de asistencia no responde o falla**: el chat muestra un mensaje comprensible en español y permite reintentar. El resto de la web sigue funcionando: el catálogo, el detalle y el área de miembro no dependen del chat.
- **Sesión vencida a mitad de conversación**: degrada a anónimo en silencio, sin pantalla de error ni expulsión del chat.
- **Recarga de página**: la conversación en curso se conserva mientras dure la pestaña; al cerrarla se pierde. No hay historial persistente entre visitas.
- **Dos pestañas abiertas**: cada una mantiene su propia conversación sin mezclarse.
- **Mensaje excesivamente largo o vacío**: se rechaza en la interfaz antes de enviarse, con un mensaje claro.
- **Uso abusivo del chat anónimo**: al superarse el límite de mensajes, el visitante recibe un aviso amable de que espere, no un error técnico.
- **Publicación despublicada o rechazada**: nunca aparece en los resultados del chat, aunque haya aparecido en un turno anterior de la misma conversación.

## Requirements *(mandatory)*

### Functional Requirements

**Conversación y búsqueda**

- **FR-001**: El sistema MUST ofrecer un chat conversacional accesible desde el catálogo (`/`) y desde el detalle de publicación (`/publicacion/:id`).
- **FR-002**: El chat MUST estar disponible tanto para visitantes anónimos como para usuarios con sesión activa, con las mismas capacidades para ambos.
- **FR-003**: El sistema MUST interpretar pedidos en lenguaje natural y encontrar publicaciones por significado —sinónimos, variantes y jerga de la industria minera—, no solo por coincidencia literal de texto.
- **FR-004**: El sistema MUST devolver como máximo 5 publicaciones por búsqueda, ordenadas por relevancia.
- **FR-005**: El sistema MUST presentar cada resultado con empresa, rubro, subrubro, zona, tipo de publicación, descripción comercial, urgencia e imagen cuando exista, y con un enlace al detalle de esa publicación.
- **FR-006**: El sistema MUST considerar únicamente publicaciones en estado `publicada`. Ninguna publicación pendiente, con faltantes, aprobada, rechazada o despublicada puede aparecer en el chat.
- **FR-007**: El asistente MUST declarar explícitamente cuándo no encontró resultados, y MUST NOT inventar publicaciones, empresas ni datos que no provengan de una búsqueda efectivamente ejecutada en ese mismo turno.
- **FR-008**: El chat MUST mantener el contexto de la conversación dentro de la misma pestaña del navegador, de modo que el visitante pueda referirse a resultados anteriores sin repetirlos.
- **FR-009**: El contexto de conversación MUST identificarse con un identificador propio del chat web, distinto e independiente del que usa el canal de WhatsApp, de modo que los historiales no puedan mezclarse.

**Solicitud de contacto**

- **FR-010**: Los visitantes MUST poder registrar una solicitud de contacto sobre una publicación desde la conversación.
- **FR-011**: El sistema MUST exigir publicación, empresa interesada, persona de contacto y teléfono antes de registrar una solicitud; el asistente MUST pedir los que falten.
- **FR-012**: El sistema MUST pedir aclaración cuando el visitante quiera contactar sin identificar inequívocamente una publicación.
- **FR-013**: Una solicitud registrada desde el chat MUST quedar registrada del mismo modo y con la misma completitud que una registrada desde el formulario del catálogo, y MUST ser visible para el miembro dueño de la publicación.
- **FR-014**: El asistente MUST NOT afirmar que registró una solicitud si el registro no ocurrió efectivamente en ese mismo turno. El sistema MUST bloquear ese tipo de afirmación antes de mostrarla al visitante y sustituirla por un mensaje de reintento.

**Sesión y precarga**

- **FR-015**: El sistema MUST reconocer si quien conversa tiene una sesión activa en la web.
- **FR-016**: Cuando haya sesión activa, el sistema MUST usar los datos de contacto del perfil (empresa, responsable, teléfono, email) para proponer la solicitud de contacto en lugar de preguntarlos de a uno.
- **FR-017**: El usuario con sesión MUST poder reemplazar los datos propuestos por otros antes de confirmar.
- **FR-018**: La sesión MUST NOT otorgar capacidades adicionales dentro del chat: un usuario autenticado obtiene exactamente los mismos resultados e información que uno anónimo.
- **FR-019**: Si la credencial de sesión falta, está vencida o es inválida, la conversación MUST continuar en modo anónimo sin error visible ni interrupción.
- **FR-020**: La verificación de la sesión MUST realizarse del lado del servicio de asistencia contra el proveedor de identidad, y MUST NOT basarse en datos de identidad o rol declarados por el cliente.

**Privacidad y límites de alcance**

- **FR-021**: El chat MUST NOT revelar teléfono, email ni nombre del responsable de las empresas oferentes, en ningún turno y para ningún tipo de usuario.
- **FR-022**: El chat MUST NOT permitir crear, editar, despublicar ni eliminar publicaciones, ni modificar imágenes de publicaciones existentes. Ante un pedido de ese tipo MUST explicar que esas acciones se hacen desde el área de miembro.
- **FR-023**: El chat MUST NOT dar acceso a las solicitudes de contacto recibidas por otros ni a información del área de miembro.
- **FR-024**: El sistema MUST limitar la cantidad de mensajes que un mismo origen puede enviar en una ventana de tiempo, y MUST comunicar el límite alcanzado con un mensaje comprensible en español, no con un error técnico.
- **FR-025**: Una falla o indisponibilidad del chat MUST NOT afectar el catálogo, el detalle de publicación ni el área de miembro.

**Interfaz**

- **FR-026**: Toda la interfaz y los mensajes del asistente MUST estar en español rioplatense.
- **FR-027**: El chat MUST indicar visualmente que el asistente está elaborando la respuesta mientras dure la espera.
- **FR-028**: El chat MUST ser usable a 375, 768 y 1440 px de ancho, sin tapar la navegación ni impedir el uso del catálogo por debajo.
- **FR-029**: El chat MUST poder cerrarse y reabrirse conservando la conversación en curso dentro de la misma pestaña.

### Restricciones de integración *(NO NEGOCIABLES)*

Estas restricciones son requisitos de la feature, no recomendaciones. Están escritas a pedido explícito del responsable del proyecto porque la automatización existente **está en uso frente al cliente** y su rotura no es recuperable dentro de la ventana de la demo.

- **FR-030**: Está **PROHIBIDO modificar cualquier workflow n8n existente** como parte de esta feature: ni un nodo, ni un parámetro, ni una credencial, ni el prompt de un agente, ni la activación. Alcanza a `capemisa_conversacional`, `capemisa_tool_buscar`, `capemisa_tool_registrar_consulta`, `capemisa_tool_publicar`, `capemisa_tool_enviar_imagen`, `capemisa_tool_actualizar_imagen` y `capemisa_procesar_imagen_pendiente`.
- **FR-031**: La reutilización de un workflow existente MUST ser por invocación, en las condiciones en que ya funciona hoy. Si la implementación necesitara un comportamiento distinto del que ese workflow ya ofrece, la **única** salida permitida es crear un workflow **gemelo** (copia nueva, identificador propio, nombre distinguible) y consumir el gemelo. Adaptar el original está prohibido incluso si el cambio parece retrocompatible.
- **FR-032**: La feature MUST incluir una verificación explícita, ejecutada después de la implementación, de que **ningún** workflow preexistente quedó alterado, y de que el flujo de WhatsApp sigue operando igual que antes.
- **FR-033**: El diseño por defecto MUST NOT usar Redis. Si durante la implementación se considerara necesario usarlo, la implementación MUST detenerse y **consultar al responsable del proyecto antes de escribir nada**, verificando y documentando que el espacio de claves elegido no toca las claves de estado de sesión ni de imagen pendiente que el flujo de WhatsApp indexa por número de teléfono.
- **FR-034**: El rol o perfil de acceso con el que se consulta la búsqueda MUST ser una constante del lado del servicio de asistencia. MUST NOT provenir del cuerpo del pedido del cliente ni de ningún dato que el navegador pueda alterar.
- **FR-035**: La clave `service_role` de Supabase MUST permanecer fuera del frontend, incluso comentada (Principio IV de la constitución). El chat web MUST NOT ampliar el acceso a datos que hoy tiene el navegador.

### Key Entities

- **Conversación**: intercambio entre un visitante y el asistente dentro de una pestaña. Tiene un identificador propio del canal web, una lista ordenada de mensajes y una duración acotada a la sesión de la pestaña. No se persiste entre visitas.
- **Mensaje**: turno de la conversación. Es del visitante o del asistente. El del asistente puede traer asociada una lista de resultados.
- **Resultado de búsqueda**: publicación relevante devuelta por el asistente, con los datos públicos de la publicación y sin datos de contacto del oferente. Referencia a una publicación existente del catálogo.
- **Solicitud de contacto**: registro existente en el sistema (`consultas`). El chat es un canal de alta adicional; no cambia su estructura, sus campos obligatorios ni su ciclo de seguimiento.
- **Perfil de miembro**: entidad existente. En esta feature se usa exclusivamente como origen de los datos de contacto propuestos al usuario autenticado.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Sobre 5 pedidos preparados que usan vocabulario distinto al del aviso correspondiente, el chat devuelve el aviso correcto en al menos 4. El buscador literal actual falla en al menos 3 de esos mismos 5.
- **SC-002**: Un visitante anónimo que no conoce el catálogo encuentra una publicación relevante en 2 mensajes o menos.
- **SC-003**: Un visitante anónimo completa una solicitud de contacto desde el chat en 5 turnos o menos; un usuario con sesión activa, en 2 o menos.
- **SC-004**: El asistente responde en menos de 15 segundos en el 90% de los turnos.
- **SC-005**: En 10 conversaciones de prueba que incluyan pedidos explícitos de datos de contacto del oferente, **cero** respuestas exponen teléfono, email o responsable de la empresa oferente.
- **SC-006**: En 10 conversaciones de prueba, **cero** confirmaciones de registro sin registro efectivo, verificado contando solicitudes antes y después de cada conversación.
- **SC-007**: En 10 conversaciones de prueba que incluyan pedidos de publicar o editar, **cero** casos en que el asistente recolecte datos de un aviso o simule haberlo cargado.
- **SC-008**: Ninguna publicación en estado distinto de `publicada` aparece en los resultados del chat, verificado con una cuenta de prueba que tenga borradores y rechazadas.
- **SC-009**: Después de implementada la feature, los workflows n8n preexistentes conservan su definición sin cambios, y una conversación completa por WhatsApp (buscar → registrar consulta) funciona igual que antes.
- **SC-010**: Con el chat deshabilitado o su servicio caído, el catálogo, el detalle de publicación y el área de miembro siguen funcionando sin errores visibles.
- **SC-011**: El chat es utilizable a 375, 768 y 1440 px de ancho sin solapamientos ni pérdida de controles.

## Assumptions

- **Alcance equivalente a la rama de invitado**: el chat hace lo que hoy hace el bot con quien no es miembro —buscar y registrar consultas— y nada más. Publicar y editar quedan fuera porque la web ya los ofrece en el área de miembro; duplicarlos agregaría riesgo sin agregar valor demostrable.
- **Reutilización sin adaptación**: se asume que los workflows `capemisa_tool_buscar` y `capemisa_tool_registrar_consulta` cubren las necesidades de esta feature tal como están hoy. Si esa suposición cae, aplica FR-031 (gemelo), nunca la modificación del original.
- **Sin Redis**: se asume que la memoria de conversación puede resolverse sin almacenamiento compartido entre ejecuciones más allá de lo que el propio orquestador provee. Si no fuera así, aplica FR-033 (consultar antes).
- **Límite de uso**: se asume un tope inicial del orden de 30 mensajes por hora por origen para el uso anónimo, ajustable. Es un valor de demo: suficientemente alto para no interrumpir una demostración en vivo y suficientemente bajo para acotar el consumo.
- **Sin respuesta progresiva**: la respuesta del asistente llega completa de una vez, no palabra por palabra. Se compensa con un indicador de actividad (FR-027).
- **Historial no persistente**: la conversación vive mientras dure la pestaña. No hay historial entre visitas, ni panel para revisar conversaciones pasadas, ni registro de conversaciones para métricas. Eso sería una feature aparte.
- **Sin adjuntar imágenes desde la web**: el visitante escribe texto. Enviar fotos o audios es una capacidad del canal de WhatsApp y queda fuera de alcance.
- **Confirmación explícita antes de registrar**: incluso con los datos precargados del perfil, el asistente pide confirmación antes de dar de alta una solicitud. Evita altas accidentales y mantiene al humano en el lazo.
- **Costo por conversación**: cada mensaje consume capacidad de un proveedor de IA de pago. Es aceptable en escala de demo y es la razón de FR-024.
- **Idioma**: los visitantes escriben en español. No se contempla detección ni respuesta en otros idiomas.

## Dependencies

- **Feature 002 (login y área de miembro)**: completa y en producción. De ahí salen la sesión y el perfil que usan FR-015 a FR-019.
- **Feature 001 (catálogo público)**: completa. De ahí salen las rutas donde se monta el chat y el detalle al que enlazan los resultados.
- **Automatización n8n existente**: en uso frente al cliente. Es una dependencia de solo lectura: se invoca, no se toca (FR-030 a FR-032).
- **Proveedor de identidad (Supabase Auth)**: necesario para la verificación de sesión del lado del servicio (FR-020).
- **Proveedor de IA**: necesario para la interpretación del lenguaje natural y el matching semántico. Sin él la feature no funciona; su indisponibilidad está contemplada en FR-025.
- **Variable de entorno nueva**: el frontend necesita conocer la dirección del servicio de chat en tiempo de build, y debe quedar marcada como variable de build en el orquestador de deploy, no solo de runtime (mismo tratamiento que las variables existentes).
