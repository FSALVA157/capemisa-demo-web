import { z } from "zod";

// Validación de forma nada más: que las credenciales sean correctas lo decide
// Supabase. El mensaje de credenciales inválidas es genérico y no distingue
// email inexistente de contraseña incorrecta (FR-005) — eso vive en la pantalla,
// no acá.
export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Ingresá tu email")
    .email("Ingresá un email válido"),
  password: z.string().min(1, "Ingresá tu contraseña"),
});

export type FormLogin = z.infer<typeof loginSchema>;
