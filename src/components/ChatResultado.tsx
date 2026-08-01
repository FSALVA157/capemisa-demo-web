import { Link } from "react-router-dom";
import { MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ImagenPublicacion } from "@/components/ImagenPublicacion";
import { TIPO_PUBLICACION_LABEL, URGENCIA_LABEL, URGENCIA_COLOR } from "@/lib/i18n";
import type { ResultadoChat } from "@/lib/chatApi";

type Props = {
  resultado: ResultadoChat;
};

// Tarjeta de un resultado del chat. Deliberadamente NO muestra `texto_whatsapp`
// (es texto para pegar en un grupo, no para una tarjeta web) ni ningún dato de
// contacto del oferente: el tipo `ResultadoChat` ni siquiera declara `telefono`.
export function ChatResultado({ resultado }: Props) {
  const r = resultado;
  const tipoLabel = TIPO_PUBLICACION_LABEL[r.tipo_publicacion] ?? r.tipo_publicacion;

  return (
    <Link
      to={`/publicacion/${r.id}`}
      className="block rounded-lg border bg-background overflow-hidden transition hover:border-primary/40 hover:shadow-sm"
    >
      {r.imagen_url && (
        <ImagenPublicacion
          url={r.imagen_url}
          alt={`${r.empresa} — ${tipoLabel}`}
          className="aspect-[16/7]"
        />
      )}
      <div className="p-3 flex flex-col gap-1.5">
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge variant="secondary" className="text-[11px]">
            {tipoLabel}
          </Badge>
          {r.urgencia && (
            <Badge className={`text-[11px] ${URGENCIA_COLOR[r.urgencia] ?? ""}`}>
              Urgencia: {URGENCIA_LABEL[r.urgencia] ?? r.urgencia}
            </Badge>
          )}
        </div>
        <p className="font-semibold leading-tight text-sm">{r.empresa}</p>
        {r.rubro && (
          <p className="text-xs text-muted-foreground">
            {r.rubro}
            {r.subrubro ? ` · ${r.subrubro}` : ""}
          </p>
        )}
        {r.descripcion_comercial && (
          <p className="text-xs text-foreground/80 line-clamp-2">
            {r.descripcion_comercial}
          </p>
        )}
        {r.zona && (
          <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
            <MapPin className="h-3 w-3" />
            {r.zona}
          </p>
        )}
        <span className="text-xs font-medium text-primary mt-0.5">
          Ver publicación →
        </span>
      </div>
    </Link>
  );
}
