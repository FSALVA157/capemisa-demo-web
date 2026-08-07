# Tareas — Feature 005: Tema claro / oscuro / sistema

Leyenda: `[x]` hecha · `[ ]` pendiente · `[~]` parcial

## Fase 1 — Tokens

- [x] **T001** Bloque `.dark` en `src/index.css` con el set canónico de
  shadcn/slate, en el mismo formato HSL sin wrapper que el `:root`. `--radius`
  no se redefine. (FR-001)
- [x] **T002** Desviar `--destructive` del canon: shadcn/slate lo pone en
  `0 62.8% 30.6%`, un rojo apagado pensado para fondo, y la app lo usa como
  *texto* (`text-destructive` en el Alert de `/ingresar` y en los mensajes de
  validación). Medido en pantalla: ilegible. Queda en `0 72.2% 50.6%`.
- [x] **T003** Verificar que `tailwind.config.js` ya está en
  `darkMode: ["class"]` y no necesita cambios. Confirmado.

## Fase 2 — Provider y persistencia

- [x] **T004** Montar `ThemeProvider` de `next-themes` en `src/main.tsx`, por
  encima de `QueryClientProvider` y del `<Toaster/>`, con `attribute="class"`,
  `defaultTheme="system"`, `enableSystem`, `disableTransitionOnChange` y
  `storageKey="capemisa-tema"`. (FR-001, FR-004, FR-006, FR-009)
- [x] **T005** Script anti-destello en `index.html`, antes del bundle: lee
  `capemisa-tema` de `localStorage`, cae a `prefers-color-scheme` y deja la
  clase y el `color-scheme` puestos. Envuelto en `try/catch` por si
  `localStorage` está bloqueado. (FR-005)
- [x] **T006** `<html lang="en">` → `lang="es-AR"`. La interfaz es toda en
  español rioplatense y el atributo venía mintiendo desde el scaffold de Vite.

## Fase 3 — El control

- [x] **T007** `npx shadcn@latest add dropdown-menu` → genera
  `src/components/ui/dropdown-menu.tsx` y suma `@radix-ui/react-dropdown-menu`.
- [x] **T008** `TEMAS` y `TEMA_LABEL` en `src/lib/i18n.ts`. Los identificadores
  (`light` / `dark` / `system`) no se traducen: viajan a `localStorage` y a la
  clase del `<html>`. (FR-010)
- [x] **T009** `src/components/ThemeToggle.tsx`: botón `ghost` con `Sun`/`Moon`
  que abre el menú de tres opciones con `Check` en la activa. (FR-002)
- [x] **T010** Usar `resolvedTheme` para el ícono y `theme` para la tilde: con
  `theme === "system"` no se sabe qué ícono corresponde. (FR-006)
- [x] **T011** Guard de montaje: antes del primer efecto `theme` es `undefined`.
  Hasta que monte se dibuja el sol y ninguna tilde, en vez de marcar una opción
  equivocada por un frame.
- [x] **T012** `aria-label` + `sr-only` en el botón: en mobile es solo ícono.
- [x] **T013** Insertarlo en `src/components/Navbar.tsx` dentro del `<nav>` y
  **fuera** del guard `{!cargando && …}`, igual que el acceso al dashboard.
  (FR-003)

## Fase 4 — Legibilidad en oscuro

- [x] **T014** Variantes `dark:` de las 8 entradas de `URGENCIA_COLOR` y
  `ESTADO_PUBLICACION_COLOR` en `src/lib/i18n.ts`: de la escala 200/900 a
  `bg-*-500/15 text-*-300`. Van en las paletas y no en los cinco componentes que
  las consumen. (FR-007)
- [x] **T015** `EJE` de `src/pages/DashboardPage.tsx` de
  `hsl(215.4 16.3% 46.9%)` (copia congelada del valor claro) a
  `hsl(var(--muted-foreground))`. Recharts pasa el string tal cual al atributo
  del SVG, así que la `var()` resuelve contra el elemento. (FR-008)
- [x] **T016** Revisar el resto del color hardcodeado y decidir qué se deja: los
  dos overlays `bg-black/80` de `sheet.tsx` y `dialog.tsx`, el gradiente y el
  `stroke` `#10b981` del AreaChart, la barra `bg-emerald-500` del ranking y las
  tres paletas `*_GRAFICO` funcionan en ambos temas. Anotado en la deuda de
  `spec.md`.
- [x] **T017** Marca de la Navbar con `whitespace-nowrap` y
  `text-base sm:text-lg md:text-xl`. Sin esto, en 375 px el selector empujaba
  "CAPEMISA Conecta" a dos líneas y desbordaba el `h-14` del header (medido:
  56 px de alto contra 28 px).

## Fase 5 — Verificación

- [x] **T018** `npm run build` limpio (`tsc -b` incluido) y `npm run lint` sin
  warnings nuevos: quedan los 4 de `only-export-components` que ya estaban.
- [x] **T019** El script anti-destello sobrevive al build: `dist/index.html`
  contiene `capemisa-tema`.
- [x] **T020** Recorrido visual en oscuro a 1440 px: catálogo, detalle de
  publicación, diálogo de solicitud de contacto, panel del chat, `/ingresar`
  (con el error de credenciales) y `/dashboard` con sus cinco gráficos. Todo
  legible. (AC-1.6)
- [x] **T021** 375 px en oscuro: `scrollWidth == clientWidth` (360/360), sin
  desborde horizontal, y la marca en una sola línea. 768 px verificado en el
  recorrido de `/ingresar`. (AC-1.6)
- [x] **T022** Persistencia: elegir Oscuro y recargar → `localStorage` guarda
  `"dark"`, el `<html>` vuelve con `class="dark"` y `color-scheme: dark`.
  (AC-1.3)
- [x] **T023** Pestaña sin `localStorage`: arranca en `system` y el menú marca
  "Como el sistema". (FR-001)
- [ ] **V-1** Confirmar a ojo que al recargar en oscuro no hay destello claro.
  El script de `index.html` es síncrono y está antes del bundle, y sobrevive al
  build (T019), pero el destello es de un frame y no se mide con una captura.
- [ ] **V-2** Cambiar el tema del sistema operativo con la pestaña abierta en
  "Como el sistema" y confirmar que la web acompaña en vivo. El navegador
  automatizado no expone `prefers-color-scheme`. (AC-1.4)
- [ ] **V-3** Ver un toast de sonner en oscuro. `ui/sonner.tsx` ya consumía
  `useTheme()` y ahora encuentra provider, pero el toaster se monta recién con
  el primer toast y no se pudo disparar sin escribir una consulta real en la
  base. (FR-009)
- [ ] **V-4** Recorrer `/mi-area` y el formulario de alta/edición en oscuro:
  requieren una sesión de miembro. Ahí es donde más se ven los badges de
  `ESTADO_PUBLICACION_COLOR` de T014.

## Fase 6 — Cierre

- [x] **T024** Documentar en `CLAUDE.md` (sección de arquitectura) y actualizar
  `docs/plan-producto.md`.
- [ ] **T025** PR de `feature-theme` a `main` → Coolify → validar en producción.
