# Tareas — Feature 004: Dashboard de métricas

Leyenda: `[x]` hecha · `[ ]` pendiente · `[~]` parcial

## Fase 1 — Base de datos

- [x] **T001** Escribir `db/07_metricas_dashboard.sql`: función
  `public.metricas_dashboard()` → `jsonb`, `STABLE`, `SECURITY DEFINER`,
  `SET search_path = public, extensions`, sin parámetros. Devuelve
  `generado_en`, `totales`, `por_estado`, `por_tipo`, `por_urgencia`,
  `linea_tiempo`, `top_consultadas`. `GRANT EXECUTE` a `anon`, `authenticated`,
  `service_role`. (FR-002 … FR-008)
- [x] **T002** Guarda de división por cero en `consultas_por_publicada`.
- [x] **T003** `linea_tiempo` con `sum(n) OVER (ORDER BY dia)` y la fecha
  convertida a `America/Argentina/Salta` antes de truncar a día (si no, las
  cargas de la tarde caen al día siguiente por UTC).
- [x] **T004** Aplicar `db/07_metricas_dashboard.sql` en `capemisa-db`.
  Aplicada por MCP el 2026-08-06 **con autorización explícita del usuario**, que
  es la excepción que contempla la constitución.

## Fase 2 — Acceso a datos desde la web

- [x] **T005** Agregar `metricas_dashboard` al bloque `Functions` de
  `src/types/database.ts` (`Args: Record<string, never>`, `Returns: Json`). El
  archivo se mantiene a mano.
- [x] **T006** `src/hooks/useMetricas.ts`: tipo `Metricas` declarado localmente
  y `supabase.rpc("metricas_dashboard")`, con `queryKey: ["metricas"]`. Una sola
  llamada para toda la pantalla. (FR-007)
- [x] **T007** Normalizar los `jsonb_agg` que vuelven `NULL` cuando el
  subconjunto está vacío, para que la página no rompa al mapear. (FR-010)

## Fase 3 — Presentación

- [x] **T008** `npm i recharts` (3.x, por React 19).
- [x] **T009** Paletas de gráficos en `src/lib/i18n.ts`
  (`ESTADO_PUBLICACION_GRAFICO`, `URGENCIA_GRAFICO`,
  `TIPO_PUBLICACION_GRAFICO`, `URGENCIA_LABEL_GRAFICO`), en los mismos tonos que
  los badges existentes, más `formatearFechaCorta` para el eje X.
- [x] **T010** `src/pages/DashboardPage.tsx` con el esqueleto invariante del
  proyecto: `isLoading` → `Skeleton`, `isError` → `Alert` destructivo con
  "Reintentar", luego contenido. (AC-1.3)
- [x] **T011** Fila de cuatro indicadores. (FR-002)
- [x] **T012** Embudo: `BarChart` horizontal ordenado por ciclo de vida, con
  bajada que explica el gate humano. (FR-003)
- [x] **T013** Crecimiento acumulado: `AreaChart` con gradiente. (FR-004)
- [x] **T014** Dona por tipo + leyenda con conteos, y barras de urgencia.
  (FR-005)
- [x] **T015** Ranking de las cinco más consultadas, como lista con barra de
  proporción. (FR-006)
- [x] **T016** Estados vacíos por panel. (FR-010)
- [x] **T017** Todas las etiquetas vía `src/lib/i18n.ts`; copy rioplatense.
  (FR-009)

## Fase 4 — Ruta y navegación

- [x] **T018** Ruta `dashboard` en `src/routes.tsx`, **fuera** de
  `RutaProtegida`, con comentario que registra la deuda. (FR-001, FR-011)
- [x] **T019** Cargarla en diferido con `lazy` del router, para no engordar el
  bundle del catálogo. (SC-005)
- [x] **T020** Acceso en `src/components/Navbar.tsx`, fuera del `!cargando`
  (no depende de la sesión, adentro parpadearía).

## Fase 5 — Cierre

- [x] **T021** `npm run build` limpio (`tsc -b` incluido). Verificado: chunk
  `DashboardPage-*.js` separado, bundle inicial sin crecer.
- [x] **T022** Validado: 26 / 20 / 13 / 88 % y embudo 20-4-1-1, iguales a la
  consulta directa. (SC-001)
- [x] **T023** Verificado llamando el RPC con la anon key por HTTP: la
  respuesta no contiene `telefono`, `email`, `responsable`, `persona_contacto`
  ni `observaciones_internas`. (SC-002)
- [x] **T024** Verificado sin sesión (navegador limpio y llamada directa con la
  anon key): mismos números. (SC-003)
- [x] **T025** Verificado a 375 / 768 / 1440 px: `scrollWidth == clientWidth`
  en los tres. Dos ajustes salidos de acá: la etiqueta de los indicadores envuelve
  en vez de truncarse, y el eje de categorías del embudo achica su ancho por
  debajo de 640 px (`useEsAngosto`). (SC-004, AC-1.5)
- [x] **T026** Actualizar la tabla de estado de `docs/plan-producto.md`.
- [ ] **T027** Push a `main` → auto-deploy Coolify → validar en
  `capemisa-app.fsalva157.dev/dashboard`.
