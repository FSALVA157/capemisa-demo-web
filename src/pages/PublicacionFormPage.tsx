import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { AlertCircle, ArrowLeft, Loader2 } from "lucide-react";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { publicacionSchema, type FormPublicacion } from "@/lib/schemaPublicacion";
import { TIPOS_PUBLICACION, TIPO_PUBLICACION_LABEL } from "@/lib/i18n";
import { useCrearPublicacion } from "@/hooks/useCrearPublicacion";
import { ESTADO_NO_EDITABLE, useEditarPublicacion } from "@/hooks/useEditarPublicacion";
import { useMiPublicacion } from "@/hooks/useMiPublicacion";
import { EstadoVacio } from "@/components/EstadoVacio";
import { DialogReingresar } from "@/components/DialogReingresar";
import { esErrorDeSesion } from "@/lib/erroresSupabase";
import { useAuth } from "@/auth/AuthProvider";

const VALORES_INICIALES: FormPublicacion = {
  tipo_publicacion: "oferta_servicio",
  descripcion: "",
  zona: "",
  condicion_comercial: "",
  disponibilidad: "",
  vencimiento: "",
  imagen_url: "",
};

// Cuadro de estados de data-model.md.
const ESTADOS_EDITABLES = ["pendiente", "faltan_datos"];

const MOTIVO_NO_EDITABLE: Record<string, string> = {
  aprobada: "Ya fue aprobada y está por publicarse, así que no se puede seguir editando.",
  publicada: "Está publicada en el catálogo y no se puede editar desde acá.",
  rechazada: "Fue rechazada por el equipo de Minería Conecta, así que no se puede editar.",
};

export default function PublicacionFormPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const modoEdicion = Boolean(id);
  const { perfil, perfilFaltante } = useAuth();
  const crear = useCrearPublicacion();
  const editar = useEditarPublicacion(id);
  const publicacion = useMiPublicacion(id);
  const isPending = crear.isPending || editar.isPending;

  // Dentro de una ruta protegida hay sesión sí o sí, así que "sin perfil y sin
  // confirmación de que falta" solo puede ser que todavía está viajando.
  const perfilCargando = !perfil && !perfilFaltante;

  const enviandoRef = useRef(false);

  // R-08: si la sesión venció con el formulario cargado, se ofrece volver a
  // ingresar sin desmontar nada. Lo cargado no se descarta ni se redirige.
  const [sesionVencida, setSesionVencida] = useState(false);

  const form = useForm<FormPublicacion>({
    resolver: zodResolver(publicacionSchema),
    defaultValues: VALORES_INICIALES,
  });

  // Valores iniciales del modo edición. `reset` una sola vez, cuando llega la
  // fila: hacerlo en cada render pisaría lo que el miembro está escribiendo.
  const { reset } = form;
  const datos = publicacion.data;
  useEffect(() => {
    if (!modoEdicion || !datos) return;
    reset({
      tipo_publicacion: datos.tipo_publicacion as FormPublicacion["tipo_publicacion"],
      descripcion: datos.descripcion ?? "",
      zona: datos.zona ?? "",
      condicion_comercial: datos.condicion_comercial ?? "",
      disponibilidad: datos.disponibilidad ?? "",
      // El input de fecha necesita aaaa-mm-dd pelado.
      vencimiento: datos.vencimiento ? datos.vencimiento.slice(0, 10) : "",
      imagen_url: datos.imagen_url ?? "",
    });
  }, [modoEdicion, datos, reset]);

  const onSubmit = async (valores: FormPublicacion) => {
    // Guard imperativo, no derivado del render: `disabled={isPending}` no
    // alcanza. Dos clicks en el mismo tick ocurren antes de que React repinte el
    // botón, y crean dos publicaciones (AC-3.6, verificado: 3 clicks → 3 filas).
    if (enviandoRef.current) return;
    enviandoRef.current = true;

    if (modoEdicion) {
      try {
        await editar.mutateAsync(valores);
        toast.success("Guardamos los cambios");
        navigate(`/mi-area/publicacion/${id}`);
      } catch (error) {
        if (esErrorDeSesion(error)) {
          setSesionVencida(true);
        } else if (error instanceof Error && error.message === ESTADO_NO_EDITABLE) {
          // Cero filas afectadas: el estado cambió mientras el formulario estaba
          // abierto. NO se confirma un guardado que no ocurrió (AC-4.3).
          toast.error("No pudimos guardar los cambios", {
            description:
              "La publicación ya no está en un estado que permita editarla. Actualizá la pantalla para ver cómo quedó.",
          });
        } else {
          toast.error("No pudimos guardar los cambios", {
            description: "Puede ser un problema de conexión. Probá de nuevo.",
          });
        }
        enviandoRef.current = false;
      }
      return;
    }

    try {
      await crear.mutateAsync(valores);
      // El mensaje dice "enviada para revisión" y NUNCA "publicada": prometer
      // que ya está en el catálogo sería mentir sobre el human gate
      // (FR-017, FR-023a). No se promete plazo tampoco.
      toast.success("Enviamos tu publicación para revisión", {
        description:
          "El equipo de Minería Conecta la revisa antes de mostrarla en el catálogo. Vas a verla en tu área como pendiente de revisión.",
      });
      navigate("/mi-area");
    } catch (error) {
      if (esErrorDeSesion(error)) {
        setSesionVencida(true);
      } else {
        toast.error("No pudimos enviar la publicación", {
          description: "Puede ser un problema de conexión. Probá de nuevo.",
        });
      }
      // Solo se libera si falló: tras el éxito la pantalla se va al listado y
      // reabrir el guard permitiría un envío duplicado en el camino.
      enviandoRef.current = false;
    }
  };

  if (modoEdicion) {
    if (publicacion.isLoading) {
      return (
        <div className="mx-auto max-w-2xl space-y-4 py-4">
          <Skeleton className="h-8 w-1/3" />
          <Skeleton className="h-64 w-full" />
        </div>
      );
    }

    // Ajena e inexistente son indistinguibles, igual que en el detalle.
    if (publicacion.isError || !publicacion.data) {
      return (
        <div className="py-8 flex flex-col items-center gap-4">
          <EstadoVacio variant="no-encontrada" />
          <Button asChild variant="outline">
            <Link to="/mi-area">
              <ArrowLeft className="h-4 w-4 mr-1" /> Volver a mis publicaciones
            </Link>
          </Button>
        </div>
      );
    }

    // A esta pantalla no se llega por interfaz cuando el estado no lo permite,
    // pero sí por dirección directa. Se explica en vez de mostrar un formulario
    // que no va a poder guardar.
    if (!ESTADOS_EDITABLES.includes(publicacion.data.estado)) {
      return (
        <div className="mx-auto max-w-2xl py-4">
          <div className="mb-4">
            <Button asChild variant="ghost" size="sm">
              <Link to={`/mi-area/publicacion/${id}`}>
                <ArrowLeft className="h-4 w-4 mr-1" /> Volver a la publicación
              </Link>
            </Button>
          </div>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Esta publicación ya no se puede editar</AlertTitle>
            <AlertDescription>
              {MOTIVO_NO_EDITABLE[publicacion.data.estado] ??
                "Su estado actual no permite editarla."}{" "}
              Si necesitás cambiar algo, escribinos.
            </AlertDescription>
          </Alert>
        </div>
      );
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-4">
        <Button asChild variant="ghost" size="sm">
          <Link to={modoEdicion ? `/mi-area/publicacion/${id}` : "/mi-area"}>
            <ArrowLeft className="h-4 w-4 mr-1" />{" "}
            {modoEdicion ? "Volver a la publicación" : "Volver a mis publicaciones"}
          </Link>
        </Button>
      </div>

      <h1 className="text-2xl md:text-3xl font-semibold tracking-tight mb-1">
        {modoEdicion ? "Editar publicación" : "Nueva publicación"}
      </h1>
      <p className="text-muted-foreground mb-6">
        {modoEdicion
          ? "Corregí lo que haga falta mientras el equipo de Minería Conecta todavía no la revisó."
          : "Contanos qué ofrecés o qué estás buscando. El equipo de Minería Conecta la revisa antes de mostrarla en el catálogo."}
      </p>

      {/* Aviso persistente además del diálogo: si el miembro lo cierra sin
          reingresar, tiene que quedarle claro por qué no se guardó y cómo
          seguir. Lo cargado sigue intacto en el formulario. */}
      {sesionVencida && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Tu sesión venció y no pudimos guardar</AlertTitle>
          <AlertDescription className="flex flex-col items-start gap-3">
            <span>
              Lo que cargaste sigue acá. Volvé a ingresar y probá de nuevo; no vas a perder
              nada.
            </span>
            <Button variant="outline" size="sm" onClick={() => setSesionVencida(true)}>
              Volver a ingresar
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <DialogReingresar
        open={sesionVencida}
        onOpenChange={setSesionVencida}
        onReingresado={() => {
          toast.success("Volviste a ingresar", {
            description: "Probá guardar de nuevo: tu publicación sigue cargada.",
          });
        }}
      />

      {perfilFaltante && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Tu cuenta todavía no tiene una empresa asociada</AlertTitle>
          <AlertDescription>
            Escribinos para que la vinculemos antes de publicar.
          </AlertDescription>
        </Alert>
      )}

      {/* Los datos de contacto se muestran fijos, no editables: salen del perfil
          (FR-018) y el miembro tiene que ver con qué se va a publicar. */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base">Se publica con estos datos de contacto</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          {perfil ? (
            <ul className="space-y-1">
              <li>{perfil.empresa}</li>
              <li>{perfil.responsable}</li>
              <li>
                {perfil.telefono} · {perfil.email}
              </li>
            </ul>
          ) : perfilCargando ? (
            // Sin este caso el miembro lee "no pudimos cargar tus datos" durante
            // el medio segundo que tarda el perfil, y en una conexión lenta se
            // va creyendo que la pantalla está rota.
            <div className="space-y-2">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-56" />
            </div>
          ) : (
            <p>No pudimos cargar tus datos de contacto.</p>
          )}
        </CardContent>
      </Card>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
          <FormField
            control={form.control}
            name="tipo_publicacion"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tipo de publicación</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Elegí una opción" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {TIPOS_PUBLICACION.map((t) => (
                      <SelectItem key={t} value={t}>
                        {TIPO_PUBLICACION_LABEL[t]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="descripcion"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Descripción</FormLabel>
                <FormControl>
                  <Textarea
                    rows={5}
                    placeholder="Qué ofrecés o qué necesitás, con los datos que le sirvan a quien lo lea."
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="zona"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Zona (opcional)</FormLabel>
                <FormControl>
                  <Input placeholder="Salta capital, Puna salteña, Gran Salta…" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="condicion_comercial"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Condición comercial (opcional)</FormLabel>
                <FormControl>
                  <Input placeholder="Precio, forma de pago, tarifa por día…" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="disponibilidad"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Disponibilidad (opcional)</FormLabel>
                <FormControl>
                  <Input placeholder="Inmediata, a 15 días, desde el 1 de agosto…" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="vencimiento"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Vence el (opcional)</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormDescription>
                  Hasta cuándo tiene sentido mostrar esta publicación.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="imagen_url"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Imagen (opcional)</FormLabel>
                <FormControl>
                  <Input placeholder="https://…" {...field} />
                </FormControl>
                <FormDescription>
                  Pegá la dirección de una imagen que ya esté publicada en internet.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="flex gap-2 pt-2">
            {/* Deshabilitado mientras envía: dos envíos rápidos crearían dos
                publicaciones (AC-3.6). */}
            {/* También bloqueado hasta tener el perfil: los datos de contacto de
                la publicación salen de ahí, y sin él el envío falla. */}
            <Button type="submit" disabled={isPending || perfilCargando || perfilFaltante}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isPending
                ? modoEdicion
                  ? "Guardando…"
                  : "Enviando…"
                : modoEdicion
                  ? "Guardar cambios"
                  : "Enviar para revisión"}
            </Button>
            <Button asChild type="button" variant="ghost">
              <Link to={modoEdicion ? `/mi-area/publicacion/${id}` : "/mi-area"}>Cancelar</Link>
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
