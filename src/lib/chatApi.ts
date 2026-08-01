// Cliente del webhook de n8n que atiende el chat web (feature 003).
//
// A diferencia de `supabase.ts`, acá NO se lanza si falta la variable: sin
// Supabase la app no tiene nada que mostrar, sin chat tiene todo menos el chat.
// Las páginas consultan `chatDisponible` y directamente no montan el widget.
export const CHAT_URL = (import.meta.env.VITE_N8N_CHAT_URL as string | undefined) ?? "";

export const chatDisponible = CHAT_URL.length > 0;

/** Un turno con búsqueda encadena tres llamadas a modelos; 45 s es la red de
 *  contención, no la expectativa (que son 15 s). */
const TIMEOUT_MS = 45_000;

export const MAX_CARACTERES = 1000;

/** Espejo de lo que emite `Shape resultados` de `capemisa_tool_buscar`.
 *
 *  `telefono` NO está declarado a propósito. Ese sub-workflow lo agrega solo
 *  cuando el rol es distinto de `invitado`, y el workflow del chat web pasa
 *  `"invitado"` como literal fijo. Si alguna vez llegara igual, que el tipo no
 *  lo tenga evita que la interfaz lo muestre por accidente. */
export type ResultadoChat = {
  id: string;
  empresa: string;
  rubro: string | null;
  subrubro: string | null;
  zona: string | null;
  tipo_publicacion: string;
  descripcion_comercial: string | null;
  /** Llega en la respuesta pero no se muestra: es texto para pegar en un grupo
   *  de WhatsApp, no para una tarjeta web. */
  texto_whatsapp: string | null;
  urgencia: string | null;
  imagen_url: string | null;
};

export type RespuestaChat = {
  respuesta: string;
  resultados: ResultadoChat[];
  /** true cuando la respuesta la fabricó este módulo por un fallo de transporte
   *  (red, timeout, respuesta ilegible), no el asistente. Habilita reintentar.
   *  Un error de negocio del workflow —límite de uso, mensaje inválido— llega
   *  como respuesta normal con 200 y NO se marca acá: reintentarlo no ayuda. */
  error?: boolean;
};

const ERROR_GENERICO =
  "Perdón, no pude responderte en este momento. ¿Probamos de nuevo?";

/** Nunca lanza: cualquier fallo se traduce a un turno del asistente con texto
 *  en español, para que el componente tenga un solo camino de manejo. */
export async function enviarMensaje(params: {
  mensaje: string;
  conversacionId: string;
  token?: string | null;
}): Promise<RespuestaChat> {
  const controlador = new AbortController();
  const corte = setTimeout(() => controlador.abort(), TIMEOUT_MS);

  try {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (params.token) headers.Authorization = `Bearer ${params.token}`;

    const resp = await fetch(CHAT_URL, {
      method: "POST",
      headers,
      body: JSON.stringify({
        mensaje: params.mensaje,
        conversacion_id: params.conversacionId,
      }),
      signal: controlador.signal,
    });

    if (!resp.ok) return { respuesta: ERROR_GENERICO, resultados: [], error: true };

    const datos = (await resp.json()) as Partial<RespuestaChat>;
    const texto = typeof datos.respuesta === "string" ? datos.respuesta.trim() : "";
    if (!texto) return { respuesta: ERROR_GENERICO, resultados: [], error: true };

    return {
      respuesta: texto,
      resultados: Array.isArray(datos.resultados) ? datos.resultados : [],
    };
  } catch {
    return { respuesta: ERROR_GENERICO, resultados: [], error: true };
  } finally {
    clearTimeout(corte);
  }
}
