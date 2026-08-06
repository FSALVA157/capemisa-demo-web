# Feature 004 — Dashboard de métricas

**Fecha**: 2026-08-06
**Estado**: implementada, pendiente de aplicar la migración en Supabase
**Rama**: `main`

> **Nota de proceso**: esta feature se especificó por la **vía rápida** acordada
> con el usuario a un día de la demo: `spec.md` + `plan.md` + `tasks.md`, sin
> `research.md`, `quickstart.md`, `data-model.md` ni `checklists/`. El Principio I
> de la constitución se cumple (existe un `tasks.md` que motiva el código), el
> nivel de detalle es menor que en las features 001–003 a propósito.

## Contexto

CAPEMISA Conecta tiene el circuito completo funcionando —bot de WhatsApp → la IA
clasifica y enriquece → un admin aprueba → catálogo público → solicitud de
contacto— pero **no tiene ninguna pantalla que lo muestre**.
`docs/plan-producto.md` ya listaba el dashboard como una de las etapas del
circuito, sin spec.

En la demo, mostrar el circuito paso a paso lleva varios minutos y depende de que
todo salga bien en vivo. Una pantalla de métricas lo cuenta de un vistazo y con
datos reales.

## User story

**US1 (P1) — Ver cómo viene funcionando la plataforma**

Como coordinador de CAPEMISA, abro una pestaña "Dashboard" y en una sola pantalla
veo cuánto se cargó, cuánto llegó al catálogo, cuántos contactos se generaron y
cuánto trabajo hizo la IA — sin tener que recorrer el catálogo ni pedirle números
a nadie.

**Criterios de aceptación**

- AC-1.1 Desde cualquier pantalla hay un acceso visible al dashboard.
- AC-1.2 Los números son los reales de la base, no ejemplos ni valores fijos.
- AC-1.3 Mientras cargan los datos hay esqueletos; si falla, un mensaje con
  "Reintentar".
- AC-1.4 Cada gráfico dice en una línea qué está mirando el que lo lee.
- AC-1.5 Se ve bien en teléfono (375 px), tablet (768 px) y escritorio (1440 px).

## Requisitos funcionales

- **FR-001** El dashboard vive en `/dashboard` y se llega desde la barra
  superior.
- **FR-002** Muestra cuatro indicadores de cabecera: publicaciones cargadas,
  publicaciones en el catálogo, consultas generadas y porcentaje clasificado
  por IA.
- **FR-003** Muestra el recorrido de una publicación por sus estados
  (`pendiente`, `faltan_datos`, `aprobada`, `publicada`, `rechazada`),
  ordenado por ciclo de vida y no por cantidad, para que se lea como embudo. Es
  la evidencia visual del Principio II (revisión humana sobre lo que hace la IA).
- **FR-004** Muestra el crecimiento acumulado del catálogo en el tiempo.
- **FR-005** Muestra la distribución por tipo de publicación y por urgencia,
  ambas asignadas por la IA, calculadas **solo sobre lo publicado**.
- **FR-006** Muestra las cinco publicaciones que más consultas generaron, con
  empresa y tipo.
- **FR-007** Los datos se obtienen en **una sola llamada**, de modo que todos los
  paneles reflejen la misma foto de la base.
- **FR-008** El origen de los datos devuelve **únicamente agregados**. No expone
  `telefono`, `email`, `responsable`, `persona_contacto` ni
  `observaciones_internas`, ni ninguna fila individual. `empresa` sí, porque ya
  es pública en el catálogo anónimo.
- **FR-009** La interfaz está en español rioplatense y nunca muestra
  identificadores técnicos: los estados, tipos y urgencias pasan por las
  etiquetas de `src/lib/i18n.ts`.
- **FR-010** Si algún conjunto viene vacío, el panel correspondiente dice qué
  falta en vez de mostrar un gráfico en blanco.
- **FR-011** *(temporal, alcance demo)* La ruta **no** exige sesión. Ver
  "Deuda conocida".

## Fuera de alcance

Elegido deliberadamente por calidad de los datos, no por tiempo:

| Métrica descartada | Motivo |
|---|---|
| Distribución por zona | `zona` es texto libre: 19 valores distintos para 26 filas |
| Estado de seguimiento de consultas | 13 de 13 en `nueva`; un gráfico de un solo valor |
| Matches generados por IA | `matches` está en `[]` en todas las filas |
| Tiempo hasta la aprobación | `updated_at ≈ created_at` en la mayoría (seeds): daría un número falso |
| Distribución por rubro | `rubro` sin normalizar (`Logistica` / `Logística` / `Transporte y Logística`) |

También fuera de alcance: exportar a CSV/PDF, filtros por rango de fechas,
comparación contra período anterior, actualización automática.

## Criterios de éxito

- **SC-001** Los cuatro indicadores coinciden con lo que devuelve una consulta
  directa a la base.
- **SC-002** El JSON que viaja al navegador no contiene ni un dato de contacto.
- **SC-003** El dashboard muestra los mismos números con sesión y sin sesión
  (prueba de que no depende del RLS del que consulta).
- **SC-004** Ningún desborde horizontal a 375 px.
- **SC-005** El bundle inicial del catálogo no crece por esta feature.

## Deuda conocida

1. **`/dashboard` es pública.** Muestra agregados de toda la plataforma,
   incluidas las publicaciones sin aprobar y el total de consultas: información
   interna de CAPEMISA aunque no sea PII. Antes de producción va dentro de
   `RutaProtegida` **y** con chequeo de rol `admin` (hoy `RutaProtegida` solo
   verifica que haya sesión). Decisión explícita del usuario, tomada el
   2026-08-06 a un día de la demo.
2. `rubro` sin normalizar: si se quiere un gráfico por rubro hay que limpiar
   antes los duplicados de acentuación.
