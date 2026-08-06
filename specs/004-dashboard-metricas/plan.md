# Plan — Feature 004: Dashboard de métricas

## Enfoque

Una página nueva que consume **un solo RPC** de Postgres con todos los
agregados ya calculados, y los dibuja con Recharts. Sin backend propio, sin
capa de servicios: se respeta el flujo del proyecto
`página → hook → cliente supabase → objeto de Postgres`.

## El problema que define el diseño

El navegador consulta con la **anon key**, sujeta a RLS. Con esos privilegios ve:

- solo las publicaciones en `estado='publicada'` (`publicaciones_select_publica`)
- **cero** consultas (`consultas_select_admin` / `consultas_select_autor`)

Medido contra la base real: 20 de 26 publicaciones y 0 de 13 consultas. Un
dashboard armado del lado del cliente mostraría esos números recortados
**presentados como si fueran el total**. No es una limitación estética: es un
dashboard que miente.

Tres caminos evaluados:

1. **Agregar en el cliente sobre `publicaciones_publicas`** — descartado: da los
   números recortados de arriba y no hay forma de contar consultas.
2. **Vista `security_invoker` con los agregados** — descartado por lo mismo: el
   RLS sigue aplicando al que consulta, así que devuelve lo mismo.
3. **Función `SECURITY DEFINER` que devuelve solo conteos** — elegida.

## Decisiones

### D-01 — `metricas_dashboard()` es `SECURITY DEFINER`

Corre con privilegios del owner, así que ve las 26 publicaciones y las 13
consultas. Lo que devuelve son `count`/`sum`: **ninguna fila, ninguna columna de
PII**. La anon key no gana acceso a datos que hoy no pueda ver; gana acceso a
totales.

`STABLE`, `SET search_path = public, extensions`, sin parámetros —una función
`SECURITY DEFINER` sin `search_path` fijo es un vector de escalada, y sin
parámetros no hay superficie de inyección.

`empresa` sí sale (en el ranking): ya es pública, la muestra el catálogo anónimo
vía `publicaciones_publicas`.

Si más adelante el dashboard necesita detalle fila por fila, la respuesta
correcta es una vista `security_invoker` + ruta protegida por rol, **no** ampliar
esta función.

### D-02 — Una sola llamada, no seis

Todos los paneles salen del mismo `jsonb`. Con seis consultas separadas, dos
paneles podrían leer estados distintos de la base y contradecirse en pantalla
(el efecto sería sutil justo durante una demo en vivo).

### D-03 — Recharts, sin el componente `chart` de shadcn/ui

Se instaló `recharts@3` (la 2.x tiene fricción de peer-dep con React 19) y se
usan sus primitivas directamente. **No** se agregó `src/components/ui/chart.tsx`:
ese wrapper de shadcn se escribió contra Recharts 2 y arrastra ~350 líneas de
manejo de `payload` y variables CSS. A un día de la demo, la superficie de fallo
no compensa: un tooltip propio de 15 líneas (`TooltipGrafico` en la página) da el
mismo resultado visual y usa los tokens de la app.

Por lo mismo no se agregaron variables `--chart-1..5` a `index.css`: la paleta
vive en `src/lib/i18n.ts` (`ESTADO_PUBLICACION_GRAFICO`, `URGENCIA_GRAFICO`,
`TIPO_PUBLICACION_GRAFICO`), al lado de las paletas de badges que replica, para
que un cambio de color se haga en un solo archivo.

### D-04 — La ruta se carga en diferido

`recharts` pesa ~400 kB minificado. Con `element` directo el bundle inicial
pasaba de 555 kB a 1,25 MB, castigando al catálogo —la pantalla de entrada— por
una feature interna. Con `lazy` del router queda en un chunk aparte
(`DashboardPage-*.js`, 403 kB) que solo se baja al entrar a `/dashboard`.

### D-05 — Componentes locales a la página

`Kpi`, `TooltipGrafico` y `Vacio` viven dentro de `DashboardPage.tsx`. Principio V
(YAGNI): mientras el dashboard sea la única pantalla con gráficos, extraerlos a
`components/` sería una abstracción sin segundo consumidor.

## Constitution Check

| Principio | Estado | Nota |
|---|---|---|
| I — SDD no negociable | ⚠️ PASS con desvío | Vía rápida acordada (spec + plan + tasks, sin research/quickstart/checklists). Hay `tasks.md` que motiva el código. |
| II — Human gate sobre IA | N/A | Feature de solo lectura; no genera contenido para el usuario final. El embudo justamente *muestra* el gate. |
| III — Stack congelado | ⚠️ PASS con adición | Ver Complexity Tracking. |
| IV — RLS y secretos | ✅ PASS | Ver Complexity Tracking: `SECURITY DEFINER` justificado y acotado a agregados. `service_role` no aparece en el frontend. |
| V — YAGNI | ✅ PASS | Sin abstracciones nuevas; se descartaron métricas que hubieran requerido limpiar datos. |

## Complexity Tracking

| Desvío | Por qué | Alternativa descartada |
|---|---|---|
| **Se agrega `recharts`** al stack congelado | El Principio III enumera framework, UI kit, router, estado y backend; no menciona gráficos. Recharts no reemplaza ninguna de esas piezas, se suma. | SVG/CSS a mano: sin tooltips ni animación, y más código propio que mantener. Decisión del usuario el 2026-08-06. |
| **Una función `SECURITY DEFINER`** en un proyecto donde el RLS es la barrera | Sin esto el dashboard muestra 20/26 publicaciones y 0/13 consultas como si fueran totales. Acotado a conteos: no devuelve filas ni PII. | Vista `security_invoker`: mismo resultado recortado. |
| **`/dashboard` sin protección de ruta** | Decisión explícita del usuario, a un día de la demo, para poder verlo funcionando sin login. | Registrado como deuda en `spec.md`: antes de producción, `RutaProtegida` + rol `admin`. |
| **Vía rápida SDD** | Un día hasta la demo. | Ciclo completo con research/quickstart/checklists. |

## Archivos

**Nuevos**
- `db/07_metricas_dashboard.sql` — el RPC
- `src/hooks/useMetricas.ts` — consulta Q7
- `src/pages/DashboardPage.tsx` — la pantalla

**Modificados**
- `src/types/database.ts` — entrada del RPC en `Functions` (el archivo se mantiene a mano)
- `src/lib/i18n.ts` — paletas de gráficos + `formatearFechaCorta`
- `src/routes.tsx` — ruta `/dashboard` en diferido, fuera de `RutaProtegida`
- `src/components/Navbar.tsx` — acceso, fuera del `!cargando`
- `docs/plan-producto.md` — estado de la etapa "dashboard"
