import { Navigate, Outlet, useLocation } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "./AuthProvider";

/**
 * Envuelve las rutas del área de miembro.
 *
 * Esto es protección de INTERFAZ, no de datos. La barrera real son las
 * políticas y vistas de la base (FR-010): la vista `mis_publicaciones` filtra
 * por autor y la política `consultas_select_autor` limita las solicitudes. Si
 * este componente fallara, no se filtraría nada — simplemente se vería una
 * pantalla vacía. No contarlo como control de seguridad.
 */
export function RutaProtegida() {
  const { session, cargando } = useAuth();
  const location = useLocation();

  // Mientras la sesión se resuelve NO se redirige. Tratar "todavía no sé" como
  // "no hay sesión" hace que recargar una página del área pase por la pantalla
  // de acceso aunque la sesión sea válida (R-03, AC-1.7).
  if (cargando) {
    return (
      <div className="space-y-4 py-4">
        <Skeleton className="h-8 w-1/3" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (!session) {
    // `state.desde` permite volver al destino original después de autenticarse.
    return <Navigate to="/ingresar" replace state={{ desde: location }} />;
  }

  return <Outlet />;
}
