import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, MapPin, Calendar, Clock } from "lucide-react";
import { usePublicacion } from "@/hooks/usePublicacion";
import { ImagenPublicacion } from "@/components/ImagenPublicacion";
import { EstadoVacio } from "@/components/EstadoVacio";
import { DialogSolicitarContacto } from "@/components/DialogSolicitarContacto";
import { ChatWidget } from "@/components/ChatWidget";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  TIPO_PUBLICACION_LABEL,
  URGENCIA_LABEL,
  URGENCIA_COLOR,
  formatearFecha,
} from "@/lib/i18n";

export default function PublicacionDetallePage() {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading, isError } = usePublicacion(id);
  const [dialogAbierto, setDialogAbierto] = useState(false);

  if (isLoading) {
    return (
      <div className="grid md:grid-cols-2 gap-8">
        <Skeleton className="aspect-video w-full" />
        <div className="space-y-4">
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-24 w-full" />
        </div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="py-8 flex flex-col items-center gap-4">
        <EstadoVacio variant="no-encontrada" />
        <Button asChild variant="outline">
          <Link to="/">
            <ArrowLeft className="h-4 w-4 mr-1" /> Volver al catálogo
          </Link>
        </Button>
      </div>
    );
  }

  const tipoLabel =
    TIPO_PUBLICACION_LABEL[data.tipo_publicacion] ?? data.tipo_publicacion;
  const descripcionMostrada = data.descripcion_comercial ?? data.descripcion;

  return (
    <div>
      <div className="mb-4">
        <Button asChild variant="ghost" size="sm">
          <Link to="/">
            <ArrowLeft className="h-4 w-4 mr-1" /> Volver al catálogo
          </Link>
        </Button>
      </div>

      <div className="grid md:grid-cols-[2fr_3fr] gap-6 md:gap-10">
        <div>
          <ImagenPublicacion
            url={data.imagen_url}
            alt={`${data.empresa} — ${tipoLabel}`}
            className="rounded-lg"
          />
        </div>

        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">{tipoLabel}</Badge>
            {data.urgencia && (
              <Badge className={URGENCIA_COLOR[data.urgencia] ?? ""}>
                Urgencia: {URGENCIA_LABEL[data.urgencia] ?? data.urgencia}
              </Badge>
            )}
          </div>

          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">
            {data.empresa}
          </h1>

          {(data.rubro || data.subrubro) && (
            <p className="text-muted-foreground">
              {data.rubro}
              {data.subrubro ? ` · ${data.subrubro}` : ""}
            </p>
          )}

          <div className="flex flex-col gap-1.5 text-sm text-muted-foreground">
            {data.zona && (
              <p className="flex items-center gap-2">
                <MapPin className="h-4 w-4" /> Zona: {data.zona}
              </p>
            )}
            {data.disponibilidad && (
              <p className="flex items-center gap-2">
                <Clock className="h-4 w-4" /> Disponibilidad: {data.disponibilidad}
              </p>
            )}
            {data.vencimiento && (
              <p className="flex items-center gap-2">
                <Calendar className="h-4 w-4" /> Vence:{" "}
                {formatearFecha(data.vencimiento)}
              </p>
            )}
          </div>

          <div className="pt-2">
            <h2 className="text-lg font-semibold mb-2">Descripción</h2>
            <p className="text-foreground/90 whitespace-pre-line">
              {descripcionMostrada}
            </p>
          </div>

          {data.condicion_comercial && (
            <div>
              <h2 className="text-lg font-semibold mb-2">Condición comercial</h2>
              <p className="text-foreground/90">{data.condicion_comercial}</p>
            </div>
          )}

          <div className="pt-4">
            <Button size="lg" onClick={() => setDialogAbierto(true)}>
              Solicitar contacto
            </Button>
            <p className="text-xs text-muted-foreground mt-2">
              El equipo de CAPEMISA te va a poner en contacto con la empresa.
            </p>
          </div>
        </div>
      </div>

      <DialogSolicitarContacto
        publicacionId={data.id}
        open={dialogAbierto}
        onOpenChange={setDialogAbierto}
      />

      <ChatWidget />
    </div>
  );
}
