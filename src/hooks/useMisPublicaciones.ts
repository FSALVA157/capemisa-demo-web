import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

const COLUMNAS_MIS_PUBLICACIONES = [
  "id",
  "tipo_publicacion",
  "descripcion",
  "descripcion_comercial",
  "zona",
  "estado",
  "imagen_url",
  "cantidad_consultas",
  "created_at",
].join(",");

// Tipo declarado local, no inferido: los select() con lista de columnas rompen
// la inferencia de postgrest-js (mismo patrón que usePublicaciones, R-10 de la
// feature 001).
export type MiPublicacionListItem = {
  id: string;
  tipo_publicacion: string;
  descripcion: string;
  descripcion_comercial: string | null;
  zona: string | null;
  estado: string;
  imagen_url: string | null;
  cantidad_consultas: number;
  created_at: string;
};

// Consulta Q2. Devuelve las publicaciones propias en TODOS los estados (FR-008),
// rechazadas incluidas.
//
// Sin filtro por autor en el cliente a propósito: lo aplica el
// `WHERE autor_id = auth.uid()` de la vista `mis_publicaciones`. Agregarlo acá
// daría una falsa sensación de control — el filtro que importa es el de la vista.
//
// Sin sesión devuelve un arreglo vacío, no un error: la pantalla no debe leerlo
// como "no tenés publicaciones". RutaProtegida debería haberlo evitado antes.
export function useMisPublicaciones() {
  return useQuery<MiPublicacionListItem[]>({
    queryKey: ["mis-publicaciones"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mis_publicaciones")
        .select(COLUMNAS_MIS_PUBLICACIONES)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data ?? []) as unknown as MiPublicacionListItem[];
    },
  });
}
