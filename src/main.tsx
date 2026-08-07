import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/sonner";
import { queryClient } from "@/lib/queryClient";
import { AuthProvider } from "@/auth/AuthProvider";
import { router } from "./routes";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    {/* El ThemeProvider va arriba de todo: `ui/sonner.tsx` llama a `useTheme()`
        y sin un provider por encima el toast se queda siempre en claro.
        `storageKey` tiene que coincidir con la del script de `index.html` que
        aplica la clase antes del primer paint. */}
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
      storageKey="capemisa-tema"
    >
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <RouterProvider router={router} />
          <Toaster richColors position="top-right" />
        </AuthProvider>
      </QueryClientProvider>
    </ThemeProvider>
  </StrictMode>,
);
