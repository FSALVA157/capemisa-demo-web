import { useEffect, useRef, useState } from "react";
import { Search, X, SlidersHorizontal } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { TIPO_PUBLICACION_LABEL, TIPOS_PUBLICACION } from "@/lib/i18n";

export type FiltrosValue = {
  tipo: string;
  keyword: string;
};

type Props = {
  value: FiltrosValue;
  onChange: (next: FiltrosValue) => void;
};

function FiltrosControls({ value, onChange }: Props) {
  const [texto, setTexto] = useState(value.keyword);
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    setTexto(value.keyword);
  }, [value.keyword]);

  const onTextoChange = (nuevo: string) => {
    setTexto(nuevo);
    if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    timeoutRef.current = window.setTimeout(() => {
      onChange({ ...value, keyword: nuevo });
    }, 300);
  };

  return (
    <div className="flex flex-col sm:flex-row gap-2 w-full">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="search"
          value={texto}
          onChange={(e) => onTextoChange(e.target.value)}
          placeholder="Buscar por rubro, descripción, zona…"
          className="pl-9"
          aria-label="Buscar publicaciones"
        />
      </div>
      <Select
        value={value.tipo || "todos"}
        onValueChange={(v) => onChange({ ...value, tipo: v })}
      >
        <SelectTrigger className="sm:w-64" aria-label="Filtrar por tipo">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="todos">Todos los tipos</SelectItem>
          {TIPOS_PUBLICACION.map((t) => (
            <SelectItem key={t} value={t}>
              {TIPO_PUBLICACION_LABEL[t]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export function FiltrosGrilla({ value, onChange }: Props) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const hayFiltros = (value.tipo && value.tipo !== "todos") || value.keyword.trim() !== "";

  const limpiar = () => onChange({ tipo: "todos", keyword: "" });

  return (
    <div className="mb-6">
      <div className="hidden md:flex items-center gap-2">
        <FiltrosControls value={value} onChange={onChange} />
        {hayFiltros && (
          <Button variant="ghost" onClick={limpiar} className="whitespace-nowrap">
            <X className="h-4 w-4 mr-1" /> Limpiar
          </Button>
        )}
      </div>

      <div className="md:hidden flex items-center gap-2">
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" className="flex-1">
              <SlidersHorizontal className="h-4 w-4 mr-2" />
              Filtros
              {hayFiltros && (
                <span className="ml-2 rounded-full bg-primary text-primary-foreground w-2 h-2" />
              )}
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="pb-6">
            <SheetHeader>
              <SheetTitle>Filtros</SheetTitle>
            </SheetHeader>
            <div className="pt-4">
              <FiltrosControls value={value} onChange={onChange} />
            </div>
            {hayFiltros && (
              <Button
                variant="ghost"
                onClick={() => {
                  limpiar();
                  setSheetOpen(false);
                }}
                className="w-full mt-4"
              >
                <X className="h-4 w-4 mr-1" /> Limpiar filtros
              </Button>
            )}
          </SheetContent>
        </Sheet>
      </div>
    </div>
  );
}
