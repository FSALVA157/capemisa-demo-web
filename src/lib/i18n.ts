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

// Paleta para los gráficos del dashboard (feature 004).
//
// Recharts recibe colores como string, no como clase de Tailwind, así que no
// se pueden reusar las constantes *_COLOR de arriba. Estos valores son los
// mismos tonos de la escala Tailwind que usan esos badges, un escalón o dos
// más saturados para que se lean como área rellena y no como fondo de pastilla.
// Si cambia un badge, cambiar también su par acá.
export const ESTADO_PUBLICACION_GRAFICO: Record<string, string> = {
  pendiente: "#f59e0b", // amber-500
  faltan_datos: "#fb923c", // orange-400
  aprobada: "#38bdf8", // sky-400
  publicada: "#10b981", // emerald-500
  rechazada: "#f87171", // red-400
};

export const URGENCIA_GRAFICO: Record<string, string> = {
  baja: "#94a3b8", // slate-400
  media: "#f59e0b", // amber-500
  alta: "#ef4444", // red-500
  sin_dato: "#cbd5e1", // slate-300
};

export const TIPO_PUBLICACION_GRAFICO: Record<string, string> = {
  oferta_servicio: "#10b981", // emerald-500
  oferta_equipo: "#0ea5e9", // sky-500
  venta_equipo: "#8b5cf6", // violet-500
  busqueda_proveedor: "#f59e0b", // amber-500
  busqueda_equipo: "#f43f5e", // rose-500
};

// La IA puede dejar `urgencia` en null; el RPC lo mapea a 'sin_dato'.
export const URGENCIA_LABEL_GRAFICO: Record<string, string> = {
  ...URGENCIA_LABEL,
  sin_dato: "Sin clasificar",
};

// Eje X del gráfico de crecimiento: "11 jul" en vez de "11 de julio de 2026",
// que no entra. Recibe 'YYYY-MM-DD' (fecha ya calculada en hora de Salta por el
// RPC), así que se parsea como local para no correrse un día por UTC.
export function formatearFechaCorta(dia: string): string {
  const [a, m, d] = dia.split("-").map(Number);
  if (!a || !m || !d) return dia;
  return new Intl.DateTimeFormat("es-AR", { day: "numeric", month: "short" })
    .format(new Date(a, m - 1, d))
    .replace(".", "");
}
