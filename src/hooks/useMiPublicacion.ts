import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export type MiPublicacionDetalle = {
  id: string;
  tipo_publicacion: string;
  descripcion: string;
  descripcion_comercial: string | null;
  rubro: string | null;
  subrubro: string | null;
  zona: string | null;
  condicion_comercial: string | null;
  disponibilidad: string | null;
  vencimiento: string | null;
  imagen_url: string | null;
  urgencia: string | null;
  estado: string;
  empresa: string;
  responsable: string;
  telefono: string;
  email: string;
  created_at: string;
  updated_at: string | null;
  cantidad_consultas: number;
};

// Consulta Q3. `maybeSingle()` devuelve null sin error cuando no hay fila.
//
// Un resultado nulo cubre por igual "no existe" y "es de otro miembro", y eso es
// deliberado: la pantalla muestra lo mismo en ambos casos, así nadie puede usar
// esta ruta para averiguar qué identificadores existen (AC-2.4).
export function useMiPublicacion(id: string | undefined) {
  return useQuery<MiPublicacionDetalle | null>({
    queryKey: ["mi-publicacion", id],
    enabled: Boolean(id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mis_publicaciones")
        .select("*")
        .eq("id", id!)
        .maybeSingle();

      if (error) throw error;
      return (data ?? null) as unknown as MiPublicacionDetalle | null;
    },
  });
}
