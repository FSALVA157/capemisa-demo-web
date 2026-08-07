import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Check, Monitor, Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { TEMA_LABEL, TEMAS } from "@/lib/i18n";

const ICONO = { light: Sun, dark: Moon, system: Monitor } as const;

export function ThemeToggle() {
  const { theme, resolvedTheme, setTheme } = useTheme();

  // En el primer render `theme` todavía es undefined (next-themes lo resuelve
  // en su efecto), así que no se sabe qué ícono va ni qué opción marcar.
  // Hasta que monte se dibuja el sol y ninguna tilde: mostrar una opción
  // equivocada por un frame es peor que mostrar el default.
  const [montado, setMontado] = useState(false);
  useEffect(() => setMontado(true), []);

  // Para el ícono importa el tema efectivo (con "system" no alcanza `theme`);
  // para la tilde importa lo que el usuario eligió, que puede ser "system".
  const IconoActual = montado && resolvedTheme === "dark" ? Moon : Sun;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" aria-label="Cambiar tema">
          <IconoActual className="h-4 w-4" />
          <span className="sr-only">Cambiar tema</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {TEMAS.map((valor) => {
          const Icono = ICONO[valor];
          const activo = montado && theme === valor;
          return (
            <DropdownMenuItem
              key={valor}
              onSelect={() => setTheme(valor)}
              className="gap-2"
            >
              <Icono className="h-4 w-4" />
              <span className="flex-1">{TEMA_LABEL[valor]}</span>
              {activo && <Check className="h-4 w-4" />}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
