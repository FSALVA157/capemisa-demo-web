import { Link } from "react-router-dom";
import { AlertCircle, MapPin, MessageSquare, Pencil, Plus } from "lucide-react";
import { useMisPublicaciones } from "@/hooks/useMisPublicaciones";
import { EstadoPublicacionBadge } from "@/components/EstadoPublicacionBadge";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { TIPO_PUBLICACION_LABEL, formatearFecha } from "@/lib/i18n";
import { useAuth } from "@/auth/AuthProvider";

// Cuadro de estados de data-model.md: el miembro solo puede editar mientras la
// publicación siga sin revisar. Ofrecer editar en otro estado produce un fallo
// silencioso — el RLS no devuelve error, simplemente no actualiza ninguna fila.
const ESTADOS_EDITABLES = ["pendiente", "faltan_datos"];

export default function MiAreaPage() {
  const { perfil, perfilFaltante } = useAuth();
  const { data, isLoading, isError, refetch } = useMisPublicaciones();

  return (
    <div className="py-2">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">
            Mis publicaciones
          </h1>
          <p className="text-muted-foreground mt-1">
            {perfil?.empresa
              ? perfil.empresa
              : perfilFaltante
                ? "Tu cuenta todavía no tiene una empresa asociada. Escribinos para que la vinculemos."
                : " "}
          </p>
        </div>
        <Button asChild>
          <Link to="/mi-area/nueva">
            <Plus className="mr-2 h-4 w-4" />
            Nueva publicación
          </Link>
        </Button>
      </div>

      {isLoading && (
        <div className="space-y-4">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      )}

      {isError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>No pudimos cargar tus publicaciones</AlertTitle>
          <AlertDescription className="flex flex-col items-start gap-3">
            <span>Puede ser un problema de conexión. Probá de nuevo.</span>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              Reintentar
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {!isLoading && !isError && data?.length === 0 && (
        <Card className="mx-auto max-w-md">
          <CardContent className="flex flex-col items-center text-center py-10 gap-3">
            <div className="rounded-full bg-muted p-3">
              <Plus className="h-8 w-8 text-muted-foreground" />
            </div>
            <h2 className="text-lg font-semibold">Todavía no publicaste nada</h2>
            <p className="text-sm text-muted-foreground">
              Publicá una oferta o una búsqueda y el equipo de Minería Conecta la revisa antes de
              mostrarla en el catálogo.
            </p>
            <Button asChild className="mt-2">
              <Link to="/mi-area/nueva">Crear mi primera publicación</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {!isLoading && !isError && data && data.length > 0 && (
        <ul className="space-y-4">
          {data.map((p) => {
            const tipoLabel = TIPO_PUBLICACION_LABEL[p.tipo_publicacion] ?? p.tipo_publicacion;
            const descripcion = p.descripcion_comercial ?? p.descripcion;
            const editable = ESTADOS_EDITABLES.includes(p.estado);

            return (
              <li key={p.id}>
                <Card className="transition hover:border-primary/40">
                  <CardContent className="p-4 flex flex-col gap-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="secondary">{tipoLabel}</Badge>
                      <EstadoPublicacionBadge estado={p.estado} />
                    </div>

                    <Link
                      to={`/mi-area/publicacion/${p.id}`}
                      className="text-sm text-foreground/80 line-clamp-2 hover:underline"
                    >
                      {descripcion}
                    </Link>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <MessageSquare className="h-3.5 w-3.5" />
                        {p.cantidad_consultas === 1
                          ? "1 interesado"
                          : `${p.cantidad_consultas} interesados`}
                      </span>
                      {p.zona && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5" />
                          {p.zona}
                        </span>
                      )}
                      <span>Creada el {formatearFecha(p.created_at)}</span>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Button asChild variant="outline" size="sm">
                        <Link to={`/mi-area/publicacion/${p.id}`}>Ver interesados</Link>
                      </Button>
                      {/* La acción de editar no se ofrece cuando el estado no lo
                          permite: no se muestra deshabilitada, directamente no está. */}
                      {editable && (
                        <Button asChild variant="ghost" size="sm">
                          <Link to={`/mi-area/publicacion/${p.id}/editar`}>
                            <Pencil className="mr-2 h-3.5 w-3.5" />
                            Editar
                          </Link>
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
