import { Link, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { BarChart3, Building2, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useAuth } from "@/auth/AuthProvider";

export function Navbar() {
  const { session, perfil, cargando, salir } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const cerrarSesion = async () => {
    // Salir del área ANTES de cerrar la sesión. Al revés se termina en
    // `/ingresar` y no en el catálogo (AC-1.4): estando en una ruta protegida,
    // en cuanto la sesión pasa a null RutaProtegida redirige a la pantalla de
    // acceso, y lo hace antes de que este navigate llegue a ejecutarse.
    navigate("/", { replace: true });
    await salir();
    // Las consultas del área quedan en la caché de TanStack Query con los datos
    // del miembro que se acaba de ir. Sin esto, volver atrás en el navegador los
    // muestra otra vez aunque ya no haya sesión.
    queryClient.removeQueries({ queryKey: ["mis-publicaciones"] });
    queryClient.removeQueries({ queryKey: ["mi-publicacion"] });
    queryClient.removeQueries({ queryKey: ["interesados"] });
  };

  return (
    <header className="sticky top-0 z-40 h-14 md:h-16 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto max-w-7xl h-full px-4 flex items-center justify-between gap-3">
        {/* `whitespace-nowrap` + el escalón de tamaño en mobile: con el selector
            de tema sumando ~32 px a la barra, en 375 px la marca se partía en
            dos líneas y desbordaba el `h-14` del header. */}
        <Link
          to="/"
          className="text-base sm:text-lg md:text-xl font-semibold tracking-tight whitespace-nowrap hover:opacity-80 transition"
        >
          Minería <span className="text-muted-foreground">Conecta</span>
        </Link>

        <nav className="flex items-center gap-1 sm:gap-2">
          {/* Igual que el dashboard, el tema no depende de la sesión: va fuera
              del `!cargando`. */}
          <ThemeToggle />

          {/* El dashboard no depende de la sesión (ruta pública durante la
              demo), así que va fuera del `!cargando`: adentro parpadearía al
              recargar sin motivo. */}
          <Button asChild variant="ghost" size="sm">
            <Link to="/dashboard">
              <BarChart3 className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Dashboard</span>
            </Link>
          </Button>

          {/* Mientras la sesión se resuelve no se muestra ni "Ingresar" ni el
              área: alternar entre los dos produce un parpadeo en cada recarga
              (R-03). */}
          {!cargando &&
            (session ? (
              <>
                {perfil?.empresa && (
                  <span className="hidden sm:flex items-center gap-1.5 text-sm text-muted-foreground max-w-[16rem] truncate">
                    <Building2 className="h-4 w-4 shrink-0" />
                    <span className="truncate">{perfil.empresa}</span>
                  </span>
                )}
                <Button asChild variant="ghost" size="sm">
                  <Link to="/mi-area">Mi área</Link>
                </Button>
                <Button variant="outline" size="sm" onClick={cerrarSesion}>
                  <LogOut className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Cerrar sesión</span>
                </Button>
              </>
            ) : (
              <Button asChild variant="outline" size="sm">
                <Link to="/ingresar">Ingresar</Link>
              </Button>
            ))}
        </nav>
      </div>
    </header>
  );
}
