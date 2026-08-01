import { useEffect, useRef, useState } from "react";
import { MessageCircle, X, Send, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ChatResultado } from "@/components/ChatResultado";
import { useChat } from "@/hooks/useChat";
import { chatDisponible, MAX_CARACTERES } from "@/lib/chatApi";
import { cn } from "@/lib/utils";

export function ChatWidget() {
  const [abierto, setAbierto] = useState(false);
  const [borrador, setBorrador] = useState("");
  const { mensajes, enviar, reintentar, enviando } = useChat();

  const finRef = useRef<HTMLDivElement>(null);
  const campoRef = useRef<HTMLTextAreaElement>(null);
  const burbujaRef = useRef<HTMLButtonElement>(null);

  // El panel se oculta, no se desmonta: cerrar y reabrir conserva la
  // conversación (FR-029).
  useEffect(() => {
    if (abierto) campoRef.current?.focus();
    else burbujaRef.current?.focus();
  }, [abierto]);

  useEffect(() => {
    if (abierto) finRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [mensajes, enviando, abierto]);

  useEffect(() => {
    if (!abierto) return;
    const alTeclear = (e: KeyboardEvent) => {
      if (e.key === "Escape") setAbierto(false);
    };
    window.addEventListener("keydown", alTeclear);
    return () => window.removeEventListener("keydown", alTeclear);
  }, [abierto]);

  if (!chatDisponible) return null;

  const excedido = borrador.length > MAX_CARACTERES;
  const puedeEnviar = borrador.trim().length > 0 && !excedido && !enviando;

  const despachar = () => {
    if (!puedeEnviar) return;
    const texto = borrador;
    // Limpiar de forma optimista: además de dar sensación de inmediatez, hace
    // que un segundo envío en el mismo tick salga vacío y quede bloqueado.
    setBorrador("");
    void enviar(texto);
  };

  return (
    <>
      <Button
        ref={burbujaRef}
        onClick={() => setAbierto((v) => !v)}
        aria-label={abierto ? "Cerrar el asistente" : "Abrir el asistente de búsqueda"}
        aria-expanded={abierto}
        size="icon"
        className="fixed bottom-4 right-4 z-40 h-14 w-14 rounded-full shadow-lg"
      >
        {abierto ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
      </Button>

      <div
        role="dialog"
        aria-label="Asistente de búsqueda de CAPEMISA Conecta"
        aria-hidden={!abierto}
        className={cn(
          "fixed z-40 flex flex-col rounded-xl border bg-card shadow-xl transition",
          "inset-x-2 bottom-20 top-16 sm:inset-x-auto sm:top-auto sm:right-4 sm:w-[400px] sm:h-[560px]",
          abierto ? "opacity-100" : "pointer-events-none opacity-0 translate-y-2",
        )}
      >
        <header className="px-4 py-3 border-b">
          <p className="font-semibold leading-tight">Asistente del catálogo</p>
          <p className="text-xs text-muted-foreground">
            Buscá con tus palabras. No muestra datos de contacto de las empresas.
          </p>
        </header>

        <div
          className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-3"
          aria-live="polite"
        >
          {mensajes.map((m) => (
            <div key={m.id} className="flex flex-col gap-2">
              <div
                className={cn(
                  "max-w-[85%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap break-words",
                  m.autor === "visitante"
                    ? "self-end bg-primary text-primary-foreground"
                    : "self-start bg-muted text-foreground",
                )}
              >
                {m.texto}
              </div>

              {m.error && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => void reintentar()}
                  disabled={enviando}
                  className="self-start"
                >
                  <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
                  Reintentar
                </Button>
              )}

              {m.resultados && m.resultados.length > 0 && (
                <div className="flex flex-col gap-2">
                  {m.resultados.map((r) => (
                    <ChatResultado key={r.id} resultado={r} />
                  ))}
                </div>
              )}
            </div>
          ))}

          {enviando && (
            <p className="self-start text-sm text-muted-foreground italic">
              Escribiendo…
            </p>
          )}

          <div ref={finRef} />
        </div>

        <div className="border-t p-3">
          <label htmlFor="chat-mensaje" className="sr-only">
            Escribí tu consulta
          </label>
          <div className="flex items-end gap-2">
            <textarea
              id="chat-mensaje"
              ref={campoRef}
              rows={2}
              value={borrador}
              onChange={(e) => setBorrador(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  despachar();
                }
              }}
              placeholder="Ej: necesito camionetas con chofer para la Puna"
              className="flex-1 resize-none rounded-md border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            <Button
              size="icon"
              onClick={despachar}
              disabled={!puedeEnviar}
              aria-label="Enviar mensaje"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
          {excedido && (
            <p className="mt-1.5 text-xs text-destructive">
              El mensaje es muy largo. Contame más corto.
            </p>
          )}
        </div>
      </div>
    </>
  );
}
