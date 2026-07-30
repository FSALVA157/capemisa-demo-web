# Quickstart — Validar el Catálogo público

**Feature**: 001-catalogo-publico
**Purpose**: pasos concretos para verificar end-to-end que la feature cumple los acceptance scenarios de la spec.

Esta guía **no reemplaza** los acceptance scenarios del `spec.md`; es la receta operativa para ejecutarlos manualmente (testing manual/visual, Principio V).

---

## Prerequisitos

Antes de correr esta guía, se deben cumplir:

1. **Base Supabase poblada** con los 3 casos precargados en estado `'publicada'`:
   - Camionetas 4x4 con chofer a la Puna (oferta_servicio).
   - Búsqueda de neumáticos para flota (busqueda_proveedor).
   - Venta de grupo electrógeno usado (venta_equipo).
   Verificar en Supabase con: `select id, empresa, tipo_publicacion, estado from publicaciones where estado='publicada'`.

2. **Vista `publicaciones_publicas`** creada (`db/04_public_view.sql` corrido). Es la que consume la web
   —grilla y detalle—; requiere que `db/03_search_view.sql` esté corrido antes solo porque instala la
   extensión `unaccent`. La vista `publicaciones_searchable` de ese archivo es del bot de n8n: la web no
   la toca.

3. **Políticas RLS activas** para `anon` (verificar: `publicaciones_select_publica` y `consultas_insert_open` existen).

4. **Node 20 LTS** y **npm** instalados localmente.

5. Archivo `.env.local` en la raíz del repo, con:
   ```
   VITE_SUPABASE_URL=https://dpxfcmhgdieqvgdlqljf.supabase.co
   VITE_SUPABASE_ANON_KEY=<anon key del proyecto Supabase>
   ```

---

## Setup local

> **Layout (desde 2026-07-29)**: `specs/`, `.specify/` y `db/` viven **dentro del repo**,
> en la misma raíz que `package.json` y `src/`. Las rutas `web/...` que aparecen en las
> descripciones históricas de `tasks.md` son de antes de esa mudanza; hoy esa raíz es el
> repo. Ver T044.

```bash
cd <raíz del repo capemisa-demo-web>
npm install
npm run dev
```

Abrir `http://localhost:5173`.

---

## Escenarios de validación

Cada escenario apunta al acceptance scenario relevante del `spec.md`. Numeración: `AC-<US>.<n>`.

### AC-1.1 — Grilla muestra publicaciones publicadas ordenadas

**Pasos**:
1. Abrir `/`.

**Esperado**:
- Se ven al menos las 3 tarjetas de los seeds.
- Orden: la publicación con `created_at` más reciente aparece primera.
- Cada tarjeta muestra empresa, badge de tipo, rubro (si existe), zona (si existe), badge de urgencia (si existe), y descripción resumida.

---

### AC-1.2 — Filtro por tipo

**Pasos**:
1. En `/`, abrir el selector de tipo.
2. Elegir "Oferta de servicio".

**Esperado**:
- La grilla se reduce a solo publicaciones de tipo `oferta_servicio` (al menos "Camionetas 4x4").
- La URL cambia a `/?tipo=oferta_servicio`.
- Botón "Limpiar" aparece.

---

### AC-1.3 — Búsqueda por palabra clave con normalización

**Pasos**:
1. En `/`, escribir "camion" (sin tilde) en el buscador.

**Esperado**:
- La grilla filtra a solo publicaciones cuyo texto contenga "camion" o "camión" (unaccent hace ambas iguales).
- URL: `/?q=camion`.

**Pasos alternativos**:
2. Cambiar a "camión" (con tilde).

**Esperado**:
- Resultado idéntico al anterior (SC-008).

---

### AC-1.4 — Filtros sin resultados

**Pasos**:
1. En `/`, escribir "asdfghjkl" en el buscador.

**Esperado**:
- Grilla vacía.
- Mensaje "No hay publicaciones que coincidan con tu búsqueda".
- Botón "Limpiar filtros" clickable → vuelve a mostrar todo.

---

### AC-1.5 — Catálogo sin publicaciones activas

**Pasos**:
1. En Supabase, cambiar el estado de todas las publicaciones seed a `'pendiente'` temporalmente:
   ```sql
   UPDATE publicaciones SET estado='pendiente' WHERE estado='publicada';
   ```
2. Refrescar `/`.

**Esperado**:
- Mensaje "Todavía no hay publicaciones activas".

**Cleanup**: revertir con `UPDATE publicaciones SET estado='publicada' WHERE ...`.

---

### AC-2.1 — Detalle desde tarjeta

**Pasos**:
1. En `/`, click en la tarjeta de "Camionetas 4x4".

**Esperado**:
- Navegación a `/publicacion/<uuid>`.
- Página de detalle muestra: imagen (o placeholder), empresa, badges de tipo y urgencia, rubro/subrubro, descripción comercial completa, zona, condición comercial, disponibilidad, vencimiento formateado en `es-AR`.
- **NO se muestran** teléfono ni email del oferente en ningún lado (SC-009).
- Botón "Solicitar contacto" visible.

---

### AC-2.2 — URL directa comparte-able

**Pasos**:
1. Copiar la URL de detalle de un caso.
2. Abrir en una pestaña anónima nueva sin ir por `/` primero.

**Esperado**:
- La página carga correctamente sin pasar por la grilla ni login.

---

### AC-2.3 — Publicación no publicada devuelve NotFound

**Pasos**:
1. En Supabase, tomar un id de publicación y cambiar su estado a `'rechazada'`:
   ```sql
   UPDATE publicaciones SET estado='rechazada' WHERE id='<uuid>';
   ```
2. Abrir `/publicacion/<ese uuid>`.

**Esperado**:
- Mensaje "Publicación no disponible".
- Botón "Volver al catálogo".

**Cleanup**: revertir estado a `'publicada'`.

---

### AC-2.4 — Publicación sin imagen

**Pasos**:
1. En Supabase, `UPDATE publicaciones SET imagen_url = NULL WHERE id='<uuid>'`.
2. Abrir `/publicacion/<uuid>`.

**Esperado**:
- Layout no se rompe.
- Se muestra placeholder SVG o el bloque de imagen se omite.

**Cleanup**: revertir imagen.

---

### AC-3.1 — Abrir dialog "Solicitar contacto"

**Pasos**:
1. En detalle, click en "Solicitar contacto".

**Esperado**:
- Se abre un dialog modal con campos: empresa interesada, persona de contacto, teléfono, email, motivo, urgencia.
- Los tres primeros están marcados como requeridos.

---

### AC-3.2 — Envío exitoso

**Pasos**:
1. Completar empresa, persona, teléfono (mínimo).
2. Enviar.

**Esperado**:
- Toast de éxito "Tu solicitud fue enviada, el equipo de CAPEMISA se pondrá en contacto".
- Dialog se cierra.
- **Verificación DB**: en Supabase, `select * from consultas order by created_at desc limit 1` muestra la consulta recién insertada con `estado_seguimiento='nueva'` (SC-007).

---

### AC-3.3 — Envío con campos faltantes

**Pasos**:
1. Abrir el dialog.
2. Dejar el campo "Teléfono" vacío.
3. Intentar enviar.

**Esperado**:
- Envío bloqueado.
- Mensaje inline debajo del campo "Teléfono" ("Ingresá un teléfono").

---

### AC-3.4 — Consulta visible para admin (fuera de scope de esta feature, pero verificable)

**Pasos**:
1. Después de AC-3.2, ejecutar en Supabase con el service_role (o desde el panel):
   ```sql
   SELECT * FROM consultas WHERE created_at > now() - interval '5 minutes';
   ```

**Esperado**:
- La consulta aparece con todos los campos capturados y referencia correcta al `publicacion_id`.

---

## Escenarios responsive (SC-005)

Con DevTools, verificar en modo dispositivo:

### 375 px (mobile)
- Grilla: 1 columna.
- Filtros: colapsados detrás de un botón "Filtros" o accesibles vía toggle.
- Sin scroll horizontal en ninguna vista.
- Dialog "Solicitar contacto": ocupa casi el ancho de pantalla, campos apilados verticalmente.

### 768 px (tablet)
- Grilla: 2 columnas.
- Filtros: visibles inline (input + select en fila).

### 1440 px (desktop)
- Grilla: 3 columnas.
- Layout centrado con márgenes.

---

## Escenarios edge (edge cases de la spec)

### Imagen rota
- Hacer `UPDATE publicaciones SET imagen_url='https://dominio-inexistente.xyz/no.jpg' WHERE id='<uuid>'`.
- Abrir la ficha → debería aparecer el placeholder tras el `onError`.

### Descripción muy larga
- Insertar en una publicación una descripción de >500 chars.
- Tarjeta: truncada con elipsis o "…".
- Detalle: completa.

### Búsqueda con caracteres especiales
- Escribir "grupo (electrogeno)" → no debería romper la query; el `%${keyword}%` está parametrizado por Supabase client (no hay riesgo de inyección).

---

## Verificación de compliance con constitución

- ✅ **Principio II (Human Gate)**: probar que una publicación en estado `'aprobada'` (no `'publicada'`) NO aparece en la grilla ni en detalle directo. Cambiar temporalmente:
  ```sql
  UPDATE publicaciones SET estado='aprobada' WHERE id='<uuid>';
  ```
  Refrescar `/` y `/publicacion/<uuid>`: no debe verse (SC-002).

- 🟠 **Principio IV (Security)** — *check reescrito el 2026-07-29; la redacción anterior daba verde sobre
  un agujero real.*

  > **Por qué cambió**: el check decía "abrir DevTools → Network → verificar que la respuesta no
  > contenga `telefono`/`email`/`responsable`". Eso verifica **qué columnas pide el frontend**, no
  > **qué columnas puede pedir cualquiera con la anon key** — y la anon key va embebida en el bundle
  > público. Pasaba siempre, incluso mientras la vista consumida exponía toda la PII de todas las filas.

  No mirar DevTools. Atacar la API directamente con la anon key, que es lo que puede hacer cualquiera:

  ```bash
  ANON=<anon key>   # la misma del bundle público
  URL=https://dpxfcmhgdieqvgdlqljf.supabase.co/rest/v1

  # 1) Pedir PII explícitamente. Esperado: 42703 column ... does not exist
  curl -s "$URL/publicaciones_publicas?select=telefono,email,responsable" \
       -H "apikey: $ANON" -H "Authorization: Bearer $ANON"

  # 2) Pedir TODO. Esperado: ninguna columna PII en las claves del JSON
  curl -s "$URL/publicaciones_publicas?select=*&limit=1" \
       -H "apikey: $ANON" -H "Authorization: Bearer $ANON"

  # 3) Pedir filas no publicadas. Esperado: []
  curl -s "$URL/publicaciones_publicas?select=id,estado&estado=neq.publicada" \
       -H "apikey: $ANON" -H "Authorization: Bearer $ANON"
  ```

  Los 3 pasan contra `publicaciones_publicas`. **El principio todavía no está cumplido**: correr el
  paso 2 y 3 sustituyendo `publicaciones_publicas` por `publicaciones_searchable` devuelve PII y filas
  no publicadas, porque esa vista sigue con `GRANT SELECT` a `anon`. Cierre pendiente en T040.

  **Regla general para checks de seguridad**: probar la superficie que tiene el atacante, no el camino
  que toma la app. Si el check se puede pasar sin cambiar nada del modelo de datos, no está midiendo
  el modelo de datos.

- ✅ **Principio V (YAGNI)**: correr `wc -l web/src/**/*.tsx` o revisar el proyecto: no hay features fuera de spec (no dark mode, no PWA, no upload).

---

## Cierre

Cuando todos los escenarios AC-* pasan, y las 3 verificaciones de compliance pasan, la feature está **funcionalmente lista para deploy a producción vía push a `main`**.

---

# Registro de validación

> **Nota**: a partir del 2026-07-29 las validaciones se corren contra **producción**
> (`https://capemisa-app.fsalva157.dev`), no contra `localhost:5173`. El deploy ya está hecho,
> y validar en producción cubre además el fallback SPA de nginx detrás de Traefik y el TLS,
> que en local no se ejercitan. Los pasos de "Setup local" de arriba siguen siendo válidos
> para desarrollo.

## 2026-07-29 — T038 (responsive) ✅ PASA

Medido con Playwright sobre producción. Base: 18 publicaciones en estado `publicada`.

| Viewport | Columnas | Filtros | Scroll horizontal |
|---|---|---|---|
| 375 px | 1 (`328px`) | colapsados tras botón "Filtros" ✅ | no (`scrollWidth` 360 ≤ 375) ✅ |
| 768 px | 2 (`352.5px × 2`) | inline, input + select en la misma fila (`top` 176 ambos) ✅ | no (753 ≤ 768) ✅ |
| 1440 px | 3 (`405.3px × 3`) | inline ✅ | no (1425 ≤ 1440) ✅ |

- **Dialog en 375 px**: ancho 375/375 = ratio 1.0, los 6 campos apilados verticalmente
  (tops 178 / 266 / 354 / 442 / 530 / 696), sin scroll horizontal ✅
- **Barrido de desbordes**: cero elementos con `right > innerWidth` en 375 px ✅
- **SC-005 cumplido.**

## 2026-07-29 — T040 (compliance) ⚠️ 2 de 3

### Principio II (human gate) — ✅ PASA a nivel app
Registro temporal `eeeeeeee-…` en estado `aprobada` (borrado después de la prueba):
- No aparece en la grilla (siguió mostrando 18 tarjetas) ✅
- `/publicacion/eeeeeeee-…` → "Publicación no disponible" ✅
- **Salvedad**: pasa por cómo consulta la app, no por el modelo de datos. Consultando
  la vista directamente con la anon key, las filas no publicadas **sí** son legibles.
  Ver Principio IV.

### Principio IV (PII) — 🟠 detectado, mitigado, cierre pendiente

El check tal como estaba redactado (mirar DevTools) **daba verde y era engañoso**: verificaba
qué columnas *pide* el frontend, no qué columnas *puede* pedir cualquiera con la anon key.

Se encontró que la vista consumida por la web no restringía correctamente ni las columnas ni
las filas visibles al rol anónimo. Detalle técnico completo, reproducción y análisis de impacto
en las **notas internas del proyecto** — deliberadamente fuera de este archivo, porque el repo
es público y el cierre todavía no está aplicado.

**Mitigación aplicada (2026-07-29)**: se creó `publicaciones_publicas`
(`/db/04_public_view.sql`) con `security_invoker = true` y sin columnas PII, y la web —grilla
y detalle— pasó a consumirla. Verificado con la anon key: pedir columnas PII devuelve
`42703 column does not exist`, y solo se ven filas `publicada`.

**Cierre pendiente**: revocar el acceso del rol anónimo a la vista anterior, que sigue siendo
legible. Hasta que eso se aplique, el principio **no está cumplido**: que la web ya no la use
no impide que otros la consulten.

**Nota para quien lo retome**: el fix NO es sacar columnas de la vista anterior — la consume
el bot de n8n con `service_role` y rompería en silencio. Por eso son dos vistas separadas;
ver el encabezado de `/db/04_public_view.sql`.

**Corregir este check** al cerrar: debe probar qué se *puede* pedir con la anon key, no qué
pide el frontend.

### Principio V (YAGNI) — ✅ PASA
2171 LOC en `web/src`, 35 archivos. Sin dark mode, sin PWA/service worker, sin upload,
sin analytics. Los hits de `i18n` son `src/lib/i18n.ts`, que es solo un mapa de labels
en español (`TIPO_PUBLICACION_LABEL`, `URGENCIA_LABEL`), no un framework de i18n.

## Hallazgos menores detectados de paso (no bloquean)

1. **`<title>` es `web`** — el default de Vite. Se ve en la pestaña del navegador y al
   compartir el link. `index.html` nunca se editó.
2. **`<html lang="en">`** en un sitio íntegramente en español. Afecta lectores de pantalla
   y traducción automática.
3. **Sin `<meta name="description">`** — al compartir el link no hay preview.
4. Los campos requeridos del dialog se marcan con `*` en el label y validan por zod, pero no
   llevan `required` ni `aria-required` en el input. La validación funciona; es solo a11y.

Los tres primeros son de una línea cada uno en `web/index.html` y mejoran bastante cómo se
ve el link compartido.
