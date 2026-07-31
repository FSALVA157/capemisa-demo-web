# Research — Login y área de miembro

**Feature**: 002-login-area-miembro
**Phase**: 0
**Date**: 2026-07-30

La constitución (v1.0.1) congela stack, deploy, testing y layout, así que la investigación se concentra en decisiones propias de esta feature. Cada entrada = `Decision / Rationale / Alternatives considered`.

**R-01 documenta un problema de seguridad preexistente que se decidió postergar.** Leerla primero: explica qué está expuesto hoy y por qué esta feature igual puede avanzar.

---

## R-01 — Acceso a la tabla base `publicaciones` al introducir el rol `authenticated`

### El hallazgo

`db/01_schema.sql:114` define:

```sql
CREATE POLICY publicaciones_select_publica ON public.publicaciones
  FOR SELECT TO anon, authenticated
  USING (estado = 'publicada');
```

Dos propiedades de Postgres que se combinan mal acá:

1. **RLS filtra filas, no columnas.** No existe forma de que una política limite qué columnas devuelve un `SELECT`. El recorte por columna se hace con `GRANT`, no con RLS.
2. **Las políticas se combinan con OR.** Un miembro autenticado obtiene la unión de `publicaciones_select_publica` (todas las publicadas) y `publicaciones_select_propia` (las suyas).

Consecuencia: si el rol tiene privilegio de tabla sobre `publicaciones`, un `SELECT telefono, email, responsable FROM publicaciones WHERE estado='publicada'` devuelve datos de contacto de **todos** los miembros. Hoy eso alcanza a `anon`; al agregar login, alcanza también a cada miembro.

Esto **contradice FR-026a directamente** ("el sistema MUST NOT habilitar ninguna vía de lectura de datos de contacto de un miembro hacia otro miembro a través de la web"), y es la misma clase de problema que la feature 001 corrigió en `publicaciones_searchable` — entrando por otra puerta. La vista se arregló; la tabla base nunca se revisó.

### El agujero está abierto, y se puede demostrar sin consultar la base

`db/*.sql` **no contiene ningún `GRANT` ni `REVOKE` sobre las tres tablas base** — solo sobre las dos vistas. Los privilegios de tabla vienen de la configuración por defecto de Supabase, que no está versionada acá. La primera redacción de esta sección concluía que desde el repo no se podía saber si el acceso estaba abierto.

**Sí se puede, y está abierto.** La evidencia ya estaba registrada. En `specs/001-catalogo-publico/quickstart.md`, registro del 2026-07-29:

> Verificado con la anon key: pedir columnas PII devuelve `42703 column does not exist`, y solo se ven filas `publicada`.

Esa consulta fue contra `publicaciones_publicas` y **devolvió filas**. Esa vista está creada `WITH (security_invoker = true)`, o sea que se ejecuta con los privilegios de quien consulta. Para que devuelva filas al rol anónimo, `anon` **tiene que** tener `SELECT` sobre `public.publicaciones`. No hay otra forma.

Combinado con la política `publicaciones_select_publica` y la ausencia de privilegios por columna, la conclusión es directa: **cualquiera con la anon key puede leer `telefono`, `email` y `responsable` de todas las publicaciones publicadas.** La anon key viaja en el bundle público de la web.

Conviene confirmarlo igual antes de tocar nada, porque podría existir un privilegio por columna definido fuera del repositorio:

```bash
ANON=<anon key>
URL=https://dpxfcmhgdieqvgdlqljf.supabase.co/rest/v1

curl -s "$URL/publicaciones?select=empresa,telefono,email,responsable&limit=3" \
     -H "apikey: $ANON" -H "Authorization: Bearer $ANON"
```

### Consecuencia para esta feature: R-01 NO la bloquea

Si el acceso ya está abierto para `anon`, entonces **el login no amplía la exposición en absoluto**. Un miembro autenticado obtiene exactamente los mismos datos que obtendría cerrando sesión, porque la anon key es pública. La primera versión de esta investigación planteó R-01 como prerequisito de US1; **eso era incorrecto**, y la corrección importa porque cambia todo el plan de implementación.

Lo que sí es riesgo **nuevo** de esta feature son otros dos objetos:

| Objeto | Riesgo que introduce | Verificación |
|---|---|---|
| Vista `mis_publicaciones` | Si el filtro por autor está mal, un miembro ve publicaciones y teléfonos de otros | Puntos 4 y 5 de `contracts/db-changes.md` |
| Política `consultas_select_autor` | Si la condición de autoría está mal, un miembro lee las solicitudes de otro | Puntos 6 y 7 |

Esas cuatro verificaciones son innegociables: abren puertas que **hoy no existen**. Las verificaciones sobre la tabla base documentan un estado preexistente, no algo que esta feature cause.

### Decision (2026-07-30)

**Se posterga la corrección. Esta feature no toca los privilegios de la tabla base ni la vista `publicaciones_publicas`.** Queda registrado como riesgo aceptado, con el mismo criterio que la T040 de la feature 001, y por las mismas razones: es una demo con ventana acotada y el problema es preexistente.

Lo que **sí** se hace en esta feature:

- `mis_publicaciones` se crea **`WITH (security_invoker = true)`**, apoyándose en la política `publicaciones_select_propia` que ya existe. Conserva el RLS como segunda barrera, coherente con la arquitectura decidida en la feature 001.
- Se agrega la política de lectura de solicitudes por autor (R-05).
- No se aplica ningún `REVOKE`. No se modifica `publicaciones_publicas`.

### Lo que se acepta a sabiendas

Cualquiera con la anon key —que viaja en el bundle público— puede leer `telefono`, `email`, `responsable` y `observaciones_internas` de todas las publicaciones en estado `publicada`, consultando la tabla base directamente. **Esto es cierto hoy y sigue siéndolo después de esta feature.** El login no lo agrava.

Sumado a la T040 abierta de la feature 001 (`publicaciones_searchable` con acceso anónimo, que además expone filas no publicadas), la superficie expuesta actual del proyecto son **dos puertas** a los mismos datos de contacto. Ninguna la abre esta feature.

**Antes de que el proyecto pase de demo a producción, las dos tienen que cerrarse.** Con datos comerciales reales de empresas socias, esto deja de ser deuda tolerable.

### Cómo se cierra cuando llegue el momento

Registrado acá para no volver a investigarlo desde cero:

```sql
REVOKE SELECT ON public.publicaciones FROM anon, authenticated;
```

Y como `publicaciones_publicas` es `security_invoker`, el revoke **la rompe**: dejaría de funcionar para anónimos y el catálogo público se caería. Hay dos salidas excluyentes:

**Opción A — vistas `security_definer` con filtro propio.** Quitarles `security_invoker` y que cada una lleve su `WHERE` escrito (`estado='publicada'` y `autor_id = auth.uid()`). Corren con privilegios del propietario, así que el revoke no las afecta.

- A favor: cierra por completo el acceso directo a la tabla base.
- En contra: se pierde el RLS como segunda barrera. Va en dirección contraria al arreglo de la feature 001, donde `security_invoker` fue precisamente la solución. El contexto es distinto —allá el problema era una vista con `p.*` que salteaba el RLS— pero es un cambio que se malinterpreta fácil seis meses después.

**Opción B — privilegios por columna sobre la tabla base.** Mantener `security_invoker` y reemplazar el privilegio amplio por uno acotado a las columnas sin PII.

- A favor: conserva el RLS como barrera efectiva y no cambia la arquitectura.
- En contra: `publicaciones_publicas` calcula `search_text` a partir de `texto_whatsapp`, y con `security_invoker` esa expresión se evalúa con los privilegios del consultante — así que `texto_whatsapp` tendría que estar en el grant, y `anon` podría leerlo directo. Además la lista de columnas queda duplicada en dos lugares y se desincroniza sin aviso.

Decidir entre A y B cuando se aborde, no ahora. La elección depende de si para entonces sigue existiendo el bot de n8n con sus dependencias actuales.

### Alternatives considered

- **Aplicar la corrección dentro de esta feature** (era la recomendación original): se descartó al comprobar que el login no amplía la exposición. Habría implicado tocar la vista del catálogo en producción, con riesgo de dejarlo caído, para cerrar un agujero que esta feature no abre. Mal balance para una demo.
- **Restringir la política a `TO anon` únicamente**: no resuelve nada. El problema no es qué rol tiene la política, sino que el RLS no recorta columnas y que `anon` ya está expuesto.
- **Postergar sin registrarlo**: dejaría FR-026a incumplido en silencio y el próximo análisis de consistencia volvería a levantarlo sin contexto. Por eso el requisito se ajustó explícitamente en la spec en lugar de ignorarlo.

---

## R-02 — Gestión de sesión en el cliente

**Decision**: usar Supabase Auth con email y contraseña (`signInWithPassword`), con persistencia de sesión en el navegador (comportamiento por defecto del cliente ya instalado) y un `AuthProvider` propio en React que expone `session`, `perfil` y `cargando` mediante contexto. El provider se suscribe a los cambios de estado de autenticación para reaccionar a expiración, cierre de sesión y sesiones abiertas en otra pestaña.

**Rationale**: el cliente de Supabase ya está en el proyecto y renueva el token solo; no hace falta manejar refresh a mano. Un contexto único evita que cada componente consulte la sesión por su cuenta y quede inconsistente. La suscripción a cambios de estado cubre el edge case de dos pestañas abiertas sin lógica adicional.

**Alternatives considered**:
- Guardar la sesión en el estado de TanStack Query: mezcla dos responsabilidades y complica la invalidación al cerrar sesión.
- Consultar la sesión en cada componente: repite lógica y produce parpadeos distintos en cada pantalla.
- Sesión solo en memoria (sin persistencia): obliga a reautenticarse en cada recarga; peor demo sin ganancia real de seguridad en este contexto.

---

## R-03 — Protección de rutas

**Decision**: un componente de ruta protegida que envuelve las rutas del área de miembro. Mientras el estado de sesión se está resolviendo muestra un esqueleto de carga; si no hay sesión, redirige a la pantalla de inicio de sesión conservando el destino original para volver ahí después de autenticarse.

**Rationale**: cumple FR-007 con una sola pieza reutilizable. El estado intermedio de carga importa: sin él, al recargar una página del área el usuario ve un destello de redirección a login aunque tenga sesión válida, porque la sesión se resuelve de forma asincrónica.

**Es protección de interfaz, no de datos.** La barrera real son las políticas de la base (FR-010). Esta pieza mejora la experiencia; no se la debe contar como control de seguridad, y el criterio SC-005 exige verificar la barrera de datos por separado.

**Alternatives considered**:
- Verificar sesión dentro de cada página: repite lógica y es fácil olvidarse en una pantalla nueva.
- Redirigir desde un efecto en cada componente: produce parpadeo de contenido antes de redirigir.

---

## R-04 — Lectura de "mis publicaciones"

**Decision**: leer desde una vista nueva `mis_publicaciones`, creada **`WITH (security_invoker = true)`**, que expone todos los estados y filtra por autor. La lista incluye la cantidad de solicitudes recibidas por publicación (FR-012).

**Rationale**: el miembro necesita ver sus publicaciones en cualquier estado, lo que el catálogo público no permite por diseño. Con `security_invoker`, la vista respeta el RLS de la tabla base: la política `publicaciones_select_propia` (`autor_id = auth.uid()`) ya restringe las filas al autor, y el `WHERE` de la vista actúa como segunda barrera. **Dos barreras, no una** — coherente con la arquitectura de la feature 001 y con la decisión de R-01 de no aplicar el revoke ahora.

**Cuidado con una interacción no obvia**: las políticas de `publicaciones` se combinan con OR, y `publicaciones_select_publica` alcanza también a `authenticated`. Sin el `WHERE autor_id = auth.uid()` en la vista, un miembro vería además **todas las publicadas de otros miembros con sus teléfonos**. El filtro de la vista no es redundante con el RLS: es el que hace el trabajo. Verificarlo con dos cuentas (puntos 4 y 5 de `contracts/db-changes.md`).

**Sobre el conteo de interesados**: exponerlo como columna calculada en la vista evita una consulta por fila en el cliente. Hay que tener presente que ese conteo se evalúa con los mismos privilegios que la vista, así que debe contar solo las solicitudes de publicaciones propias — se resuelve solo si la vista ya filtra por `autor_id`.

**Alternatives considered**:
- Consultar la tabla base con la política `publicaciones_select_propia`: descartado por R-01.
- Contar interesados en el cliente con una consulta aparte por publicación: N+1 innecesario con volumen conocido y bajo.

---

## R-05 — Permiso de lectura de solicitudes de contacto por el autor

**Decision**: agregar una política de lectura sobre `consultas` que habilite al autor de la publicación asociada. La verificación de autoría se resuelve con una función auxiliar `SECURITY DEFINER`, en lugar de una subconsulta directa a `publicaciones` dentro de la política.

```sql
CREATE OR REPLACE FUNCTION public.es_autor_de(pub_id uuid)
RETURNS boolean
LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.publicaciones
    WHERE id = pub_id AND autor_id = auth.uid()
  );
$$;

CREATE POLICY consultas_select_autor ON public.consultas
  FOR SELECT TO authenticated
  USING (public.es_autor_de(publicacion_id));
```

**Rationale**: con la decisión de R-01 de no aplicar el revoke ahora, una subconsulta directa a `publicaciones` **también funcionaría** — la política `publicaciones_select_propia` le daría acceso a sus propias filas. Así que la función no es estrictamente necesaria hoy. Se elige igual por tres razones:

1. **Sobrevive al cierre de R-01.** El día que se aplique el revoke, una subconsulta directa perdería el privilegio y la política dejaría de encontrar coincidencias: el miembro vería **cero solicitudes sin ningún error**. Con la función, ese cambio no la afecta.
2. **Aísla la política del RLS de la otra tabla.** Una subconsulta arrastra las políticas de `publicaciones` a la evaluación de cada fila de `consultas`; la función corta esa dependencia.
3. **El proyecto ya usa este patrón** en `is_admin()`. No introduce una técnica nueva ni un concepto que haya que explicar.

Es una decisión de robustez barata, no una necesidad técnica del momento. Vale dejarlo claro para que nadie la "simplifique" más adelante creyendo que sobra.

**Nota**: la política existente `consultas_select_admin` sigue vigente y se combina con OR, así que un administrador conserva la visibilidad completa.

**Alternatives considered**:
- Subconsulta directa en la política: se rompe con R-01, como se explicó.
- Denormalizar `autor_id` en `consultas`: evita el join, pero duplica un dato que puede desincronizarse y modifica una tabla que ya está en producción.
- Exponer las solicitudes por una vista en vez de una política: la restricción quedaría en la vista y no en la tabla, así que un acceso directo a `consultas` seguiría filtrando. La política es la barrera correcta.

---

## R-06 — Creación y edición de publicaciones

**Decision**: formulario con react-hook-form y zod, mismo patrón que el diálogo de solicitud de contacto de la feature 001. El esquema de validación vive en un archivo propio. La escritura usa `insert` y `update` del cliente Supabase apuntando a la **tabla base** (no a una vista), amparada en las políticas `publicaciones_insert_auth` y `publicaciones_update_propia` que ya existen.

**Rationale**: las políticas de escritura ya vigentes hacen exactamente lo que la spec pide: el insert obliga a que el autor sea quien escribe, y el update solo permite estados pendiente y faltan datos, que es literalmente FR-019 y FR-020.

Los campos `empresa`, `responsable`, `telefono` y `email` se toman del perfil (FR-018) y se envían en el insert; no se piden en el formulario. El campo `estado` se omite deliberadamente para que tome el valor por defecto `'pendiente'` del esquema, cumpliendo FR-016 sin lógica de cliente.

**A tener presente para el futuro**: al no aplicarse el revoke de R-01, una escritura que pida devolver la fila insertada funciona sin problema. El día que se cierre R-01 dejaría de funcionar, porque devolver la fila requiere privilegio de **lectura**. Conviene no pedir retorno de datos aunque hoy se pueda, para no dejar una trampa en el camino.

**Alternatives considered**:
- Pedir los datos de contacto en el formulario: contradice FR-018 y permite que diverjan del perfil.
- Fijar `estado` explícitamente desde el cliente: funciona, pero pone en el cliente una regla que ya está en la base. Omitirlo es más robusto.

---

## R-07 — Perfil del miembro

**Decision**: tras autenticarse, el `AuthProvider` consulta el perfil del usuario y lo mantiene en contexto. La política `perfiles_select_self` ya permite esta lectura.

**Rationale**: el perfil aporta la empresa a mostrar en la interfaz (FR-006) y los datos de contacto para las publicaciones nuevas (FR-018). Traerlo una sola vez al iniciar sesión evita repetir la consulta en cada pantalla.

**Caso a contemplar**: una cuenta de autenticación sin fila en `perfiles` deja al miembro autenticado pero sin datos. No debería ocurrir con las cuentas precargadas, pero la interfaz no tiene que romperse si pasa — mostrar un mensaje claro en lugar de una pantalla en blanco.

---

## R-08 — Sesión expirada durante la carga de un formulario

**Decision**: al fallar una escritura por sesión inválida, conservar lo cargado en el formulario, informar que la sesión expiró y ofrecer volver a autenticarse. No descartar los datos ni redirigir de inmediato.

**Rationale**: es el edge case señalado en la spec. El cliente de Supabase renueva el token automáticamente, así que la expiración durante una sesión activa es poco probable; el caso realista es la pestaña abierta desde ayer. Perder un formulario largo por eso es la clase de detalle que arruina una demo.

**Alternatives considered**:
- Redirigir a login al detectar expiración: pierde el trabajo cargado.
- Guardar borradores en el navegador: agrega estado y complejidad que la spec no pide (YAGNI).

---

## R-09 — Testing

**Decision**: validación manual y visual, documentada en `quickstart.md`, igual que la feature 001. Sin framework de pruebas automatizadas.

**Rationale**: Principio V de la constitución y coherencia con la feature anterior.

**Con una exigencia agregada**: por SC-005 y por lo aprendido en la feature 001, las verificaciones de control de acceso **no se hacen desde la interfaz**. Se hacen consultando la API directamente con las credenciales que tiene la aplicación web, y con dos cuentas distintas para probar el cruce. Un check que mira lo que hace la interfaz puede pasar sobre un modelo de datos inseguro — ya ocurrió una vez en este proyecto.

---

## Resumen de decisiones

| ID | Decisión resumida |
|----|-------------------|
| R-01 | **Riesgo aceptado.** La tabla base es legible con PII por cualquiera con la anon key; preexistente, el login no lo agrava. Se posterga junto con T040 y se registra cómo cerrarlo |
| R-02 | Supabase Auth email/contraseña con `AuthProvider` en contexto |
| R-03 | Ruta protegida con estado de carga; es interfaz, no seguridad |
| R-04 | "Mis publicaciones" desde vista propia, con conteo de interesados incluido |
| R-05 | Política de lectura de solicitudes por autor, apoyada en función `SECURITY DEFINER` |
| R-06 | Formulario react-hook-form + zod; escritura a tabla base con políticas existentes |
| R-07 | Perfil cargado una vez al autenticarse y mantenido en contexto |
| R-08 | Sesión expirada: conservar el formulario, no descartar |
| R-09 | Validación manual; controles de acceso verificados contra la API, no la interfaz |
