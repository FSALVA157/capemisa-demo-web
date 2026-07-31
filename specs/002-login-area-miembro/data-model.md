# Data Model — Login y área de miembro

**Feature**: 002-login-area-miembro
**Phase**: 1 (design)
**Date**: 2026-07-30

Esta feature **no crea tablas**. Consume el esquema de `db/01_schema.sql` y agrega tres objetos: una vista, una función auxiliar y una política. Todos requieren ejecución humana contra Supabase (constitución, Development Workflow).

Referencia canónica: `db/01_schema.sql`.

---

## Objetos nuevos que esta feature requiere

| Objeto | Tipo | Motivo | Requisito |
|---|---|---|---|
| `mis_publicaciones` | vista | El miembro necesita ver sus publicaciones en todos los estados sin leer la tabla base | FR-008, FR-011, FR-012, R-01 |
| `es_autor_de(uuid)` | función `SECURITY DEFINER` | Verificar autoría dentro de una política sin depender de privilegios del consultante | R-05 |
| `consultas_select_autor` | política `SELECT` | Habilitar al autor a leer las solicitudes de sus publicaciones | FR-009, US2 |

**No se modifica ningún objeto existente.** En particular, `publicaciones_publicas` no se toca y no se revoca ningún privilegio: R-01 documenta que la tabla base es legible con datos de contacto por cualquiera con la clave anónima, pero su cierre se postergó porque el login no amplía esa exposición. Riesgo aceptado y registrado en FR-026b.

---

## Entidad: Perfil

**Tabla**: `public.perfiles`. Ya existe; esta feature solo la lee.

| Columna | Uso en la feature |
|---|---|
| `id` | Coincide con el identificador de la cuenta de autenticación. Es el vínculo entre sesión y perfil. |
| `rol` | `miembro` o `admin`. Esta feature no distingue funciones por rol; se lee para no romper la interfaz con una cuenta de administración. |
| `empresa` | Se muestra en la interfaz para indicar qué sesión está activa (FR-006) y se copia a la publicación al crearla (FR-018). |
| `responsable`, `telefono`, `email` | Se copian a la publicación al crearla (FR-018). No se piden en el formulario. |

**Política vigente**: `perfiles_select_self` permite leer el perfil propio (o todos, si es administración). No requiere cambios.

**Regla que impacta la UX**: una cuenta de autenticación sin fila en `perfiles` deja al miembro sin empresa ni datos de contacto. La interfaz debe degradar con un mensaje claro, no con una pantalla vacía (ver R-07).

---

## Entidad: Publicación

**Tabla**: `public.publicaciones`. Ya existe.

### Lectura

Ninguna lectura de esta feature toca la tabla base (R-01). Dos vistas cubren los dos casos:

| Caso | Vista | Filtro | Estados visibles |
|---|---|---|---|
| Catálogo público (anónimo **y** miembro, FR-026) | `publicaciones_publicas` (ya existe) | `estado = 'publicada'` | solo `publicada` |
| Área de miembro | `mis_publicaciones` (nueva) | `autor_id = auth.uid()` | todos |

### Vista `mis_publicaciones` (nueva)

Devuelve las publicaciones del miembro autenticado en cualquier estado, más el conteo de solicitudes recibidas.

**Columnas expuestas**: todas las que el miembro cargó o que la generación asistida produjo sobre sus propias publicaciones — incluidos `telefono`, `email` y `responsable`, que son **datos propios**, no de terceros. Se agrega:

- `cantidad_consultas` — cuántas solicitudes de contacto recibió la publicación (FR-012).

**Columnas deliberadamente excluidas**: `observaciones_internas`, que es anotación interna de CAPEMISA sobre la publicación y no corresponde mostrarle al miembro.

**Filtro**: `autor_id = auth.uid()`, escrito en la definición de la vista, que se crea `WITH (security_invoker = true)` para que además respete el RLS de la tabla base.

**Ese filtro no es redundante con el RLS, es el que hace el trabajo.** Las políticas de `publicaciones` se combinan con **OR**, y `publicaciones_select_publica` alcanza también a `authenticated`. Sin el `WHERE`, un miembro vería sus propias publicaciones **más todas las publicadas de los demás, con teléfono, email y responsable**. Es el punto más delicado del diseño.

> ⚠️ **Punto de revisión obligatorio.** Antes de dar por buena esta vista, verificar con dos cuentas
> distintas que cada una ve exclusivamente lo propio, consultando la API directamente y no a través
> de la interfaz. Es el mismo error que costó la corrección de la feature 001: una vista mal
> construida no da error, devuelve datos de más.

### Escritura

La escritura sí va contra la tabla base, amparada en políticas que ya existen:

| Operación | Política vigente | Efecto |
|---|---|---|
| Crear publicación | `publicaciones_insert_auth` — `WITH CHECK (autor_id = auth.uid())` | Un miembro solo puede crear publicaciones a su nombre |
| Editar publicación propia | `publicaciones_update_propia` — `autor_id = auth.uid() AND estado IN ('pendiente','faltan_datos')` | Cumple FR-019 y FR-020 sin cambios |

**No se agrega ninguna política de escritura** (FR-028). En particular no existe política de `DELETE`, así que el borrado desde la web es imposible por construcción, que es lo que FR-027 decidió.

### Estados y qué habilitan

```text
   (creación por el miembro)
            │
            ▼
        pendiente ──────────► aprobada ──────► publicada
         │      ▲                                  │
         ▼      │                                  │
   faltan_datos ┘                                  │
         │                                         │
         └──────────► rechazada ◄──────────────────┘
```

| Estado | ¿Visible en el catálogo? | ¿El miembro puede editar? |
|---|---|---|
| `pendiente` | no | **sí** |
| `faltan_datos` | no | **sí** |
| `aprobada` | no | no |
| `publicada` | **sí** | no |
| `rechazada` | no | no |

Las transiciones entre estados **no ocurren desde la web** en esta feature. Las hace una persona con rol de administración operando directamente sobre la base (FR-023). El miembro solo puede crear (entra en `pendiente`) y editar mientras siga en `pendiente` o `faltan_datos`.

**Regla que impacta la UX**: la interfaz debe derivar de este cuadro qué acciones ofrece. Mostrar un botón de editar en una publicación publicada produce un fallo silencioso: RLS no devuelve error, simplemente no actualiza ninguna fila.

---

## Entidad: Solicitud de contacto

**Tabla**: `public.consultas`. Ya existe; hoy solo se escribe.

| Columna | Uso en la feature | Notas |
|---|---|---|
| `publicacion_id` | Vincula la solicitud con la publicación; es la base de la verificación de autoría | Referencia a `publicaciones`. |
| `empresa_interesada`, `persona_contacto`, `telefono` | Se muestran al autor | Obligatorios al enviar. |
| `email`, `motivo`, `urgencia` | Se muestran al autor si existen | **Opcionales**: la interfaz debe verse bien con los tres vacíos (edge case de la spec). |
| `estado_seguimiento` | **No se muestra ni se modifica** | Es seguimiento interno de CAPEMISA; gestionarlo es atribución de administración, fuera de esta feature. |
| `created_at` | Fecha de la solicitud, visible | Orden descendente por defecto. |

### Políticas

| Política | Estado | Efecto |
|---|---|---|
| `consultas_insert_open` | ya existe | Cualquiera puede enviar una solicitud. Sin cambios (FR-024). |
| `consultas_select_admin` | ya existe | Administración ve todas. Sin cambios. |
| `consultas_select_autor` | **nueva** | El autor de la publicación ve las solicitudes de esa publicación. |

Las políticas se combinan con OR, así que agregar la tercera no restringe a las dos existentes.

**Por qué la verificación de autoría usa una función `SECURITY DEFINER`**: hoy una subconsulta directa a `publicaciones` también funcionaría. Se usa la función igual porque sobrevive al cierre futuro de R-01 —donde una subconsulta perdería el privilegio y la política devolvería cero filas **sin ningún error**—, porque aísla la política del RLS de la otra tabla, y porque replica el patrón de `is_admin()`. Detalle en R-05.

**No se agrega política de `UPDATE` ni `DELETE` sobre `consultas`**: el miembro las lee, no las gestiona.

---

## Entidad: Sesión

No es una tabla del esquema de la aplicación; la administra el servicio de autenticación. Lo relevante para el modelo de datos:

- El identificador de la cuenta autenticada es lo que devuelve `auth.uid()` dentro de las políticas y las vistas, y es la clave de `perfiles`.
- Sin sesión, `auth.uid()` es nulo: la vista `mis_publicaciones` no devuelve nada y la política de solicitudes tampoco. **El área de miembro sin sesión no falla con error, devuelve vacío** — coherente con no revelar existencia de recursos, pero hay que evitar que la interfaz lo muestre como "no tenés publicaciones" a alguien cuya sesión expiró.

---

## Resumen del impacto sobre la base

| Cambio | Tipo | Bloquea a |
|---|---|---|
| Crear vista `mis_publicaciones` | nuevo | US1 |
| Crear función `es_autor_de(uuid)` | nuevo | US2 |
| Crear política `consultas_select_autor` | nuevo | US2 |
| Ninguna política de escritura nueva | — | — |
| Ningún objeto existente modificado | — | — |
| Ningún privilegio revocado | — | — |

Los cambios van en un archivo SQL nuevo bajo `db/`, siguiendo la numeración existente, con el mismo estilo de comentarios explicativos que `db/04_public_view.sql`: qué hace, por qué existe, y qué se rompe si alguien lo "arregla" sin contexto. El encabezado debe incluir además qué cosas el archivo **deliberadamente no hace**, y por qué (FR-026b).

**Lo que estos tres objetos abren, y por eso hay que verificar**: son las únicas vías nuevas por las que un miembro podría llegar a datos de otro. Las verificaciones 2 a 5 de `contracts/db-changes.md` existen exactamente para eso, y necesitan dos cuentas de miembro.
