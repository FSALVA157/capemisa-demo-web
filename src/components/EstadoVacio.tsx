import { PackageOpen, SearchX, FileQuestion } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

type Variant = "sin-publicaciones" | "sin-resultados" | "no-encontrada";

type Props = {
  variant: Variant;
  onLimpiarFiltros?: () => void;
};

const CONTENIDO: Record<
  Variant,
  { titulo: string; descripcion: string; Icon: typeof PackageOpen }
> = {
  "sin-publicaciones": {
    titulo: "Todavía no hay publicaciones activas",
    descripcion:
      "Cuando las empresas socias publiquen ofertas o búsquedas, van a aparecer acá.",
    Icon: PackageOpen,
  },
  "sin-resultados": {
    titulo: "No hay publicaciones que coincidan con tu búsqueda",
    descripcion: "Probá con otras palabras o quitá algún filtro.",
    Icon: SearchX,
  },
  "no-encontrada": {
    titulo: "Publicación no disponible",
    descripcion:
      "Puede que ya no esté publicada o que la dirección no sea válida.",
    Icon: FileQuestion,
  },
};

export function EstadoVacio({ variant, onLimpiarFiltros }: Props) {
  const { titulo, descripcion, Icon } = CONTENIDO[variant];
  return (
    <Card className="mx-auto max-w-md">
      <CardContent className="flex flex-col items-center text-center py-10 gap-3">
        <div className="rounded-full bg-muted p-3">
          <Icon className="h-8 w-8 text-muted-foreground" />
        </div>
        <h2 className="text-lg font-semibold">{titulo}</h2>
        <p className="text-sm text-muted-foreground">{descripcion}</p>
        {variant === "sin-resultados" && onLimpiarFiltros && (
          <Button variant="outline" onClick={onLimpiarFiltros} className="mt-2">
            Limpiar filtros
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
