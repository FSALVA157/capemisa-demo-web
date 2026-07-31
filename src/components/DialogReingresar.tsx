import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { loginSchema, type FormLogin } from "@/lib/schemaLogin";
import { useAuth } from "@/auth/AuthProvider";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Se llama cuando la sesión volvió a estar activa. */
  onReingresado: () => void;
};

/**
 * Reautenticación sin salir de la pantalla.
 *
 * Existe para el caso de R-08: la sesión venció con un formulario a medio
 * llenar. Mandar al miembro a `/ingresar` resolvería la sesión y le haría
 * perder todo lo cargado, que es justamente lo que la spec quiere evitar.
 */
export function DialogReingresar({ open, onOpenChange, onReingresado }: Props) {
  const { ingresar, perfil } = useAuth();
  const [falla, setFalla] = useState<string | null>(null);

  const form = useForm<FormLogin>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  // El email se completa al ABRIR, no al montar: este diálogo se monta junto
  // con la pantalla, cuando el perfil todavía no llegó, así que tomarlo en
  // `defaultValues` lo dejaba vacío y obligaba a tipearlo de nuevo.
  const { reset } = form;
  useEffect(() => {
    if (open) {
      setFalla(null);
      reset({ email: perfil?.email ?? "", password: "" });
    }
  }, [open, perfil?.email, reset]);

  const onSubmit = async (valores: FormLogin) => {
    setFalla(null);
    try {
      await ingresar(valores.email, valores.password);
      form.reset({ email: valores.email, password: "" });
      onOpenChange(false);
      onReingresado();
    } catch (error) {
      const status = (error as { status?: number })?.status;
      setFalla(
        status
          ? "El email o la contraseña no son correctos."
          : "No pudimos conectarnos. Revisá tu conexión.",
      );
    }
  };

  const enviando = form.formState.isSubmitting;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Tu sesión venció</DialogTitle>
          <DialogDescription>
            Volvé a ingresar para guardar lo que cargaste. No se pierde nada: el formulario
            queda tal como lo dejaste.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input type="email" autoComplete="email" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Contraseña</FormLabel>
                  <FormControl>
                    <Input type="password" autoComplete="current-password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {falla && <p className="text-sm text-destructive">{falla}</p>}

            <DialogFooter>
              <Button type="submit" disabled={enviando}>
                {enviando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {enviando ? "Ingresando…" : "Ingresar y volver"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
