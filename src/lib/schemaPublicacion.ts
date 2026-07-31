import { z } from "zod";
import { TIPOS_PUBLICACION } from "@/lib/i18n";

// Campos de generación asistida (rubro, subrubro, descripción comercial, texto
// de WhatsApp, urgencia) NO están acá a propósito: los produce el flujo de
// CAPEMISA y los cura una persona (Principio II). Tampoco están empresa,
// responsable, teléfono ni email: salen del perfil (FR-018).
export const publicacionSchema = z.object({
  tipo_publicacion: z.enum(TIPOS_PUBLICACION, {
    message: "Elegí qué tipo de publicación es",
  }),
  descripcion: z
    .string()
    .trim()
    .min(10, "Contá de qué se trata (mínimo 10 caracteres)")
    .max(2000, "Máximo 2000 caracteres"),
  zona: z.string().trim().max(120, "Máximo 120 caracteres").optional().or(z.literal("")),
  condicion_comercial: z
    .string()
    .trim()
    .max(300, "Máximo 300 caracteres")
    .optional()
    .or(z.literal("")),
  disponibilidad: z
    .string()
    .trim()
    .max(120, "Máximo 120 caracteres")
    .optional()
    .or(z.literal("")),
  vencimiento: z.string().optional().or(z.literal("")),
  imagen_url: z
    .string()
    .trim()
    .url("Pegá una dirección web válida, que empiece con http")
    .optional()
    .or(z.literal("")),
});

export type FormPublicacion = z.infer<typeof publicacionSchema>;
