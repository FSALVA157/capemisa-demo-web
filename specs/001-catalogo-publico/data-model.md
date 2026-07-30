# Data Model — Catálogo público de publicaciones

**Feature**: 001-catalogo-publico
**Phase**: 1 (design)
**Date**: 2026-07-23

Esta feature **no define ni modifica tablas**. Consume el schema desplegado en `/db/01_schema.sql` y lee a través de la vista de `/db/04_public_view.sql` (creada por esta feature el 2026-07-29 para cerrar el problema de RLS/PII que se describe más abajo; la redacción original de este archivo apuntaba a `/db/03_search_view.sql`). Este archivo documenta qué entidades toca, qué columnas se leen/escriben y qué reglas del schema aplican al comportamiento visible.

Referencia canónica del schema: `db/01_schema.sql` en la raíz del repo.

---

## Entidad: Publicación

**Tabla**: `public.publicaciones` (base; la web no la consulta directo)
**Vista consumida**: `public.publicaciones_publicas` — grilla **y** detalle

### Columnas leídas por la feature

| Columna | Tipo | Uso en la feature | Notas |
|---------|------|-------------------|-------|
| `id` | `uuid` | slug de URL de detalle (`/publicacion/:id`) | PK. |
| `empresa` | `text` | visible en tarjeta y detalle | NOT NULL en schema. |
| `responsable` | `text` | **no existe en la vista pública** | dato interno para CAPEMISA. |
| `telefono` | `text` | **no existe en la vista pública** | FR-019 lo prohíbe. Excluida a nivel vista desde 2026-07-29, no solo omitida del `select`. |
| `email` | `text` | **no existe en la vista pública** | ídem `telefono`. |
| `tipo_publicacion` | `text` (CHECK 5 valores) | filtro de grilla, badge visible | Enum: `oferta_servicio`, `oferta_equipo`, `venta_equipo`, `busqueda_proveedor`, `busqueda_equipo`. |
| `zona` | `text` (nullable) | visible en tarjeta y detalle | Puede ser null. |
| `descripcion` | `text` | visible en detalle; fallback en tarjeta si no hay `descripcion_comercial` | NOT NULL en schema. |
| `condicion_comercial` | `text` (nullable) | visible en detalle | Puede ser null. |
| `disponibilidad` | `text` (nullable) | visible en detalle | Puede ser null. |
| `vencimiento` | `date` (nullable) | visible en detalle, formateado `es-AR` | Puede ser null; no bloquea visibilidad si pasó. |
| `imagen_url` | `text` (nullable) | visible en tarjeta y detalle vía `<ImagenPublicacion>` | Fallback SVG si null o error de carga. |
| `rubro` | `text` (nullable) | visible como badge en tarjeta y detalle | Generado por IA + validado por admin. |
| `subrubro` | `text` (nullable) | visible en detalle | Generado por IA + validado por admin. |
| `descripcion_comercial` | `text` (nullable) | preferido en tarjeta y detalle; fallback a `descripcion` | Generado por IA + validado por admin. |
| `texto_whatsapp` | `text` (nullable) | **NO visible directamente**; solo participa en `search_text` | Uso pensado para copy/paste al WhatsApp, fuera de scope público. |
| `urgencia` | `text` (CHECK) (nullable) | badge visible con color según valor | Enum: `baja`, `media`, `alta`. |
| `matches` | `jsonb` | **no existe en la vista pública** | Info interna de IA para admin. |
| `estado` | `text` (CHECK) | filtro vía RLS (`= 'publicada'`) + `.eq()` explícito | Enum de 5 estados; solo `publicada` llega al público. La columna **sí** se conserva en la vista para poder filtrar explícito (defensa en profundidad). |
| `created_at` | `timestamptz` | orden default `DESC` | NOT NULL, default `now()`. |

### Columnas NO leídas por la feature

- `autor_id`, `observaciones_internas`, `updated_at`. Son campos internos administrados por otras features.

### Reglas del schema que impactan la UX

- **CHECK `estado IN ('pendiente','faltan_datos','aprobada','publicada','rechazada')`**: la feature solo verá `'publicada'` gracias a la política RLS `publicaciones_select_publica`, que aplica porque la vista es `security_invoker`. Las queries igual filtran `.eq('estado','publicada')` explícito: defensa en profundidad, mantener el patrón.
- **CHECK `urgencia IN ('baja','media','alta')`**: los badges de urgencia mapean a 3 colores; si `urgencia IS NULL`, no se muestra badge (edge case cubierto).
- **CHECK `tipo_publicacion IN (...)` con 5 valores**: la UI ofrece exactamente esos 5 valores + "Todos". Cambios en el CHECK del schema requieren actualizar el Select del filtro.

### Las dos vistas, y por qué importa la diferencia

Hay **dos** vistas sobre `publicaciones` con una columna `search_text` idéntica. La distinción es de
seguridad, no cosmética, y confundirlas es exactamente el bug que se corrigió el 2026-07-29.

| | `publicaciones_publicas` | `publicaciones_searchable` |
|---|---|---|
| Archivo | `/db/04_public_view.sql` | `/db/03_search_view.sql` |
| `security_invoker` | **sí** → respeta el RLS del que consulta | **no** → corre como owner, **saltea** el RLS |
| Columnas | lista explícita, **sin PII** | `p.*` (incluye `telefono`, `email`, `responsable`, `observaciones_internas`) |
| Consumidor | **la web** (rol `anon`), grilla y detalle | bot de n8n (rol `service_role`) |
| Filas visibles a `anon` | solo `estado='publicada'` | **todas**, incluidas no publicadas |

Ambas calculan:

```sql
search_text := extensions.unaccent(lower(
  coalesce(rubro,'') || ' ' || coalesce(subrubro,'') || ' ' ||
  coalesce(descripcion_comercial,'') || ' ' || coalesce(texto_whatsapp,'') || ' ' ||
  coalesce(descripcion,'')
))
```

Notar que `texto_whatsapp` **participa del `search_text`** de la vista pública pero **no se devuelve**
como columna: es texto interno de armado de mensajes. O sea que una keyword puede matchear contra
texto que el visitante nunca ve.

#### Vista `public.publicaciones_publicas` — la que usa la web

Definida en `/db/04_public_view.sql` con `WITH (security_invoker = true)`. Devuelve: `id`, `empresa`,
`tipo_publicacion`, `rubro`, `subrubro`, `descripcion`, `descripcion_comercial`, `zona`,
`condicion_comercial`, `disponibilidad`, `vencimiento`, `imagen_url`, `urgencia`, `estado`,
`created_at`, `search_text`.

Deliberadamente **excluidas**: `autor_id`, `responsable`, `telefono`, `email`, `texto_whatsapp`,
`matches`, `observaciones_internas`, `updated_at`.

**Uso**: la query del catálogo hace `select <columnas> from publicaciones_publicas where estado = 'publicada' and (search_text ilike '%<kw-norm>%') order by created_at desc` (el filtro `estado = 'publicada'` es defensa en profundidad; con `security_invoker`, ahora sí, el RLS ya lo aplica). El detalle usa la misma vista, no la tabla base.

#### Vista `public.publicaciones_searchable` — la web NO debe usarla

> ⚠️ **CORREGIDO 2026-07-29.** Este documento afirmaba:
>
> > "Se otorgó `GRANT SELECT ... TO anon, authenticated, service_role`; combinada con
> > RLS de la tabla base, solo devuelve filas visibles al rol correspondiente."
>
> **Eso era falso, y fue el origen de una vulnerabilidad real.** Una vista en Postgres
> **no hereda el RLS** de su tabla base: salvo que se cree `WITH (security_invoker = true)`,
> corre con los privilegios de su *owner* y **saltea** el RLS. Como además esta vista
> selecciona `p.*`, cualquiera con la anon key podía leer `telefono`, `email`,
> `responsable` y `observaciones_internas` de **todas** las filas, incluidas las no
> publicadas. La suposición se escribió acá, se implementó tal cual, y el check de
> compliance (T040) se redactó dándola por cierta — por eso miraba el lugar equivocado.

`publicaciones_searchable` **no aplica RLS** y expone todas las columnas de la tabla,
incluida PII. Su consumidor legítimo es el bot de n8n, que consulta con `service_role`
y necesita el `telefono` para dárselo a los miembros.

**No "arreglarla" recortándole columnas**: el nodo `Shape resultados` de `capemisa_tool_buscar` lee
`p.telefono` de ahí y `texto_whatsapp` se usa para el matching. Sacarlas rompe el bot **en silencio**,
sin error. Por eso son dos vistas separadas y aquella queda intacta. Ver el encabezado de
`/db/04_public_view.sql`.

**Cierre pendiente**: `publicaciones_searchable` sigue con `GRANT SELECT` a `anon`. Que la web ya no la
use no impide que otros la consulten — ver T040 en `tasks.md`.

### Estados de una publicación (relevancia para la feature)

```text
   (creación)
       │
       ▼
   pendiente
    ┌──┴──┐
    ▼     ▼
faltan_datos  aprobada  ──────► publicada  ◄── única visible al público
       ▲       │
       └───────┴──► rechazada
```

Solo `publicada` llega a la grilla. La feature no hace transiciones de estado.

---

## Entidad: Consulta

**Tabla**: `public.consultas`

### Columnas escritas por la feature (INSERT)

| Columna | Tipo | Origen del valor | Notas |
|---------|------|------------------|-------|
| `id` | `uuid` | default `gen_random_uuid()` | Se omite en el INSERT del cliente. |
| `publicacion_id` | `uuid` | de la publicación abierta en detalle | FK a `publicaciones(id)`. |
| `empresa_interesada` | `text` | formulario, requerido | NOT NULL. |
| `persona_contacto` | `text` | formulario, requerido | NOT NULL. |
| `telefono` | `text` | formulario, requerido | NOT NULL; validación cliente `/^[\d\s+\-()]{6,20}$/`. |
| `email` | `text` (nullable) | formulario, opcional | Si viene, validar formato email. |
| `motivo` | `text` (nullable) | formulario, opcional | Max 500 chars cliente-side. |
| `urgencia` | `text` (CHECK) (nullable) | formulario, opcional | Enum `baja/media/alta`. |
| `estado_seguimiento` | `text` (CHECK) | default `'nueva'` | Se omite en el INSERT del cliente. |
| `created_at` | `timestamptz` | default `now()` | Se omite en el INSERT del cliente. |

### Columnas NO tocadas por la feature

Ninguna — la tabla solo tiene las mencionadas. La transición del `estado_seguimiento` a `contactada` o `cerrada` la hace el panel admin (feature futura).

### Reglas del schema

- **`publicacion_id` FK ON DELETE CASCADE**: si borran la publicación, las consultas asociadas se eliminan. Aceptable para la demo.
- **CHECK `estado_seguimiento IN ('nueva','contactada','cerrada')`**: no impacta esta feature (siempre insertamos `'nueva'` por default).
- **CHECK `urgencia IN ('baja','media','alta')`**: el formulario debe respetar exactamente esos 3 valores cuando el visitante elige urgencia.

### RLS aplicable

- **`consultas_insert_open`** — permite INSERT para roles `anon` y `authenticated` con `WITH CHECK (true)`. Esto habilita la feature sin login.
- **`consultas_select_admin`** — solo admin puede SELECT. El visitante NO puede ver la consulta que envió (aceptable: recibe confirmación por Toast).

---

## Diagrama de relaciones (perspectiva de la feature)

```text
publicaciones (SELECT solo estado='publicada' vía RLS)
    │
    │ 1 : N
    ▼
consultas (INSERT abierto vía RLS; sin SELECT público)
```

`perfiles` NO se toca en esta feature (no hay login público).

---

## Contrato con el schema

Si el schema cambia de una forma que impacta esta feature, se debe:

1. Regenerar `web/src/types/database.ts` con Supabase MCP `generate_typescript_types` (o CLI).
2. Ajustar el mapa de labels en español rioplatense (`web/src/lib/i18n.ts`) si cambian valores de enums.
3. Ajustar los componentes visibles si se agregan campos que corresponden a la ficha pública.

Cambios que NO impactan esta feature: cualquier modificación en `matches`, `observaciones_internas`, `autor_id`, `updated_at`, `perfiles`.
