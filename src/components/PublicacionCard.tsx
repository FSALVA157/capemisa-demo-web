import { Link } from "react-router-dom";
import { MapPin } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ImagenPublicacion } from "@/components/ImagenPublicacion";
import { TIPO_PUBLICACION_LABEL, URGENCIA_LABEL, URGENCIA_COLOR } from "@/lib/i18n";
import type { PublicacionListItem } from "@/hooks/usePublicaciones";

type Props = {
  publicacion: PublicacionListItem;
};

export function PublicacionCard({ publicacion }: Props) {
  const p = publicacion;
  const descripcionMostrada = p.descripcion_comercial ?? p.descripcion;
  const tipoLabel = TIPO_PUBLICACION_LABEL[p.tipo_publicacion] ?? p.tipo_publicacion;

  return (
    <Link to={`/publicacion/${p.id}`} className="block group">
      <Card className="overflow-hidden h-full transition group-hover:shadow-md group-hover:border-primary/40">
        <ImagenPublicacion url={p.imagen_url} alt={`${p.empresa} — ${tipoLabel}`} />
        <CardContent className="p-4 flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">{tipoLabel}</Badge>
            {p.urgencia && (
              <Badge className={URGENCIA_COLOR[p.urgencia] ?? ""}>
                Urgencia: {URGENCIA_LABEL[p.urgencia] ?? p.urgencia}
              </Badge>
            )}
          </div>
          <h3 className="font-semibold text-lg leading-tight">{p.empresa}</h3>
          {p.rubro && (
            <p className="text-sm text-muted-foreground">
              {p.rubro}
              {p.subrubro ? ` · ${p.subrubro}` : ""}
            </p>
          )}
          <p className="text-sm line-clamp-3 text-foreground/80">
            {descripcionMostrada}
          </p>
          {p.zona && (
            <p className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
              <MapPin className="h-3.5 w-3.5" />
              {p.zona}
            </p>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
