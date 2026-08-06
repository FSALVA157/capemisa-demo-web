import { createBrowserRouter } from "react-router-dom";
import App from "./App";
import CatalogoPage from "./pages/CatalogoPage";
import PublicacionDetallePage from "./pages/PublicacionDetallePage";
import IngresarPage from "./pages/IngresarPage";
import MiAreaPage from "./pages/MiAreaPage";
import MiPublicacionPage from "./pages/MiPublicacionPage";
import PublicacionFormPage from "./pages/PublicacionFormPage";
import NotFoundPage from "./pages/NotFoundPage";
import { RutaProtegida } from "./auth/RutaProtegida";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    children: [
      // Catálogo público: sin cambios respecto de la feature 001 (FR-024).
      { index: true, element: <CatalogoPage /> },
      { path: "publicacion/:id", element: <PublicacionDetallePage /> },

      // Pública, pero redirige a /mi-area si ya hay sesión.
      { path: "ingresar", element: <IngresarPage /> },

      // DEUDA CONOCIDA: el dashboard queda FUERA de RutaProtegida a propósito,
      // por decisión explícita tomada a un día de la demo. Muestra agregados de
      // toda la plataforma (incluidas publicaciones sin aprobar y el total de
      // consultas), que es información interna de CAPEMISA aunque no sea PII.
      // Antes de producción va adentro de RutaProtegida y además con chequeo de
      // rol 'admin' — hoy `RutaProtegida` solo mira que haya sesión.
      //
      // Se carga en diferido: recharts pesa ~700 kB sin comprimir y el catálogo
      // (la pantalla de entrada) no lo necesita. Con `element` directo el
      // bundle inicial pasaba de 555 kB a 1,25 MB.
      {
        path: "dashboard",
        lazy: async () => ({
          Component: (await import("./pages/DashboardPage")).default,
        }),
      },

      // Área de miembro. RutaProtegida es protección de interfaz; la barrera
      // real son las vistas y políticas de la base (FR-010).
      {
        element: <RutaProtegida />,
        children: [
          { path: "mi-area", element: <MiAreaPage /> },
          { path: "mi-area/nueva", element: <PublicacionFormPage /> },
          { path: "mi-area/publicacion/:id", element: <MiPublicacionPage /> },
          { path: "mi-area/publicacion/:id/editar", element: <PublicacionFormPage /> },
        ],
      },

      { path: "*", element: <NotFoundPage /> },
    ],
  },
]);
