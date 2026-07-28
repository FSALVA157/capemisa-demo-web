import { z } from "zod";

const TEL_REGEX = /^[\d\s+\-()]{6,20}$/;

export const consultaSchema = z.object({
  empresa_interesada: z
    .string()
    .trim()
    .min(2, "Ingresá el nombre de tu empresa (mínimo 2 caracteres)")
    .max(200, "Máximo 200 caracteres"),
  persona_contacto: z
    .string()
    .trim()
    .min(2, "Ingresá tu nombre (mínimo 2 caracteres)")
    .max(100, "Máximo 100 caracteres"),
  telefono: z
    .string()
    .trim()
    .regex(TEL_REGEX, "Ingresá un teléfono válido (dígitos, +, -, espacios, paréntesis)"),
  email: z
    .string()
    .trim()
    .email("Email inválido")
    .optional()
    .or(z.literal("")),
  motivo: z.string().trim().max(500, "Máximo 500 caracteres").optional().or(z.literal("")),
  urgencia: z.enum(["baja", "media", "alta"]).optional().or(z.literal("")),
});

export type FormConsulta = z.infer<typeof consultaSchema>;
