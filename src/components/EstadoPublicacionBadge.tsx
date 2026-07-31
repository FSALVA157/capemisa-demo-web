import { Badge } from "@/components/ui/badge";
import { ESTADO_PUBLICACION_COLOR, ESTADO_PUBLICACION_LABEL } from "@/lib/i18n";

type Props = {
  estado: string | null | undefined;
  className?: string;
};

// Muestra el estado de una publicación en lenguaje comprensible (FR-011).
// El identificador técnico (`faltan_datos`, `aprobada`, …) NUNCA llega a la
// pantalla: si el estado no está en el mapa, se cae a un texto neutro en vez de
// mostrar el valor crudo de la base.
export function EstadoPublicacionBadge({ estado, className }: Props) {
  if (!estado) return null;

  const label = ESTADO_PUBLICACION_LABEL[estado] ?? "Estado desconocido";
  const color = ESTADO_PUBLICACION_COLOR[estado] ?? "";

  return <Badge className={[color, className].filter(Boolean).join(" ")}>{label}</Badge>;
}
