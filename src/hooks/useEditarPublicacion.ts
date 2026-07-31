import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { FormPublicacion } from "@/lib/schemaPublicacion";

// Se distingue del fallo de red y del de sesión para que la pantalla pueda
// explicar cada uno con sus palabras.
export const ESTADO_NO_EDITABLE = "ESTADO_NO_EDITABLE";

function vacioANull(v: string | undefined) {
  const s = v?.trim();
  return s ? s : null;
}

// Operación M2. `estado` y `autor_id` NO están entre los campos editables.
export function useEditarPublicacion(id: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (valores: FormPublicacion) => {
      if (!id) throw new Error("SIN_ID");

      // `count: 'exact'` con la escritura mínima: devuelve cuántas filas tocó
      // sin pedir que vuelvan los datos (R-06). Es lo que permite detectar el
      // caso de abajo sin necesitar privilegio de lectura sobre la tabla base.
      // Los cambios, sin `estado` ni `autor_id`. El cast repite el patrón del
      // resto de las escrituras: postgrest-js no infiere bien contra este
      // tipado mantenido a mano (R-10 de la feature 001).
      const cambios = {
        tipo_publicacion: valores.tipo_publicacion,
        descripcion: valores.descripcion.trim(),
        zona: vacioANull(valores.zona),
        condicion_comercial: vacioANull(valores.condicion_comercial),
        disponibilidad: vacioANull(valores.disponibilidad),
        vencimiento: vacioANull(valores.vencimiento),
        imagen_url: vacioANull(valores.imagen_url),
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const tabla = supabase.from("publicaciones") as any;
      const { error, count } = (await tabla
        .update(cambios, { count: "exact" })
        .eq("id", id)) as { error: unknown; count: number | null };

      if (error) throw error;

      // LA TRAMPA DE ESTA OPERACIÓN: si la política ya no permite editar (la
      // publicación pasó a `aprobada`, `publicada` o `rechazada`), el RLS **no
      // devuelve error**. Devuelve éxito con cero filas afectadas. Sin este
      // chequeo la pantalla confirma un guardado que nunca ocurrió.
      if (count === 0) {
        throw new Error(ESTADO_NO_EDITABLE);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mis-publicaciones"] });
      queryClient.invalidateQueries({ queryKey: ["mi-publicacion", id] });
    },
  });
}
