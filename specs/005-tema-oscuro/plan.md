# Plan — Feature 005: Tema claro / oscuro / sistema

## Enfoque

Un bloque `.dark` con las variables de shadcn, un `ThemeProvider` de
`next-themes` en la raíz, y un botón con menú en la Navbar. Nada de datos: cero
consultas nuevas, cero cambios en `db/*.sql`, en `src/types/database.ts` ni en
los workflows de n8n.

## Decisiones

### D-01 — `next-themes`, que ya estaba instalado

No es una adición al stack: `next-themes@^0.4.6` ya era dependencia porque lo
arrastra el `sonner` de shadcn, y `src/components/ui/sonner.tsx:8` ya llamaba a
`useTheme()`. Sin provider por encima, esa llamada caía siempre al default
`"system"` y el toast se quedaba en claro. Montar el provider lo arregla de yapa.

La alternativa —un context propio de ~40 líneas con `localStorage` y
`matchMedia`— hubiera sido código nuevo que mantener para reimplementar algo que
ya estaba en el `package.json` y que `sonner` ya esperaba encontrar.

### D-02 — Clase en `<html>`, no `prefers-color-scheme`

`tailwind.config.js` ya venía con `darkMode: ["class"]`. Resolver el tema con
`@media (prefers-color-scheme: dark)` hubiera sido más corto, pero entonces la
elección del usuario no le puede ganar al sistema, que es justamente FR-001.

### D-03 — El script anti-destello va en `index.html`

`next-themes` está pensado para SSR: en producción inyecta un script en el HTML
del servidor. En una SPA de Vite no hay tal HTML, así que la clase se aplica
recién en el primer efecto de React — después del primer pintado. Recargar en
oscuro daba un flash blanco de un frame (FR-005, AC-1.5).

El script inline de `index.html` lee la misma `storageKey` y deja el `<html>` ya
pintado antes de que se descargue el bundle. Es el único lugar del proyecto que
toca `index.html`; el costo es la clave duplicada, anotada como deuda en la spec.

Se aprovechó el mismo archivo para corregir `<html lang="en">` → `lang="es-AR"`:
la interfaz es toda en español rioplatense por regla del proyecto y el atributo
mentía desde el scaffold de Vite.

### D-04 — Menú de tres opciones, no un botón que alterna

Decisión del usuario. Un toggle binario no puede expresar "seguí al sistema", que
es el default y lo que ve quien nunca tocó el control.

Requiere `src/components/ui/dropdown-menu.tsx` (`npx shadcn@latest add
dropdown-menu`, que suma `@radix-ui/react-dropdown-menu`). No es un desvío del
Principio III: es un componente más de la librería UI que el proyecto ya usa,
configurada en `components.json`, y ya había cuatro paquetes `@radix-ui/*`
instalados por los otros componentes.

### D-05 — Las variantes `dark:` van en las paletas, no en los componentes

Los badges de `URGENCIA_COLOR` y `ESTADO_PUBLICACION_COLOR` estaban en escala
200/900 —fondo clarísimo, texto oscurísimo—, que sobre fondo oscuro quedan como
manchas fluorescentes. La variante oscura (`bg-*-500/15 text-*-300`) se agregó en
`src/lib/i18n.ts`, donde ya viven, y no en los cinco componentes que las
consumen: un cambio de color sigue siendo un cambio en un solo archivo.

### D-06 — Los ejes del dashboard como `var()`, no como valor resuelto

`DashboardPage.tsx` tenía el HSL de `--muted-foreground` copiado a mano
(`hsl(215.4 16.3% 46.9%)`) porque recharts recibe colores como string, no como
clase. En oscuro los cuatro ejes quedaban casi invisibles.

El fix es de una línea: `hsl(var(--muted-foreground))`. Recharts pasa el string
tal cual al atributo del SVG, así que el navegador resuelve la `var()` contra el
elemento y el eje sigue al tema sin código extra ni `useTheme()` en la página.

El gradiente y el `stroke` `#10b981` del AreaChart, la barra `bg-emerald-500` del
ranking y las tres paletas `*_GRAFICO` se dejaron como estaban: escalas 400/500,
con contraste aceptable sobre fondo oscuro. Anotado en la deuda de la spec.

## Constitution Check

| Principio | Estado | Nota |
|---|---|---|
| I — SDD no negociable | ⚠️ PASS con desvío | Vía rápida, igual que la 004. Hay `tasks.md` que motiva el código. |
| II — Human gate sobre IA | N/A | No hay contenido generado por IA involucrado. |
| III — Stack congelado | ✅ PASS | `next-themes` ya estaba instalado; `dropdown-menu` es un componente de la librería UI vigente. |
| IV — RLS y secretos | ✅ PASS | Feature de presentación: no toca consultas, ni políticas, ni claves. |
| V — YAGNI | ✅ PASS | El ítem sale de la lista de postergados por pedido explícito. Se acotó a los tres temas y se descartaron acento, escala tipográfica y alto contraste. Sin abstracciones nuevas: un componente con un único consumidor. |

## Archivos

**Nuevos**
- `src/components/ThemeToggle.tsx` — el control
- `src/components/ui/dropdown-menu.tsx` — generado por shadcn, sin editar

**Modificados**
- `src/index.css` — bloque `.dark`
- `src/main.tsx` — `ThemeProvider` en la raíz
- `index.html` — script anti-destello + `lang="es-AR"`
- `src/components/Navbar.tsx` — el control, fuera del `!cargando`
- `src/lib/i18n.ts` — variantes `dark:` de los badges + `TEMAS` / `TEMA_LABEL`
- `src/pages/DashboardPage.tsx` — `EJE` con `var()`
- `CLAUDE.md`, `docs/plan-producto.md` — documentación
