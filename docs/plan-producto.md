# Plan de producto — CAPEMISA Conecta (demo)

Contexto de producto para alimentar los `/speckit-specify`. Complementa a `CLAUDE.md`, que
cubre lo técnico del frontend; acá va el **qué** y el **por qué**, no el cómo.

Destilado de la planificación original (10/7/2026) con el coordinador **Edgardo Leonel Salva**.
Fuentes primarias, fuera del repo, en el directorio padre `capemisa-app-demo/`:
`Requerimientos_capemisa.docx` (brief del cliente) y `discusion` (charla de planificación).

## El problema

Un grupo de proveedores de empresas mineras usa hoy un **grupo de WhatsApp** para ofertar sus
productos y esperar que alguien los vea. Es un problema de descubrimiento y matching: las ofertas
se pierden en un chat desordenado.

La demo es **institucional**: sirve para validar el modelo antes de encarar la plataforma completa.
Eso justifica cada simplificación de la sección "Alcance".

## El circuito a demostrar

```
empresa carga oferta → IA clasifica/enriquece → admin aprueba → catálogo
    → solicitud de contacto → dashboard
```

La carga puede entrar por dos canales que comparten la misma base de datos: **WhatsApp 1-a-1**
con el bot (n8n, ya operativo) y la **web** (feature 002). El paso de aprobación humana no es
opcional: es lo que hace seguro que la IA clasifique mal alguna vez.

## Estado por etapa

| Etapa | Dónde vive | Estado |
|---|---|---|
| Catálogo público + solicitud de contacto | web, feature 001 | ✅ |
| Login + área de miembro (listado propio, interesados, alta y edición) | web, feature 002 | ✅ |
| Carga conversacional + enriquecimiento IA + matching | n8n (7 workflows) | ✅ |
| **Panel admin** — aprobar `pendiente` → `publicada` | — | ❌ sin spec |
| **Dashboard** de indicadores | web, feature 004 | ✅ |
| **Chat web embebido** (misma IA que el bot) | web, feature 003 | ✅ |
| Tema claro / oscuro / sistema | web, feature 005 | ✅ |

El panel admin es el que cierra el circuito end-to-end: hoy una publicación creada desde
`/mi-area` queda en `pendiente` y **no hay forma en la web de aprobarla**.

## Alcance de la demo (simplificaciones deliberadas vs. el brief)

No son deuda técnica por descuido: son decisiones tomadas y acordadas. Una spec puede revertir
cualquiera, pero explicitando el costo.

- **Formulario de carga**: 2 ramas condicionales (servicio / venta de equipo) en vez de las 8 del
  brief. Cubren los 3 casos de prueba precargados.
- **Estados de publicación**: 5 (`pendiente`, `faltan_datos`, `aprobada`, `publicada`,
  `rechazada`) en vez de 8.
- **Dashboard**: 5 indicadores en vez de 11. La feature 004 los ajustó a lo que los datos
  soportan hoy: publicaciones cargadas, publicaciones en el catálogo, solicitudes de contacto,
  porcentaje clasificado por IA, más el embudo de estados, el crecimiento acumulado, el mix por
  tipo y urgencia, y el ranking de más consultadas. Quedaron afuera **rubros más activos** (el
  campo `rubro` está sin normalizar: `Logistica` / `Logística` / `Transporte y Logística`) y
  **zona** (texto libre, 19 valores distintos para 26 filas). Ver `specs/004-dashboard-metricas/spec.md`.
- **Sin upload real de archivos** en la web: las imágenes vienen del pipeline de WhatsApp
  (Cloudinary vía n8n) o de seeds.
- **Sin registro público**: las cuentas las carga CAPEMISA a mano.
- **Cláusula de responsabilidad**: un checkbox y listo.

## WhatsApp: el límite que no se cruza

La API oficial **no lee grupos**, y las alternativas no oficiales (tipo Baileys) violan los TOS.
La sección 10 del doc de requerimientos lo excluye explícitamente.

Por eso WhatsApp entra en dos formas, ninguna de ellas "el bot en el grupo":

1. **Canal de salida**: el sistema genera el texto listo (`texto_whatsapp`) y el coordinador lo
   copia y pega en el grupo.
2. **Bot 1-a-1** con el número business, que sí es un canal de entrada completo.

## Los cuatro golpes de efecto de IA

Lo que la demo tiene que mostrar funcionando en vivo:

1. Clasificar rubro y subrubro desde un texto informal.
2. Mejorar una descripción cruda → texto comercial presentable.
3. Generar título + versión para WhatsApp.
4. Detectar el match entre una oferta y una búsqueda.

## Casos de prueba precargados

1. Camionetas 4x4 con chofer a la Puna (oferta de servicio)
2. Neumáticos para flota (búsqueda de proveedor)
3. Grupo electrógeno usado (venta de equipo)

**Crítico**: tiene que haber sembrada al menos una búsqueda que cruce con una oferta, o el
matching de IA (golpe de efecto 4) no se puede mostrar.

## Condiciones no negociables del cliente

- **Aprobación final humana** sobre todo lo que genera la IA.
- Información comercial **confidencial**.
- Las cuentas de servicio van a nombre del proyecto CAPEMISA, no personales.

## Por qué no hay backend propio

La decisión original contemplaba NestJS. Se descartó **para la demo**, no para siempre: Supabase
cubre las tres capas que haría falta construir (Postgres, Auth, API vía PostgREST), y el modelo de
dos niveles de acceso —miembros que publican vs. público que consulta— se resuelve
declarativamente con RLS, que además es vistoso de mostrar.

NestJS entra cuando aparezca lógica de negocio real, orquestación o credenciales que esconder.
Nada de lo construido se tira: la base es Postgres puro.
