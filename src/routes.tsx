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
