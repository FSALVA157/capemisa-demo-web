# Contract — Queries Supabase del frontend

**Feature**: 001-catalogo-publico
**Scope**: define exactamente qué queries ejecuta el cliente contra Supabase, con qué rol y bajo qué políticas RLS.

Rol usado en todas las queries: **`anon`** (no hay login en esta feature). El cliente se inicializa con la `anon key` del proyecto.

> ⚠️ **ACTUALIZADO 2026-07-29.** Este contrato especificaba originalmente `publicaciones_searchable`
> para Q1 y la tabla base `publicaciones` para Q2. Ambas cosas cambiaron al corregir el problema de
> seguridad descripto en `data-model.md`: **las dos queries de lectura van contra
> `public.publicaciones_publicas`** (`/db/04_public_view.sql`), la única vista con
> `security_invoker = true` y sin columnas PII. La web **no debe** tocar
> `publicaciones_searchable` (es del bot de n8n con `service_role`) ni la tabla base.

---

## Q1 — Listar publicaciones para la grilla

**Hook**: `usePublicaciones(filtros)` en `web/src/hooks/usePublicaciones.ts`.

**Query**:

```ts
supabase
  .from('publicaciones_publicas')
  .select('id, empresa, tipo_publicacion, rubro, subrubro, descripcion, descripcion_comercial, zona, urgencia, imagen_url, created_at')
  .eq('estado', 'publicada')                            // defensa en profundidad; RLS ya lo aplica
  .maybe('.eq(tipo_publicacion, X)', si hay filtro)      // pseudo — see below
  .maybe('.ilike(search_text, %kw-norm%)', si hay kw)
  .order('created_at', { ascending: false })
```

En código real, aplicado condicionalmente (la lista de columnas vive en la constante
`COLUMNAS_PUBLICAS` del hook):

```ts
let q = supabase
  .from('publicaciones_publicas')
  .select(COLUMNAS_PUBLICAS)
  .eq('estado', 'publicada')
  .order('created_at', { ascending: false });

if (filtros.tipo && filtros.tipo !== 'todos') {
  q = q.eq('tipo_publicacion', filtros.tipo);
}
if (filtros.keyword.trim()) {
  const kwNorm = normalizarBusqueda(filtros.keyword);   // lowercase + strip accents
  q = q.ilike('search_text', `%${kwNorm}%`);
}
const { data, error } = await q;
```

**Políticas RLS que aplican**:
- `publicaciones_select_publica` — permite `anon` SELECT donde `estado='publicada'`. Aplica de
  verdad porque la vista es `security_invoker`; el `.eq('estado','publicada')` explícito es
  defensa en profundidad, no el mecanismo primario.

**Comportamiento esperado**:
- Sin filtros → devuelve TODAS las publicaciones en estado 'publicada' ordenadas por fecha DESC.
- Con `tipo` → filtra por ese tipo.
- Con `keyword` → filtra por match en `search_text`.
- Combinable AND.

**Formato de resultado (relevante para UI)**:
- Array de objetos con las columnas listadas.
- Array vacío si no hay match → dispara `EstadoVacio` variant `sin-resultados` o `sin-publicaciones` según haya filtros o no.

**Errores esperados**:
- Error de red → TanStack Query lo captura; UI muestra `<Alert variant="destructive">` con botón "Reintentar".

---

## Q2 — Detalle de una publicación

**Hook**: `usePublicacion(id)` en `web/src/hooks/usePublicacion.ts`.

**Query**:

```ts
supabase
  .from('publicaciones_publicas')   // la misma vista que Q1, NO la tabla base
  .select(COLUMNAS_DETALLE)         // agrega condicion_comercial, disponibilidad, vencimiento
  .eq('id', id)
  .eq('estado', 'publicada')
  .maybeSingle();
```

El hook se activa con `enabled: !!id`, así que no dispara query mientras el param de ruta esté indefinido.

**Nota**: los campos `responsable`, `telefono`, `email` **no existen en la vista**, así que ni se pueden
seleccionar (FR-019 garantizado a nivel schema, no solo por el `select`).

**Políticas RLS**:
- `publicaciones_select_publica` — mismo criterio, aplicado vía `security_invoker`.

**Comportamiento esperado** (`.maybeSingle()`, no `.single()`):
- id existe + publicada → devuelve la fila.
- id no existe → `data === null`, **sin error** → la página renderiza `EstadoVacio variant="no-encontrada"`.
- id existe pero estado != 'publicada' → `data === null` → mismo resultado (indistinguible del anterior — deseado por FR-017 y edge case).

`.maybeSingle()` en lugar de `.single()` es deliberado: evita tratar el 404 legítimo como excepción.
`PublicacionDetallePage` colapsa ambos casos con `if (isError || !data)`.

**Errores esperados**:
- Error de red → `isError` → mismo `EstadoVacio variant="no-encontrada"` + botón "Volver al catálogo". La
  distinción visual entre "no existe" y "problema técnico" que planteaba R-11 **no se implementó**: la
  página no diferencia los dos casos.

---

## Q3 — Insertar consulta ("Solicitar contacto")

**Hook**: `useEnviarConsulta()` (mutation) en `web/src/hooks/useEnviarConsulta.ts`.

**Query**:

```ts
const { data, error } = await supabase
  .from('consultas')
  .insert({
    publicacion_id: <uuid de publicación>,
    empresa_interesada: <string>,
    persona_contacto: <string>,
    telefono: <string>,
    email: <string | null>,
    motivo: <string | null>,
    urgencia: <'baja' | 'media' | 'alta' | null>,
  });
```

Los campos opcionales (`email`, `motivo`, `urgencia`) llegan del form como `''` cuando el visitante no
los completa; el hook los coerce a `null` antes del insert para no guardar strings vacíos. El insert va
con un cast (`insert as any`) por la misma limitación de inferencia descripta en el contrato de tipos.

**Campos omitidos deliberadamente** (usan defaults del schema):
- `id` → `gen_random_uuid()`.
- `estado_seguimiento` → `'nueva'`.
- `created_at` → `now()`.

**Políticas RLS**:
- `consultas_insert_open` — permite `anon` INSERT con `WITH CHECK (true)`.

**Comportamiento esperado**:
- OK → `<Toast>` "Tu solicitud fue enviada, el equipo de CAPEMISA se pondrá en contacto" + cierre del dialog.
- Error de validación cliente-side (zod) → bloqueado antes de llegar acá.
- Error de red o violación de constraint (FK a publicación borrada, por ejemplo) → `<Toast>` destructivo dentro del dialog abierto; el visitante puede reintentar sin perder datos.

**Nota de seguridad**: la política `consultas_insert_open` con `WITH CHECK (true)` es intencional (permite consultas de visitantes anónimos). El CHECK del schema sobre `estado_seguimiento` garantiza que el valor default es válido. Como la feature no expone SELECT sobre `consultas`, un atacante no puede leer las consultas de otros por más que pueda insertar.

---

## Q4 — (Ninguna otra query)

La feature NO ejecuta:
- Ninguna operación sobre `perfiles`.
- Ninguna operación sobre `auth.*`.
- Ningún UPDATE ni DELETE.

---

## Contrato de tipos TypeScript

Los tipos vienen de `web/src/types/database.ts` generado por Supabase. La feature usa:

Los tipos vienen de `web/src/types/database.ts`. Originalmente generado por Supabase, hoy se **mantiene
a mano** (ver R-10). Los alias exportados desde `src/lib/supabase.ts`:

```ts
import type { Database } from '@/types/database';

type PublicacionRow = Database['public']['Tables']['publicaciones']['Row'];
type PublicacionPublicaRow = Database['public']['Views']['publicaciones_publicas']['Row'];
type NuevaConsulta = Database['public']['Tables']['consultas']['Insert'];
```

Cualquier cambio de schema que modifique estas signatures ROMPE compile-time del cliente — deseado.

**Limitación conocida**: un `.select()` con lista explícita de columnas rompe la inferencia de tipos de
`postgrest-js` (no puede estrechar el `Row` de la vista a las columnas pedidas). Por eso cada hook
declara su propio tipo de fila local (`PublicacionListItem`, `PublicacionDetalle`) y castea el
resultado con `as unknown as T`. El cast es la costura donde el tipado deja de ser verificado: si se
cambia la lista de columnas hay que actualizar el tipo local a mano, el compilador no avisa.

---

## Contrato de errores

| Origen | Signal | Reacción UI |
|--------|--------|-------------|
| Sin conexión (fetch fails) | `error.message` incluye "Failed to fetch" o similar | Q1 → `<Alert variant="destructive">` con "Reintentar". Q2 → `EstadoVacio variant="no-encontrada"`. Q3 → toast destructivo en dialog. |
| Q2 sin filas | `data === null` (con `.maybeSingle()` no hay `PGRST116`) | `EstadoVacio variant="no-encontrada"` + "Volver al catálogo". |
| Supabase 401/403 | No debería ocurrir con `anon` + políticas correctas | Log en consola; UI trata como error genérico. Señal de bug de config. |
| Constraint violation en Q3 | Ej. FK a publicación borrada mid-flight | Toast destructivo con "No pudimos enviar tu solicitud, intentá de nuevo". |
