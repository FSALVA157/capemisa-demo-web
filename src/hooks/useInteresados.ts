import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

const COLUMNAS_INTERESADOS = [
  "id",
  "empresa_interesada",
  "persona_contacto",
  "telefono",
  "email",
  "motivo",
  "urgencia",
  "created_at",
].join(",");

export type Interesado = {
  id: string;
  empresa_interesada: string;
  persona_contacto: string;
  telefono: string;
  // Los tres opcionales: el formulario público no los exige. La interfaz debe
  // decir que el interesado no los dejó, no mostrar un hueco.
  email: string | null;
  motivo: string | null;
  urgencia: string | null;
  created_at: string;
};

// Consulta Q4. El filtro por autoría lo aplica la política
// `consultas_select_autor`, no el cliente: pedir las consultas de una
// publicación ajena devuelve vacío, no error.
//
// `estado_seguimiento` NO se selecciona a propósito: es seguimiento interno de
// CAPEMISA y está fuera del alcance de la feature.
export function useInteresados(publicacionId: string | undefined) {
  return useQuery<Interesado[]>({
    queryKey: ["interesados", publicacionId],
    enabled: Boolean(publicacionId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("consultas")
        .select(COLUMNAS_INTERESADOS)
        .eq("publicacion_id", publicacionId!)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data ?? []) as unknown as Interesado[];
    },
  });
}
