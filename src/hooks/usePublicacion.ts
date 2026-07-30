import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

const COLUMNAS_DETALLE = [
  "id",
  "empresa",
  "tipo_publicacion",
  "rubro",
  "subrubro",
  "descripcion",
  "descripcion_comercial",
  "zona",
  "condicion_comercial",
  "disponibilidad",
  "vencimiento",
  "imagen_url",
  "urgencia",
  "created_at",
].join(",");

export type PublicacionDetalle = {
  id: string;
  empresa: string;
  tipo_publicacion: string;
  rubro: string | null;
  subrubro: string | null;
  descripcion: string;
  descripcion_comercial: string | null;
  zona: string | null;
  condicion_comercial: string | null;
  disponibilidad: string | null;
  vencimiento: string | null;
  imagen_url: string | null;
  urgencia: string | null;
  created_at: string;
};

export function usePublicacion(id: string | undefined) {
  return useQuery<PublicacionDetalle | null>({
    queryKey: ["publicacion", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("publicaciones_publicas")
        .select(COLUMNAS_DETALLE)
        .eq("id", id!)
        .eq("estado", "publicada")
        .maybeSingle();

      if (error) throw error;
      return (data as unknown as PublicacionDetalle) ?? null;
    },
  });
}
