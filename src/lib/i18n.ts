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

// Estados del ciclo de vida de una publicación, tal como los guarda la base.
// La interfaz nunca muestra el identificador técnico (FR-011): siempre pasa por
// ESTADO_PUBLICACION_LABEL.
export const ESTADOS_PUBLICACION = [
  "pendiente",
  "faltan_datos",
  "aprobada",
  "publicada",
  "rechazada",
] as const;

export type EstadoPublicacion = (typeof ESTADOS_PUBLICACION)[number];

export const ESTADO_PUBLICACION_LABEL: Record<string, string> = {
  pendiente: "Pendiente de revisión",
  faltan_datos: "Faltan datos",
  aprobada: "Aprobada, por publicarse",
  publicada: "Publicada",
  rechazada: "Rechazada",
};

export const ESTADO_PUBLICACION_COLOR: Record<string, string> = {
  pendiente: "bg-amber-200 text-amber-900 hover:bg-amber-200",
  faltan_datos: "bg-orange-200 text-orange-900 hover:bg-orange-200",
  aprobada: "bg-sky-200 text-sky-900 hover:bg-sky-200",
  publicada: "bg-emerald-200 text-emerald-900 hover:bg-emerald-200",
  rechazada: "bg-red-200 text-red-900 hover:bg-red-200",
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
