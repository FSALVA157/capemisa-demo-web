import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase, type NuevaPublicacion } from "@/lib/supabase";
import { useAuth } from "@/auth/AuthProvider";
import { SIN_SESION } from "@/lib/erroresSupabase";
import type { FormPublicacion } from "@/lib/schemaPublicacion";

// Los campos opcionales vacíos van como null, no como cadena vacía: en la base
// "no lo cargó" es null.
function vacioANull(v: string | undefined) {
  const s = v?.trim();
  return s ? s : null;
}

// Operación M1.
export function useCrearPublicacion() {
  const { session, perfil } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (valores: FormPublicacion) => {
      if (!session?.user?.id || !perfil) {
        throw new Error(SIN_SESION);
      }

      const nueva: NuevaPublicacion = {
        autor_id: session.user.id,
        // Datos de contacto tomados del perfil, no del formulario (FR-018).
        empresa: perfil.empresa,
        responsable: perfil.responsable,
        telefono: perfil.telefono,
        email: perfil.email,
        tipo_publicacion: valores.tipo_publicacion,
        descripcion: valores.descripcion.trim(),
        zona: vacioANull(valores.zona),
        condicion_comercial: vacioANull(valores.condicion_comercial),
        disponibilidad: vacioANull(valores.disponibilidad),
        vencimiento: vacioANull(valores.vencimiento),
        imagen_url: vacioANull(valores.imagen_url),
        // `estado` se omite a propósito: lo pone la base en 'pendiente'. Así el
        // human gate (FR-016) lo garantiza el esquema y no una línea de cliente
        // que alguien puede cambiar sin darse cuenta.
      };

      // No se pide que la escritura devuelva la fila insertada (R-06): hoy
      // funcionaría, pero dejaría de hacerlo el día que se cierre R-01, y sería
      // un fallo difícil de rastrear meses después.
      //
      // El cast repite el patrón de useEnviarConsulta: postgrest-js no infiere
      // bien contra este tipado mantenido a mano (R-10 de la feature 001).
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await supabase.from("publicaciones").insert(nueva as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mis-publicaciones"] });
    },
  });
}
