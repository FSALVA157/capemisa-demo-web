# Feature Specification: Login y área de miembro

**Feature Branch**: `002-login-area-miembro`

**Created**: 2026-07-30

**Status**: Draft

**Input**: User description: "Login y área de miembro para CAPEMISA Conecta. Un miembro de CAPEMISA se autentica y accede a funciones que hoy no existen: crear una publicación nueva, ver la lista de interesados recibidos en sus propias publicaciones, y administrar sus publicaciones. El visitante anónimo conserva exactamente lo que la web ofrece hoy."

## User Scenarios & Testing *(mandatory)*

Esta feature introduce un segundo tipo de usuario en la web. Hasta ahora solo existía el **visitante anónimo**; a partir de acá convive con el **miembro autenticado**. Las historias están ordenadas de modo que cada una sea entregable por sí sola: US1 habilita la puerta, y cada historia siguiente agrega una función detrás de esa puerta sin depender de las posteriores.

### User Story 1 - Entrar a mi área de miembro (Priority: P1)

Una empresa socia de CAPEMISA recibió sus credenciales. Entra a la web, inicia sesión con su email y contraseña, y llega a un espacio propio donde ve el listado de **todas** sus publicaciones —no solo las que están visibles en el catálogo público— con el estado de cada una. Puede cerrar sesión cuando termina.

**Why this priority**: es la condición de posibilidad de todo lo demás. Además, por sí sola ya entrega valor real: hoy un socio no tiene forma de saber en qué quedó lo que mandó por WhatsApp. Ver "tu publicación está pendiente de revisión" resuelve una pregunta que hoy se responde por teléfono.

**Independent Test**: iniciar sesión con la cuenta de miembro de prueba, verificar que el listado muestra las publicaciones cuyo autor es esa cuenta con su estado correspondiente, y que cerrar sesión devuelve al catálogo público sin acceso al área.

**Acceptance Scenarios**:

1. **Given** un visitante en el catálogo público, **When** elige iniciar sesión e ingresa credenciales válidas, **Then** accede a su área de miembro y la interfaz refleja que hay una sesión activa.
2. **Given** un visitante en la pantalla de inicio de sesión, **When** ingresa credenciales inválidas, **Then** recibe un mensaje de error comprensible y permanece en la pantalla, sin pistas sobre si el email existe o si falló la contraseña.
3. **Given** un miembro autenticado, **When** entra a su área, **Then** ve sus publicaciones en cualquier estado (pendiente, faltan datos, aprobada, publicada, rechazada), cada una con su estado indicado de forma legible.
4. **Given** un miembro autenticado, **When** cierra sesión, **Then** vuelve al catálogo público y ya no puede acceder al área de miembro.
5. **Given** un miembro que nunca publicó nada, **When** entra a su área, **Then** ve un estado vacío que le explica cómo crear su primera publicación en lugar de una lista en blanco.
6. **Given** un visitante sin sesión, **When** intenta llegar al área de miembro escribiendo la dirección directamente, **Then** es redirigido a iniciar sesión en lugar de ver contenido o un error técnico.

---

### User Story 2 - Ver quién se interesó en mis publicaciones (Priority: P2)

Un miembro con publicaciones en el catálogo quiere saber si alguien pidió contactarlo. Entra a una publicación suya y ve la lista de solicitudes de contacto recibidas, con los datos que dejó cada interesado y cuándo lo hizo.

**Why this priority**: es la función de mayor valor percibido para el socio y el motivo por el cual va a volver a entrar. Sin esto, las solicitudes de contacto que ya se registran en el sistema son invisibles para su destinatario natural. Va después de US1 solo porque necesita la sesión.

**Independent Test**: con una publicación que tenga solicitudes registradas, iniciar sesión como su autor y verificar que las ve todas; iniciar sesión como otro miembro y verificar que no ve ninguna de esas.

**Acceptance Scenarios**:

1. **Given** un miembro autenticado con una publicación que recibió solicitudes de contacto, **When** abre esa publicación en su área, **Then** ve la lista de interesados con empresa, persona de contacto, teléfono, email si lo dejaron, motivo si lo dejaron, urgencia si la indicaron, y fecha de la solicitud.
2. **Given** un miembro autenticado, **When** consulta los interesados, **Then** solo ve solicitudes correspondientes a publicaciones de su autoría, nunca de otros miembros.
3. **Given** una publicación sin solicitudes, **When** el miembro la abre, **Then** ve un estado vacío que lo indica claramente.
4. **Given** un miembro con varias publicaciones, **When** mira su listado, **Then** puede distinguir de un vistazo cuáles recibieron interesados y cuántos, sin tener que abrir una por una.

---

### User Story 3 - Publicar una oferta o búsqueda desde la web (Priority: P3)

Un miembro quiere ofrecer un servicio o buscar un proveedor sin pasar por WhatsApp. Completa un formulario con los datos de su oferta y la envía. El sistema le confirma que quedó **enviada para revisión**, no publicada, y la ve reflejada en su listado con ese estado.

**Why this priority**: agrega un canal de entrada nuevo, pero el canal de WhatsApp ya existe y funciona, así que no es urgente. Depende de que la expectativa quede clara: si el miembro cree que publicó y no aparece en el catálogo, la función genera más consultas de las que ahorra.

**Independent Test**: crear una publicación desde el formulario, verificar que aparece en el listado propio como pendiente de revisión, y que **no** aparece en el catálogo público.

**Acceptance Scenarios**:

1. **Given** un miembro autenticado, **When** completa el formulario con los datos requeridos y lo envía, **Then** el sistema confirma que la publicación quedó enviada para revisión y explica que el equipo de CAPEMISA la va a revisar antes de publicarla.
2. **Given** una publicación recién creada por un miembro, **When** un visitante anónimo navega el catálogo público, **Then** esa publicación no aparece.
3. **Given** un miembro que envió una publicación, **When** vuelve a su área, **Then** la ve listada con estado pendiente de revisión.
4. **Given** un miembro completando el formulario, **When** deja vacío un dato obligatorio o carga un valor inválido, **Then** recibe indicación de qué corregir antes de poder enviar.
5. **Given** un miembro creando una publicación, **When** el sistema la registra, **Then** los datos de contacto asociados provienen del perfil del miembro y no se le piden de nuevo.

---

### User Story 4 - Corregir una publicación mía antes de que se publique (Priority: P4)

Un miembro se da cuenta de que cargó un dato mal, o el equipo de CAPEMISA le marcó que faltan datos. Mientras la publicación todavía no fue publicada, puede editarla y volver a enviarla.

**Why this priority**: cierra el ciclo de US3 y atiende el estado "faltan datos", que hoy no tiene salida desde la web. Es la de menor urgencia porque el volumen de correcciones en una demo es bajo y hoy se resuelve por otro canal.

**Independent Test**: editar una publicación propia en estado pendiente y verificar que los cambios persisten; verificar que una publicación ya publicada no ofrece la opción de editar.

**Acceptance Scenarios**:

1. **Given** un miembro con una publicación en estado pendiente o faltan datos, **When** la edita y guarda, **Then** los cambios quedan registrados y la publicación sigue en el circuito de revisión.
2. **Given** un miembro con una publicación ya publicada, aprobada o rechazada, **When** la abre en su área, **Then** la interfaz no le ofrece editarla y le explica por qué.
3. **Given** una publicación marcada como "faltan datos", **When** el miembro la abre, **Then** ve la indicación de qué se le pidió corregir, si el equipo de CAPEMISA la registró.

---

### Edge Cases

- **Sesión vencida mientras el miembro completa un formulario largo**: el sistema no debe descartar lo cargado sin aviso ni fallar en silencio al guardar. Debe indicar que la sesión expiró y permitir volver a autenticarse.
- **Miembro que también tiene rol de administración**: una de las cuentas de prueba tiene ese rol. Debe poder usar el área de miembro sin que la interfaz se rompa, aunque las funciones exclusivas de administración estén fuera del alcance de esta feature.
- **Publicación rechazada**: aparece en el listado del miembro con su estado. Ocultarla haría que el miembro la vuelva a cargar sin saber que fue rechazada.
- **Interesado que no dejó email, motivo ni urgencia**: los tres son opcionales al enviar una solicitud. La lista de interesados debe verse bien con esos campos vacíos.
- **Publicación despublicada o rechazada con solicitudes asociadas**: el miembro la sigue viendo en su área con su estado actual, y sigue viendo las solicitudes que recibió mientras estaba publicada. El listado del área no filtra por estado (FR-008), así que esto sale solo del diseño. Ocultar las solicitudes al cambiar el estado sería peor: el miembro perdería contactos comerciales que ya recibió, por una decisión administrativa posterior.
- **Miembro que intenta ver interesados de una publicación ajena manipulando la dirección**: debe recibir el mismo resultado que si la publicación no existiera, sin revelar que existe.
- **Dos sesiones abiertas del mismo miembro**: cerrar sesión en una no debería dejar la otra en un estado inconsistente que muestre datos sin permiso.
- **Contraseña incorrecta repetida**: no hay bloqueo por intentos fallidos en el alcance de la demo; conviene dejarlo dicho para que no se lea como un olvido.

## Requirements *(mandatory)*

### Functional Requirements

#### Autenticación y sesión

- **FR-001**: El sistema MUST permitir que un miembro con credenciales válidas inicie sesión mediante email y contraseña.
- **FR-002**: El sistema MUST NOT ofrecer registro público de nuevas cuentas. Las cuentas son creadas por CAPEMISA fuera de la web.
- **FR-003**: El sistema MUST mantener la sesión activa entre recargas de página hasta que el miembro cierre sesión explícitamente o la sesión expire.
- **FR-004**: El sistema MUST permitir cerrar sesión desde cualquier pantalla del área de miembro.
- **FR-005**: Ante credenciales inválidas, el sistema MUST mostrar un mensaje que no revele si el email existe en el sistema.
- **FR-006**: El sistema MUST indicar de forma visible si hay una sesión activa y a qué empresa corresponde.

#### Control de acceso

- **FR-007**: El sistema MUST impedir el acceso a toda función de miembro a quien no tenga sesión activa, incluso si llega por dirección directa.
- **FR-008**: Un miembro MUST poder ver únicamente las publicaciones de su autoría en su área, en cualquier estado.
- **FR-009**: Un miembro MUST poder ver únicamente las solicitudes de contacto correspondientes a publicaciones de su autoría.
- **FR-010**: Las restricciones de FR-008 y FR-009 MUST aplicarse en el almacén de datos y no solo en la interfaz: consultar directamente los objetos que esta feature agrega, con las credenciales que la aplicación web tiene disponibles, MUST devolver únicamente lo que corresponde al miembro autenticado.

  > **Alcance de este requisito.** Cubre las vías de lectura que esta feature crea, que son las
  > únicas por las que un miembro podría llegar a datos de otro miembro por un camino que hoy no
  > existe. **No** cubre las vías ya abiertas y documentadas en FR-026b, cuyo cierre se postergó de
  > forma deliberada. Redactarlo en términos absolutos haría que se apruebe mirando solo la parte
  > que cumple, con la parte abierta fuera de cuadro — que es exactamente cómo un control de
  > seguridad de la feature anterior dio verde sobre un problema real.

#### Área de miembro

- **FR-011**: El sistema MUST mostrar al miembro el listado de sus publicaciones con el estado de cada una expresado en lenguaje comprensible, no con el identificador técnico del estado.
- **FR-012**: El sistema MUST mostrar, para cada publicación propia, la cantidad de solicitudes de contacto recibidas.
- **FR-013**: El sistema MUST mostrar el detalle de cada solicitud de contacto recibida: empresa interesada, persona de contacto, teléfono, email, motivo, urgencia y fecha, indicando los campos que el interesado no completó.
- **FR-014**: El sistema MUST presentar estados vacíos explicativos cuando el miembro no tiene publicaciones o una publicación no tiene solicitudes.

#### Creación y edición de publicaciones

- **FR-015**: Un miembro autenticado MUST poder crear una publicación indicando tipo, descripción y los demás datos que hoy acepta el sistema.
- **FR-016**: El sistema MUST registrar toda publicación creada por un miembro en estado pendiente de revisión, nunca publicada directamente.
- **FR-017**: El sistema MUST comunicar al miembro, al confirmar la creación, que la publicación será revisada por CAPEMISA antes de aparecer en el catálogo público.
- **FR-018**: El sistema MUST tomar los datos de contacto de la publicación desde el perfil del miembro sin volver a pedírselos.
- **FR-019**: Un miembro MUST poder editar una publicación propia mientras esté en estado pendiente o faltan datos.
- **FR-020**: El sistema MUST NOT ofrecer editar publicaciones propias que estén aprobadas, publicadas o rechazadas, y MUST explicar el motivo cuando el miembro lo intente.
- **FR-021**: El sistema MUST validar los datos del formulario antes de enviarlos, señalando qué corregir.

#### Aprobación (human gate)

- **FR-022**: El sistema MUST NOT mostrar en el catálogo público ninguna publicación que no haya sido aprobada explícitamente por una persona con rol de administración.
- **FR-023**: La aprobación de publicaciones pendientes MUST realizarse fuera de la web, por una persona con rol de administración operando directamente sobre el almacén de datos. Esta feature NO incluye una pantalla de administración.
- **FR-023a**: Dado que el circuito de aprobación es externo a la web, el sistema MUST dejar claro al miembro, en el mensaje de confirmación y en el listado de sus publicaciones, que la revisión la hace el equipo de CAPEMISA y que no hay un plazo automático.

#### No regresión del catálogo público

- **FR-024**: El visitante anónimo MUST conservar el acceso completo al catálogo público, al detalle de publicación y al envío de solicitudes de contacto, sin cambios respecto al comportamiento actual.
- **FR-025**: El sistema MUST NOT exponer al visitante anónimo ningún dato adicional respecto de lo que expone hoy.
- **FR-026**: El catálogo público MUST comportarse de forma idéntica para un visitante anónimo y para un miembro autenticado. Un miembro NO ve los datos de contacto del autor de publicaciones ajenas; para contactarlo usa el mismo circuito de solicitud de contacto que cualquier visitante.
- **FR-026a**: La web MUST NOT ofrecer ninguna pantalla, acción ni consulta que entregue datos de contacto de un miembro a otro miembro. La entrega de contactos entre socios sigue ocurriendo por el canal de WhatsApp, fuera del alcance de esta feature.
- **FR-026b**: Esta feature MUST NOT ampliar la superficie de datos ya expuesta. Concretamente, no debe habilitarse ninguna vía de lectura que no exista hoy para un visitante anónimo.

  > ⚠️ **Riesgo aceptado, registrado el 2026-07-30.** FR-026a está redactado sobre lo que la web
  > *ofrece*, no sobre lo que el almacén de datos *permite*, y la diferencia es deliberada.
  >
  > Hoy, cualquiera con la clave anónima —que viaja en el bundle público— puede leer `telefono`,
  > `email` y `responsable` de todas las publicaciones publicadas consultando el almacén de datos
  > directamente, sin pasar por la web. Existen dos vías abiertas para eso, ninguna creada por esta
  > feature, ambas anteriores a ella (ver R-01 y la T040 de la feature 001).
  >
  > Se decidió **postergar el cierre** por tratarse de una demo con ventana acotada, con el mismo
  > criterio ya aplicado a T040. La decisión se apoya en un hecho verificable: **el inicio de sesión
  > no amplía esa exposición**, porque un miembro autenticado obtiene exactamente los mismos datos
  > que obtendría sin autenticarse.
  >
  > **Antes de pasar de demo a producción, las dos vías deben cerrarse.** Con datos comerciales
  > reales de empresas socias esto deja de ser deuda tolerable. El procedimiento está documentado
  > en R-01 para no tener que investigarlo de nuevo.

#### Alcance de la administración de publicaciones propias

- **FR-027**: Sobre una publicación propia ya aprobada, publicada o rechazada, un miembro MUST poder únicamente consultarla y ver sus solicitudes de contacto recibidas. No puede editarla, despublicarla, marcarla como no disponible ni eliminarla desde la web.
- **FR-028**: El sistema MUST NOT ampliar los permisos de escritura del miembro más allá de crear una publicación nueva y editar las propias en estado pendiente o faltan datos.

### Key Entities *(include if feature involves data)*

- **Perfil de miembro**: representa a la empresa socia dentro del sistema. Contiene empresa, persona responsable, teléfono, email y el rol que determina si además tiene atribuciones de administración. Es la fuente de los datos de contacto que se asocian a una publicación creada desde la web.
- **Sesión**: vínculo temporal entre una persona y un perfil de miembro. Determina qué publicaciones y qué solicitudes de contacto puede ver.
- **Publicación**: ya existe en el sistema. Esta feature agrega la capacidad de crearla y editarla desde la web, y de verla desde la perspectiva de su autor con independencia de su estado.
- **Solicitud de contacto**: ya existe y hoy la genera el visitante anónimo. Esta feature la hace visible por primera vez a su destinatario natural, el miembro autor de la publicación.
- **Estado de publicación**: el ciclo pendiente → faltan datos / aprobada → publicada / rechazada gobierna qué puede hacer el miembro con cada publicación y qué ve el público.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Un miembro con sus credenciales a mano llega desde el catálogo público hasta el listado de sus publicaciones en menos de 30 segundos.
- **SC-002**: El 100 % de las publicaciones de un miembro aparecen en su área, en todos los estados, sin excepciones ni omisiones.
- **SC-003**: Un miembro ve el 100 % de las solicitudes de contacto recibidas en sus publicaciones y el 0 % de las recibidas por otros miembros, verificado con al menos dos cuentas distintas con publicaciones y solicitudes cruzadas.
- **SC-004**: Ninguna función del área de miembro es accesible sin sesión activa, verificado intentando llegar por dirección directa a cada pantalla del área.
- **SC-005**: Consultados directamente con las credenciales que la aplicación web tiene disponibles, los objetos de lectura que esta feature agrega devuelven exclusivamente datos del miembro autenticado, verificado con dos cuentas distintas. Las vías de lectura ya abiertas antes de esta feature (FR-026b) quedan **fuera del alcance de este criterio** y se registran como estado conocido en cada corrida, nunca como verificadas.
- **SC-006**: El 100 % de las publicaciones creadas desde la web quedan fuera del catálogo público hasta ser aprobadas por una persona.
- **SC-007**: Un miembro completa la creación de una publicación en menos de 3 minutos sin ayuda externa.
- **SC-008**: El catálogo público mantiene el comportamiento verificado en la feature anterior: un visitante anónimo completa el recorrido de navegar, ver detalle y enviar solicitud de contacto sin degradación.
- **SC-009**: Un miembro identifica correctamente el estado de cada una de sus publicaciones sin necesidad de que se lo expliquen, verificado pidiéndole que interprete un listado con publicaciones en al menos tres estados distintos.

## Assumptions

- **Método de autenticación**: email y contraseña. Las cuentas de prueba ya existen con ese método, así que no se introduce un mecanismo nuevo.
- **Sin registro público**: la constitución del proyecto lo deshabilita explícitamente. Las cuentas las crea CAPEMISA fuera de la web.
- **Sin recuperación de contraseña**: fuera del alcance de la demo. Si un socio pierde la contraseña, CAPEMISA se la reasigna.
- **Sin verificación de email**: las cuentas de prueba ya están confirmadas.
- **Sin bloqueo por intentos fallidos**: no hay límite de reintentos de inicio de sesión en el alcance de la demo.
- **Sin eliminación ni baja de publicaciones desde la web**: decidido en FR-027. Si un socio necesita dar de baja algo ya publicado, lo pide por el canal habitual con CAPEMISA y lo resuelve una persona con rol de administración.
- **Superficie de escritura acotada**: el miembro solo escribe en dos lugares — crear una publicación y editar las propias no publicadas. Ninguna otra operación de escritura se habilita en esta feature.
- **Las solicitudes de contacto se leen, no se gestionan**: el miembro las ve, pero marcarlas como contactadas o cerradas es una atribución de administración y queda fuera de esta feature.
- **Idioma**: toda la interfaz en español rioplatense, igual que el catálogo público.
- **El canal de WhatsApp sigue funcionando sin cambios**: esta feature agrega un canal, no reemplaza el existente.
- **Volumen**: se asume un puñado de miembros y menos de 50 publicaciones activas durante la demo; no hay requisitos de paginación ni de escala.

## Dependencies

- **Feature 001 (catálogo público)**: esta feature se construye sobre la navegación pública existente y no debe degradarla. Con FR-026 resuelto, el catálogo no cambia en absoluto: la vía de lectura pública sigue siendo la misma para todos.
- **Perfiles y cuentas precargadas**: depende de que las cuentas de prueba y sus perfiles asociados existan en el sistema.
- **Aprobación manual, externa a la web** (FR-023): US3 entrega valor solo si alguien revisa efectivamente lo pendiente. Como el circuito es manual y fuera de la web, es una dependencia **operativa**, no técnica: si nadie mira la cola, el miembro publica y nunca pasa nada. Conviene acordar con CAPEMISA quién mira y cada cuánto antes de mostrar la demo.
- **Permiso de lectura de solicitudes de contacto**: hoy el modelo de datos no contempla que un miembro lea las solicitudes de sus publicaciones. Habilitarlo es condición para US2 y es **el único cambio de modelo de datos que esta feature requiere** — las respuestas a FR-026 y FR-027 evitaron todos los demás.
