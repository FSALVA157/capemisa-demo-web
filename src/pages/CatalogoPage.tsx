import { useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { AlertCircle } from "lucide-react";
import { usePublicaciones } from "@/hooks/usePublicaciones";
import { PublicacionCard } from "@/components/PublicacionCard";
import { FiltrosGrilla } from "@/components/FiltrosGrilla";
import { EstadoVacio } from "@/components/EstadoVacio";
import { ChatWidget } from "@/components/ChatWidget";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

export default function CatalogoPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const filtros = useMemo(
    () => ({
      tipo: searchParams.get("tipo") ?? "todos",
      keyword: searchParams.get("q") ?? "",
    }),
    [searchParams],
  );

  const setFiltros = (next: { tipo: string; keyword: string }) => {
    const params = new URLSearchParams();
    if (next.tipo && next.tipo !== "todos") params.set("tipo", next.tipo);
    if (next.keyword.trim()) params.set("q", next.keyword.trim());
    setSearchParams(params, { replace: true });
  };

  const { data, isLoading, isError, refetch } = usePublicaciones(filtros);
  const hayFiltrosActivos =
    (filtros.tipo && filtros.tipo !== "todos") || filtros.keyword.trim() !== "";

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">
          Catálogo de publicaciones
        </h1>
        <p className="text-muted-foreground mt-1">
          Ofertas y búsquedas activas de la red CAPEMISA.
        </p>
      </div>

      <FiltrosGrilla value={filtros} onChange={setFiltros} />

      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="space-y-3">
              <Skeleton className="aspect-video w-full" />
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-4 w-full" />
            </div>
          ))}
        </div>
      )}

      {isError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>No pudimos cargar el catálogo</AlertTitle>
          <AlertDescription className="flex flex-col gap-3">
            <span>Puede ser un problema temporal de conexión.</span>
            <Button onClick={() => refetch()} variant="outline" className="w-fit">
              Reintentar
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {!isLoading && !isError && data && data.length === 0 && (
        <EstadoVacio
          variant={hayFiltrosActivos ? "sin-resultados" : "sin-publicaciones"}
          onLimpiarFiltros={
            hayFiltrosActivos
              ? () => setFiltros({ tipo: "todos", keyword: "" })
              : undefined
          }
        />
      )}

      {!isLoading && !isError && data && data.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.map((p) => (
            <PublicacionCard key={p.id} publicacion={p} />
          ))}
        </div>
      )}

      <ChatWidget />
    </div>
  );
}
