import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { normalizarBusqueda } from "@/lib/i18n";

export type FiltrosGrilla = {
  tipo: string;
  keyword: string;
};

const COLUMNAS_PUBLICAS = [
  "id",
  "empresa",
  "tipo_publicacion",
  "rubro",
  "subrubro",
  "descripcion",
  "descripcion_comercial",
  "zona",
  "urgencia",
  "imagen_url",
  "created_at",
].join(",");

export type PublicacionListItem = {
  id: string;
  empresa: string;
  tipo_publicacion: string;
  rubro: string | null;
  subrubro: string | null;
  descripcion: string;
  descripcion_comercial: string | null;
  zona: string | null;
  urgencia: string | null;
  imagen_url: string | null;
  created_at: string;
};

export function usePublicaciones(filtros: FiltrosGrilla) {
  return useQuery<PublicacionListItem[]>({
    queryKey: ["publicaciones", filtros],
    queryFn: async () => {
      let q = supabase
        .from("publicaciones_publicas")
        .select(COLUMNAS_PUBLICAS)
        .eq("estado", "publicada")
        .order("created_at", { ascending: false });

      if (filtros.tipo && filtros.tipo !== "todos") {
        q = q.eq("tipo_publicacion", filtros.tipo);
      }
      if (filtros.keyword.trim()) {
        const kwNorm = normalizarBusqueda(filtros.keyword);
        q = q.ilike("search_text", `%${kwNorm}%`);
      }

      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as unknown as PublicacionListItem[];
    },
  });
}
