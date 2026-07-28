import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { EstadoVacio } from "@/components/EstadoVacio";

export default function NotFoundPage() {
  return (
    <div className="py-12 flex flex-col items-center gap-4">
      <EstadoVacio variant="no-encontrada" />
      <Button asChild variant="outline">
        <Link to="/">Volver al catálogo</Link>
      </Button>
    </div>
  );
}
