import { createBrowserRouter } from "react-router-dom";
import App from "./App";
import CatalogoPage from "./pages/CatalogoPage";
import PublicacionDetallePage from "./pages/PublicacionDetallePage";
import NotFoundPage from "./pages/NotFoundPage";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    children: [
      { index: true, element: <CatalogoPage /> },
      { path: "publicacion/:id", element: <PublicacionDetallePage /> },
      { path: "*", element: <NotFoundPage /> },
    ],
  },
]);
