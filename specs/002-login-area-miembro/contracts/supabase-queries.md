# Contract — Operaciones contra Supabase

**Feature**: 002-login-area-miembro

Roles en juego: **`anon`** para el catálogo público (sin cambios respecto de la feature 001) y **`authenticated`** para todo el área de miembro. El cliente se inicializa con la misma anon key; el token de sesión se agrega automáticamente tras iniciar sesión.

**Regla transversal**: ninguna **lectura** apunta a la tabla base `publicaciones` (R-01). Las **escrituras** sí, amparadas en políticas existentes.

---

## A1 — Iniciar sesión

Autenticación con email y contraseña.

**Errores esperados**:

| Origen | Reacción de interfaz |
|---|---|
| Credenciales inválidas | Mensaje genérico que no revela si el email existe (FR-005) |
| Red | Mensaje distinto, con opción de reintentar |

---

## A2 — Cerrar sesión

Cierra la sesión y limpia los datos en memoria del área de miembro, para que no queden visibles al navegar hacia atrás.

---

## A3 — Estado de sesión

Suscripción a los cambios de estado de autenticación. Cubre inicio, cierre, expiración y sesiones abiertas en otra pestaña (R-02).

**Importante**: mientras el estado inicial se resuelve, la interfaz muestra carga, **no** ausencia de sesión. Sin esto, recargar una página del área produce un destello de redirección a la pantalla de acceso (R-03).

---

## Q1 — Perfil del miembro

```ts
supabase.from('perfiles').select('id, rol, empresa, responsable, telefono, email')
  .eq('id', <id de la sesión>).maybeSingle()
```

**Política**: `perfiles_select_self`, ya existente.

**Uso**: mostrar la empresa de la sesión activa (FR-006) y completar los datos de contacto al crear una publicación (FR-018).

**Caso a contemplar**: si devuelve nulo, la cuenta no tiene perfil. Mostrar un mensaje claro; no dejar la pantalla vacía (R-07).

---

## Q2 — Listado de mis publicaciones

```ts
supabase.from('mis_publicaciones')
  .select('id, tipo_publicacion, descripcion, descripcion_comercial, zona, estado, imagen_url, cantidad_consultas, created_at')
  .order('created_at', { ascending: false })
```

**Sin filtro por autor en el cliente**: lo aplica la vista (`WHERE autor_id = auth.uid()`). Agregar un filtro en el cliente daría una falsa sensación de control — el que importa es el de la vista.

**Devuelve publicaciones en todos los estados** (FR-008), incluidas las rechazadas (decisión de la spec en Edge Cases).

**Comportamiento esperado**:
- Con sesión y publicaciones → la lista propia.
- Con sesión sin publicaciones → arreglo vacío → estado vacío que invita a crear la primera.
- **Sin sesión → arreglo vacío, no error.** La interfaz no debe mostrar esto como "no tenés publicaciones": es sesión ausente. La ruta protegida debería haberlo evitado antes.

---

## Q3 — Detalle de una publicación propia

```ts
supabase.from('mis_publicaciones').select('*').eq('id', id).maybeSingle()
```

**Resultado nulo** cubre por igual "no existe" y "es de otro miembro" — indistinguibles a propósito (edge case de la spec). La interfaz muestra no encontrada en ambos casos.

---

## Q4 — Interesados de una publicación propia

```ts
supabase.from('consultas')
  .select('id, empresa_interesada, persona_contacto, telefono, email, motivo, urgencia, created_at')
  .eq('publicacion_id', id)
  .order('created_at', { ascending: false })
```

**Política**: `consultas_select_autor` (nueva). El filtro por autoría lo aplica la política, no el cliente.

**No se selecciona `estado_seguimiento`**: es seguimiento interno de CAPEMISA, fuera del alcance.

**Comportamiento esperado**:
- Publicación propia con solicitudes → la lista.
- Publicación propia sin solicitudes → vacío → estado vacío explícito.
- **Publicación de otro miembro → vacío, no error.** Consistente con Q3.

**`email`, `motivo` y `urgencia` pueden ser nulos**: la interfaz debe indicar que el interesado no los dejó, en lugar de mostrar un hueco.

---

## M1 — Crear publicación

```ts
supabase.from('publicaciones').insert({
  autor_id: <id de la sesión>,
  empresa, responsable, telefono, email,   // desde el perfil (Q1), no del formulario
  tipo_publicacion, descripcion, zona, condicion_comercial,
  disponibilidad, vencimiento, imagen_url,
})
```

**Política**: `publicaciones_insert_auth` — `WITH CHECK (autor_id = auth.uid())`.

**`estado` se omite deliberadamente** para que tome el valor por defecto `'pendiente'` del esquema. Así FR-016 lo garantiza la base, no una línea de cliente que alguien puede cambiar sin darse cuenta.

**Campos de generación asistida omitidos** (`rubro`, `subrubro`, `descripcion_comercial`, `texto_whatsapp`, `urgencia`, `matches`): los produce el flujo de CAPEMISA y los cura una persona (Principio II).

**Preferir una escritura que no pida retorno de datos** (R-06). Hoy pedirlo funcionaría, porque el privilegio de lectura sobre la tabla base sigue vigente. Dejaría de funcionar el día que se cierre R-01, y sería un fallo difícil de rastrear meses después. No es una consecuencia de esta feature: es no dejar una trampa en el camino.

---

## M2 — Editar publicación propia

```ts
supabase.from('publicaciones').update({ ...campos editables }).eq('id', id)
```

**Política**: `publicaciones_update_propia` — `autor_id = auth.uid() AND estado IN ('pendiente','faltan_datos')`.

**Comportamiento que hay que anticipar**: si el estado ya no lo permite, **RLS no devuelve error**: simplemente no actualiza ninguna fila. La interfaz debe detectar que no se modificó nada y explicarlo, en lugar de confirmar un guardado que no ocurrió. Es la trampa principal de esta operación.

**`estado` y `autor_id` no se incluyen** entre los campos editables.

---

## Operaciones que esta feature NO ejecuta

- Ningún borrado, sobre ninguna tabla (FR-027, FR-028).
- Ninguna escritura sobre `consultas` desde el área de miembro.
- Ninguna transición de estado de publicación: las hace una persona fuera de la web (FR-023).
- Ninguna lectura de datos de contacto de otros miembros (FR-026a).
- Ninguna lectura directa de la tabla base `publicaciones` (R-01).

---

## Contrato de errores

| Origen | Señal | Reacción de interfaz |
|---|---|---|
| Credenciales inválidas | Error de autenticación | Mensaje genérico, sin revelar si el email existe |
| Sin sesión en ruta protegida | Sesión ausente tras resolverse | Redirección a la pantalla de acceso, conservando el destino |
| Sesión expirada durante una escritura | Error de autorización al guardar | **Conservar el formulario**, informar, ofrecer reautenticarse (R-08) |
| Actualización sin filas afectadas | Cero filas modificadas, sin error | Explicar que el estado ya no permite editar — **no** confirmar el guardado |
| Lectura de recurso ajeno | Resultado vacío, sin error | No encontrado, igual que si no existiera |
| Red | Fallo de conexión | Aviso con opción de reintentar |

**Patrón a tener presente**: con RLS, el acceso denegado casi nunca llega como error. Llega como **vacío**. Toda la interfaz de esta feature tiene que distinguir "no hay datos" de "no tenés permiso" sin apoyarse en códigos de error.
