import { useMutation } from "@tanstack/react-query";
import { supabase, type NuevaConsulta } from "@/lib/supabase";
import type { FormConsulta } from "@/lib/schemaConsulta";

type Payload = FormConsulta & { publicacion_id: string };

export function useEnviarConsulta() {
  return useMutation({
    mutationFn: async (payload: Payload) => {
      const insert: NuevaConsulta = {
        publicacion_id: payload.publicacion_id,
        empresa_interesada: payload.empresa_interesada,
        persona_contacto: payload.persona_contacto,
        telefono: payload.telefono,
        email: payload.email && payload.email.length > 0 ? payload.email : null,
        motivo: payload.motivo && payload.motivo.length > 0 ? payload.motivo : null,
        urgencia:
          payload.urgencia && payload.urgencia.length > 0 ? payload.urgencia : null,
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await supabase.from("consultas").insert(insert as any);
      if (error) throw error;
    },
  });
}
