import { useCallback, useEffect, useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useAuth } from "@/auth/AuthProvider";
import { enviarMensaje, type ResultadoChat } from "@/lib/chatApi";

export type MensajeChat = {
  id: string;
  autor: "visitante" | "asistente";
  texto: string;
  resultados?: ResultadoChat[];
  error?: boolean;
};

const CLAVE_SESION = "capemisa_chat_conversacion";

/** El identificador vive en `sessionStorage`, no en `localStorage`: la
 *  conversación dura lo que dura la pestaña, y dos pestañas quedan
 *  independientes sin lógica adicional. */
function obtenerConversacionId(): string {
  try {
    const guardado = sessionStorage.getItem(CLAVE_SESION);
    if (guardado) return guardado;
    const nuevo = crypto.randomUUID();
    sessionStorage.setItem(CLAVE_SESION, nuevo);
    return nuevo;
  } catch {
    // Navegación privada con almacenamiento bloqueado: la conversación
    // funciona igual, solo que no sobrevive a una recarga.
    return crypto.randomUUID();
  }
}

const SALUDO: MensajeChat = {
  id: "saludo",
  autor: "asistente",
  texto:
    "¡Hola! Contame qué estás buscando y reviso el catálogo. Podés escribirlo con tus palabras, no hace falta que uses el nombre técnico.",
};

export function useChat() {
  const { session, cargando } = useAuth();
  const [mensajes, setMensajes] = useState<MensajeChat[]>([SALUDO]);
  const conversacionId = useRef<string | null>(null);
  const ultimoEnviado = useRef<string | null>(null);
  const identidad = useRef<string | null | undefined>(undefined);

  if (conversacionId.current === null) {
    conversacionId.current = obtenerConversacionId();
  }

  // Al iniciar o cerrar sesión hay que empezar una conversación nueva.
  //
  // No es cosmético: la memoria del asistente vive del lado de n8n indexada por
  // `conversacion_id`, así que sin esto los datos de contacto que dio alguien
  // como anónimo siguen vivos después de que otra persona inicia sesión en la
  // misma pestaña, y el asistente se los propone a ella. Medido: tras registrar
  // una consulta como anónimo e iniciar sesión, ofrecía la empresa del anónimo
  // en vez de la del perfil.
  //
  // `cargando` es imprescindible: la sesión se resuelve de forma asincrónica y
  // arranca en null, así que sin esperar a que termine cada recarga se vería
  // como un cambio de identidad y reiniciaría la conversación sola.
  useEffect(() => {
    if (cargando) return;
    const actual = session?.user?.id ?? null;

    if (identidad.current === undefined) {
      identidad.current = actual;
      return;
    }
    if (identidad.current === actual) return;

    identidad.current = actual;
    const nuevo = crypto.randomUUID();
    conversacionId.current = nuevo;
    try {
      sessionStorage.setItem(CLAVE_SESION, nuevo);
    } catch {
      // Sin almacenamiento la conversación funciona igual, solo que no
      // sobrevive a una recarga.
    }
    ultimoEnviado.current = null;
    setMensajes([SALUDO]);
  }, [cargando, session?.user?.id]);

  const mutacion = useMutation({
    mutationFn: (texto: string) =>
      enviarMensaje({
        mensaje: texto,
        conversacionId: conversacionId.current as string,
        // El token se lee en el momento del envío, no al montar: así una sesión
        // que aparece o vence a mitad de conversación se refleja sola.
        token: session?.access_token ?? null,
      }),
  });

  const despachar = useCallback(
    async (texto: string) => {
      ultimoEnviado.current = texto;
      const respuesta = await mutacion.mutateAsync(texto);
      setMensajes((previos) => [
        ...previos,
        {
          id: crypto.randomUUID(),
          autor: "asistente",
          texto: respuesta.respuesta,
          resultados: respuesta.resultados,
          error: respuesta.error,
        },
      ]);
    },
    [mutacion],
  );

  const enviar = useCallback(
    async (texto: string) => {
      const limpio = texto.trim();
      if (!limpio || mutacion.isPending) return;

      setMensajes((previos) => [
        ...previos,
        { id: crypto.randomUUID(), autor: "visitante", texto: limpio },
      ]);
      await despachar(limpio);
    },
    [despachar, mutacion.isPending],
  );

  /** Reenvía el último mensaje del visitante sin volver a agregarlo a la lista. */
  const reintentar = useCallback(async () => {
    const texto = ultimoEnviado.current;
    if (!texto || mutacion.isPending) return;
    setMensajes((previos) => previos.filter((m) => !m.error));
    await despachar(texto);
  }, [despachar, mutacion.isPending]);

  return {
    mensajes,
    enviar,
    reintentar,
    enviando: mutacion.isPending,
    puedeReintentar: ultimoEnviado.current !== null,
  };
}
