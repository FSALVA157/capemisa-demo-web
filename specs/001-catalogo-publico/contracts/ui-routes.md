# Contract — Rutas y contratos de página

**Feature**: 001-catalogo-publico
**Scope**: rutas expuestas por la SPA en esta feature, sus contratos de componente y las transiciones entre ellas.

Router: `react-router-dom` v6 (`createBrowserRouter`) montado en `web/src/main.tsx`.

---

## Ruta: `/`  →  `CatalogoPage`

**Componente**: `web/src/pages/CatalogoPage.tsx`
**User story**: US1 (Explorar el catálogo)
**Auth requerido**: NO

**Props**: ninguna (página raíz).

**Estado interno**:
- `filtros: { tipo: string | 'todos', keyword: string }` — sincronizado con query string (`?tipo=...&q=...`) para permitir compartir URLs con filtros aplicados.

**Composición**:

```text
<Layout>
  <Navbar />
  <main>
    <FiltrosGrilla value={filtros} onChange={setFiltros} />
    <SeccionResultados>
      {loading ? <Skeleton grid /> :
       error ? <Alert destructive con reintentar /> :
       data.length === 0 ? <EstadoVacio variant={filtros.tipo || filtros.keyword ? 'sin-resultados' : 'sin-publicaciones'} /> :
       <Grid>{data.map(p => <PublicacionCard key={p.id} publicacion={p} />)}</Grid>}
    </SeccionResultados>
  </main>
</Layout>
```

**Data source**: `usePublicaciones(filtros)` → Q1 de `supabase-queries.md`.

**Comportamiento en click de tarjeta**: navegación a `/publicacion/:id` vía `<Link>`.

**Query string convention**:
- `/` — sin filtros.
- `/?tipo=oferta_servicio` — filtro por tipo.
- `/?q=camion` — filtro por keyword.
- `/?tipo=venta_equipo&q=grupo` — combinados.

---

## Ruta: `/publicacion/:id`  →  `PublicacionDetallePage`

**Componente**: `web/src/pages/PublicacionDetallePage.tsx`
**User stories**: US2 (ver detalle), punto de entrada de US3 (solicitar contacto)
**Auth requerido**: NO

**Params**: `id: string` (UUID de la publicación).

**Estado interno**:
- `dialogAbierto: boolean` — estado del `<DialogSolicitarContacto>`.

**Composición**:

```text
<Layout>
  <Navbar />
  <main>
    {loading ? <SkeletonDetalle /> :
     error ? <NotFoundPage /> :
     <>
       <ImagenPublicacion url={data.imagen_url} />
       <Encabezado>
         <h1>{data.empresa}</h1>
         <BadgeTipo tipo={data.tipo_publicacion} />
         {data.urgencia && <BadgeUrgencia urgencia={data.urgencia} />}
       </Encabezado>
       <Metadatos>
         {data.rubro && <span>{data.rubro} / {data.subrubro}</span>}
         {data.zona && <span>Zona: {data.zona}</span>}
         {data.vencimiento && <span>Vence: {formatearFecha(data.vencimiento)}</span>}
       </Metadatos>
       <Descripcion>
         <h2>Descripción</h2>
         <p>{data.descripcion_comercial ?? data.descripcion}</p>
       </Descripcion>
       {data.condicion_comercial && <BloqueCondicion />}
       {data.disponibilidad && <BloqueDisponibilidad />}
       <Button onClick={() => setDialogAbierto(true)}>Solicitar contacto</Button>
     </>}
    <DialogSolicitarContacto
      publicacionId={id}
      open={dialogAbierto}
      onOpenChange={setDialogAbierto}
    />
  </main>
</Layout>
```

**Data source**: `usePublicacion(id)` → Q2.

**Comportamiento del botón "Solicitar contacto"**: abre `<DialogSolicitarContacto>` (US3).

**Casos de error**:
- id no existe / publicación no publicada → `NotFoundPage`.
- Error de red → `NotFoundPage` con mensaje diferenciado.

---

## Ruta: `*` (catch-all)  →  `NotFoundPage`

**Componente**: `web/src/pages/NotFoundPage.tsx`

**Props opcionales**:
- `mensaje?: string` — sobreescribir el texto default.
- `variant?: 'no-existe' | 'problema-tecnico'` — para diferenciar 404 puro vs error de red.

**Composición**:

```text
<Layout>
  <Navbar />
  <main>
    <EstadoVacio variant="no-encontrada" mensaje={mensaje} />
    <Button as={Link} to="/">Volver al catálogo</Button>
  </main>
</Layout>
```

---

## Componentes contractuales

### `<PublicacionCard>`

**Ubicación**: `web/src/components/PublicacionCard.tsx`
**Props**:
```ts
type Props = {
  publicacion: {
    id: string;
    empresa: string;
    tipo_publicacion: TipoPublicacion;
    rubro: string | null;
    descripcion: string;
    descripcion_comercial: string | null;
    zona: string | null;
    urgencia: 'baja' | 'media' | 'alta' | null;
    imagen_url: string | null;
  };
};
```

**Renderiza**:
- `<ImagenPublicacion>` arriba (aspect ratio 16:9).
- Nombre de empresa como título.
- Badge de tipo con color por tipo.
- Rubro (si existe) como sub-título.
- Descripción resumida (truncada a ~120 chars) usando `descripcion_comercial ?? descripcion`.
- Zona con ícono de mapa (si existe).
- Badge de urgencia (si existe) con color: baja=slate, media=amber, alta=red.
- Clickable entero → navega a `/publicacion/:id`.

### `<FiltrosGrilla>`

**Ubicación**: `web/src/components/FiltrosGrilla.tsx`
**Props**:
```ts
type Props = {
  value: { tipo: string; keyword: string };
  onChange: (next: { tipo: string; keyword: string }) => void;
};
```

**Renderiza**:
- Input de búsqueda con ícono lupa (debounce 300 ms interno).
- Select shadcn con: Todos, Oferta de servicio, Oferta de equipo, Venta de equipo, Búsqueda de proveedor, Búsqueda de equipo.
- Botón "Limpiar" visible cuando hay algún filtro activo.

**Mobile (<768 px)**: los filtros van colapsados en un `<Sheet>` o botón "Filtros" que expande.

### `<DialogSolicitarContacto>`

**Ubicación**: `web/src/components/DialogSolicitarContacto.tsx`
**Props**:
```ts
type Props = {
  publicacionId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};
```

**Contenido**: `<Dialog>` de shadcn con `<Form>` (react-hook-form + zod). Campos según R-04. Al submit exitoso, muestra Toast y cierra dialog.

### `<Navbar>`

**Ubicación**: `web/src/components/Navbar.tsx`
**Props**: ninguna (para esta feature).

**Contenido**: logo + título "CAPEMISA Conecta" con `<Link to="/">`. En esta feature NO hay botón de login (queda para futura feature).

**Responsive**: sticky top, altura 56 px mobile / 64 px desktop.

---

## Contrato de navegación

| Origen | Trigger | Destino |
|--------|---------|---------|
| `/` | click en tarjeta | `/publicacion/:id` |
| `/publicacion/:id` | click en logo/Home | `/` |
| `/publicacion/:id` | click en "Volver" (NotFound) | `/` |
| cualquier ruta desconocida | acceso directo por URL | `*` → `NotFoundPage` |

**Sin transiciones que requieran auth ni redirects condicionales en esta feature.**

---

## Contrato con la constitución

- **Idioma**: todos los strings visibles al usuario están en `web/src/lib/i18n.ts` centralizados en español rioplatense. NO strings hardcoded en componentes.
- **Responsive**: verificado a 375, 768 y 1440 px. Grilla: 1 / 2 / 3 columnas.
- **Sin filtraciones de datos privados**: los props de `<PublicacionCard>` y las páginas de detalle NO reciben ni exponen `responsable`, `telefono`, `email` de la publicación (Principio IV + FR-019).
