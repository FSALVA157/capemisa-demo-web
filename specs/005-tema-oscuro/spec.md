# Feature 005 — Tema claro / oscuro / sistema

**Fecha**: 2026-08-06
**Estado**: implementada
**Rama**: `feature-theme`

> **Nota de proceso**: igual que la feature 004, esta se especificó por la **vía
> rápida** acordada con el usuario: `spec.md` + `plan.md` + `tasks.md`, sin
> `research.md`, `quickstart.md`, `data-model.md` ni `checklists/`. El Principio I
> de la constitución se cumple (existe un `tasks.md` que motiva el código) y el
> nivel de detalle es menor que en las features 001–003 a propósito: el cambio es
> de presentación, no toca datos, RLS ni n8n.

## Contexto

La web se ve en un único tema claro. No hay forma de pasarla a oscuro ni de que
acompañe la preferencia del sistema operativo.

La constitución lista dark mode entre lo que queda **fuera de alcance por YAGNI
"hasta que una spec lo incorpore"**. Esta es esa spec: el ítem sale de la lista
de postergados por pedido explícito del usuario el 2026-08-06, y el Principio V
se sigue respetando en el alcance elegido (ver *Fuera de alcance*).

El terreno ya estaba preparado sin que nadie lo hubiera planificado:
`tailwind.config.js` venía con `darkMode: ["class"]` y los 9 pares de tokens
mapeados a `hsl(var(--…))`; `next-themes` ya era dependencia porque lo arrastra
el `sonner` de shadcn, y `src/components/ui/sonner.tsx` ya llamaba a `useTheme()`
sin ningún provider por encima. Y salvo dos overlays de shadcn, ningún componente
de dominio tenía colores hardcodeados: todo pasaba por tokens.

## User story

**US1 (P1) — Elegir cómo se ve la web**

Como visitante o miembro, elijo si la web se ve en claro u oscuro —o que siga al
sistema operativo— y la elección se mantiene cuando vuelvo.

**Criterios de aceptación**

- AC-1.1 Desde cualquier pantalla hay un control visible para cambiar el tema.
- AC-1.2 El control ofrece las tres opciones e indica cuál está activa.
- AC-1.3 La elección persiste entre recargas y entre visitas.
- AC-1.4 Con "Como el sistema", cambiar el tema del SO con la pestaña abierta se
  refleja en vivo.
- AC-1.5 Al recargar en oscuro no hay destello del tema claro.
- AC-1.6 Todo lo que se lee en claro se lee en oscuro, a 375, 768 y 1440 px.

## Requisitos funcionales

- **FR-001** Tres temas: `light`, `dark` y `system` (default).
- **FR-002** Control en la barra superior, presente en todas las rutas, incluido
  el dashboard y las del área de miembro.
- **FR-003** El control es independiente de la sesión: se muestra igual con o sin
  usuario, y no espera a que la sesión se resuelva.
- **FR-004** La preferencia se guarda en `localStorage` bajo `capemisa-tema`.
- **FR-005** El tema se aplica antes del primer pintado.
- **FR-006** Con `system`, la web sigue a `prefers-color-scheme` en vivo.
- **FR-007** Los badges de estado y urgencia son legibles en ambos temas.
- **FR-008** Los ejes, tooltips y series del dashboard son legibles en ambos
  temas.
- **FR-009** El `Toaster` de sonner acompaña el tema activo.
- **FR-010** Los textos del control están en español rioplatense y salen de
  `src/lib/i18n.ts`, como el resto de la interfaz.

## Fuera de alcance

Se descartaron en la conversación de alcance del 2026-08-06, y no se agregan sin
una spec que los pida:

- Color de acento configurable (implicaría paletas nuevas y revisar contraste en
  los dos temas).
- Escala tipográfica / tamaño de texto.
- Un tercer tema de alto contraste.
- Guardar la preferencia en `perfiles` para que siga al usuario entre
  dispositivos: es de presentación y por dispositivo, `localStorage` alcanza.

## Deuda

- Las tres paletas `*_GRAFICO` de `src/lib/i18n.ts` siguen siendo hex fijos.
  Están en escalas 400/500 y tienen contraste aceptable sobre fondo oscuro, pero
  no son tokens: si alguna vez se ajusta la paleta oscura, hay que revisarlas a
  mano. El comentario del archivo ya pedía mantener sincronizado cada badge con
  su par de gráfico.
- El script anti-destello de `index.html` duplica la clave `capemisa-tema` que
  también está en `src/main.tsx`. Son dos lugares que tienen que decir lo mismo;
  está comentado en ambos.
