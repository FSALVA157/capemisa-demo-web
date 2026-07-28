export const TIPO_PUBLICACION_LABEL: Record<string, string> = {
  oferta_servicio: "Oferta de servicio",
  oferta_equipo: "Oferta de equipo",
  venta_equipo: "Venta de equipo",
  busqueda_proveedor: "Búsqueda de proveedor",
  busqueda_equipo: "Búsqueda de equipo",
};

export const TIPOS_PUBLICACION = [
  "oferta_servicio",
  "oferta_equipo",
  "venta_equipo",
  "busqueda_proveedor",
  "busqueda_equipo",
] as const;

export type TipoPublicacion = (typeof TIPOS_PUBLICACION)[number];

export const URGENCIA_LABEL: Record<string, string> = {
  baja: "Baja",
  media: "Media",
  alta: "Alta",
};

export const URGENCIA_COLOR: Record<string, string> = {
  baja: "bg-slate-200 text-slate-800 hover:bg-slate-200",
  media: "bg-amber-200 text-amber-900 hover:bg-amber-200",
  alta: "bg-red-200 text-red-900 hover:bg-red-200",
};

export function formatearFecha(iso: string | null | undefined): string {
  if (!iso) return "";
  try {
    return new Intl.DateTimeFormat("es-AR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function normalizarBusqueda(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .trim();
}
