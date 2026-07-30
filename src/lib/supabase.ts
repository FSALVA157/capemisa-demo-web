import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

const url = import.meta.env.VITE_SUPABASE_URL as string;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!url || !anonKey) {
  throw new Error(
    "Faltan VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY en el entorno. Revisá web/.env.local.",
  );
}

export const supabase = createClient<Database>(url, anonKey);

export type PublicacionRow = Database["public"]["Tables"]["publicaciones"]["Row"];
export type PublicacionPublicaRow =
  Database["public"]["Views"]["publicaciones_publicas"]["Row"];
export type NuevaConsulta = Database["public"]["Tables"]["consultas"]["Insert"];
