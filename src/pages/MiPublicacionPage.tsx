import { Link, useParams } from "react-router-dom";
import { AlertCircle, ArrowLeft, Calendar, Clock, MapPin, Pencil } from "lucide-react";
import { useMiPublicacion } from "@/hooks/useMiPublicacion";
import { useInteresados } from "@/hooks/useInteresados";
import { ListaInteresados } from "@/components/ListaInteresados";
import { EstadoPublicacionBadge } from "@/components/EstadoPublicacionBadge";
import { ImagenPublicacion } from "@/components/ImagenPublicacion";
import { EstadoVacio } from "@/components/EstadoVacio";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  TIPO_PUBLICACION_LABEL,
  URGENCIA_COLOR,
  URGENCIA_LABEL,
  formatearFecha,
} from "@/lib/i18n";

const ESTADOS_EDITABLES = ["pendiente", "faltan_datos"];

// Por qué no se puede editar, según el estado (FR-020). Que la acción no esté es
// necesario pero no suficiente: sin explicación, la ausencia del botón parece un
// error de la aplicación.
const MOTIVO_NO_EDITABLE: Record<string, string> = {
  aprobada:
    "Ya fue aprobada y está por publicarse, así que no se puede seguir editando. Si necesitás cambiar algo, escribinos.",
  publicada:
    "Está publicada en el catálogo y no se puede editar desde acá. Si necesitás cambiar algo, escribinos.",
  rechazada:
    "Fue rechazada por el equipo de CAPEMISA, así que no se puede editar. Si querés, cargá una publicación nueva.",
};

export default function MiPublicacionPage() {
  const { id } = useParams<{ id: string }>();
  const publicacion = useMiPublicacion(id);
  const interesados = useInteresados(id);

  if (publicacion.isLoading) {
    return (
      <div className="space-y-4 py-4">
        <Skeleton className="h-8 w-1/3" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  // Publicación inexistente y publicación de otro miembro dan exactamente el
  // mismo resultado, y la pantalla no los distingue: mostrar "es de otro"
  // confirmaría que ese identificador existe (AC-2.4).
  if (publicacion.isError || !publicacion.data) {
    return (
      <div className="py-8 flex flex-col items-center gap-4">
        <EstadoVacio variant="no-encontrada" />
        <Button asChild variant="outline">
          <Link to="/mi-area">
            <ArrowLeft className="h-4 w-4 mr-1" /> Volver a mis publicaciones
          </Link>
        </Button>
      </div>
    );
  }

  const p = publicacion.data;
  const tipoLabel = TIPO_PUBLICACION_LABEL[p.tipo_publicacion] ?? p.tipo_publicacion;
  const descripcionMostrada = p.descripcion_comercial ?? p.descripcion;
  const editable = ESTADOS_EDITABLES.includes(p.estado);

  return (
    <div>
      <div className="mb-4">
        <Button asChild variant="ghost" size="sm">
          <Link to="/mi-area">
            <ArrowLeft className="h-4 w-4 mr-1" /> Volver a mis publicaciones
          </Link>
        </Button>
      </div>

      <div className="grid md:grid-cols-[2fr_3fr] gap-6 md:gap-10">
        <div>
          <ImagenPublicacion
            url={p.imagen_url}
            alt={`${p.empresa} — ${tipoLabel}`}
            className="rounded-lg"
          />
        </div>

        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">{tipoLabel}</Badge>
            <EstadoPublicacionBadge estado={p.estado} />
            {p.urgencia && (
              <Badge className={URGENCIA_COLOR[p.urgencia] ?? ""}>
                Urgencia: {URGENCIA_LABEL[p.urgencia] ?? p.urgencia}
              </Badge>
            )}
          </div>

          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">{p.empresa}</h1>

          {(p.rubro || p.subrubro) && (
            <p className="text-muted-foreground">
              {p.rubro}
              {p.subrubro ? ` · ${p.subrubro}` : ""}
            </p>
          )}

          <div className="flex flex-col gap-1.5 text-sm text-muted-foreground">
            {p.zona && (
              <p className="flex items-center gap-2">
                <MapPin className="h-4 w-4" /> Zona: {p.zona}
              </p>
            )}
            {p.disponibilidad && (
              <p className="flex items-center gap-2">
                <Clock className="h-4 w-4" /> Disponibilidad: {p.disponibilidad}
              </p>
            )}
            {p.vencimiento && (
              <p className="flex items-center gap-2">
                <Calendar className="h-4 w-4" /> Vence: {formatearFecha(p.vencimiento)}
              </p>
            )}
            <p>Creada el {formatearFecha(p.created_at)}</p>
          </div>

          <div className="pt-2">
            <h2 className="text-lg font-semibold mb-2">Descripción</h2>
            <p className="text-foreground/90 whitespace-pre-line">{descripcionMostrada}</p>
          </div>

          {p.condicion_comercial && (
            <div>
              <h2 className="text-lg font-semibold mb-1">Condición comercial</h2>
              <p className="text-foreground/90">{p.condicion_comercial}</p>
            </div>
          )}

          <div>
            <h2 className="text-lg font-semibold mb-1">Datos de contacto publicados</h2>
            <p className="text-sm text-muted-foreground">
              {p.responsable} · {p.telefono} · {p.email}
            </p>
          </div>

          {editable ? (
            <div>
              <Button asChild variant="outline">
                <Link to={`/mi-area/publicacion/${p.id}/editar`}>
                  <Pencil className="mr-2 h-4 w-4" /> Editar publicación
                </Link>
              </Button>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              {MOTIVO_NO_EDITABLE[p.estado] ?? "Esta publicación no se puede editar."}
            </p>
          )}
        </div>
      </div>

      <section className="mt-10">
        <h2 className="text-xl font-semibold tracking-tight mb-1">Quiénes se interesaron</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Consultas que dejaron desde el catálogo público.
        </p>

        {interesados.isLoading && (
          <div className="space-y-3">
            {[0, 1].map((i) => (
              <Skeleton key={i} className="h-28 w-full" />
            ))}
          </div>
        )}

        {interesados.isError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>No pudimos cargar las consultas</AlertTitle>
            <AlertDescription className="flex flex-col items-start gap-3">
              <span>Puede ser un problema de conexión. Probá de nuevo.</span>
              <Button variant="outline" size="sm" onClick={() => interesados.refetch()}>
                Reintentar
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {!interesados.isLoading && !interesados.isError && (
          <ListaInteresados interesados={interesados.data ?? []} />
        )}
      </section>
    </div>
  );
}
