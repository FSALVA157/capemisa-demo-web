import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

// Forma del jsonb que devuelve `metricas_dashboard()` (db/07_metricas_dashboard.sql).
// Se declara acá y no en types/database.ts porque el RPC está tipado como `Json`:
// tipar el interior del jsonb en el archivo de Supabase sería inventarle una
// garantía que postgrest no da.
export type MetricasTotales = {
  publicaciones: number;
  publicadas: number;
  empresas: number;
  enriquecidas_ia: number;
  consultas: number;
  consultas_por_publicada: number;
};

export type Metricas = {
  generado_en: string;
  totales: MetricasTotales;
  por_estado: { estado: string; n: number }[];
  por_tipo: { tipo: string; n: number }[];
  por_urgencia: { urgencia: string; n: number }[];
  linea_tiempo: { dia: string; n: number; acum: number }[];
  top_consultadas: { empresa: string; tipo: string; n: number }[];
};

// Los `jsonb_agg` devuelven NULL cuando el subconjunto viene vacío (base recién
// creada, o ninguna publicación publicada). Sin esto la página rompe al mapear.
function normalizar(m: Metricas): Metricas {
  return {
    ...m,
    por_estado: m.por_estado ?? [],
    por_tipo: m.por_tipo ?? [],
    por_urgencia: m.por_urgencia ?? [],
    linea_tiempo: m.linea_tiempo ?? [],
    top_consultadas: m.top_consultadas ?? [],
  };
}

// Consulta Q7. Una sola llamada para todo el dashboard: los agregados salen de
// la misma foto de la base, así ninguna tarjeta contradice a otra.
export function useMetricas() {
  return useQuery<Metricas>({
    queryKey: ["metricas"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("metricas_dashboard");
      if (error) throw error;
      return normalizar(data as unknown as Metricas);
    },
  });
}
