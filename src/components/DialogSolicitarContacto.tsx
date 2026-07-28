import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { consultaSchema, type FormConsulta } from "@/lib/schemaConsulta";
import { useEnviarConsulta } from "@/hooks/useEnviarConsulta";

type Props = {
  publicacionId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const DEFAULT_VALUES: FormConsulta = {
  empresa_interesada: "",
  persona_contacto: "",
  telefono: "",
  email: "",
  motivo: "",
  urgencia: "",
};

export function DialogSolicitarContacto({ publicacionId, open, onOpenChange }: Props) {
  const form = useForm<FormConsulta>({
    resolver: zodResolver(consultaSchema),
    defaultValues: DEFAULT_VALUES,
  });

  const { mutateAsync, isPending } = useEnviarConsulta();

  const onSubmit = async (values: FormConsulta) => {
    try {
      await mutateAsync({ ...values, publicacion_id: publicacionId });
      toast.success(
        "Tu solicitud fue enviada. El equipo de CAPEMISA se pondrá en contacto.",
      );
      form.reset(DEFAULT_VALUES);
      onOpenChange(false);
    } catch {
      toast.error("No pudimos enviar tu solicitud. Intentá de nuevo en unos segundos.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Solicitar contacto</DialogTitle>
          <DialogDescription>
            Completá tus datos y el equipo de CAPEMISA te contactará para coordinar.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="empresa_interesada"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tu empresa *</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Nombre de tu empresa" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="persona_contacto"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tu nombre *</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Persona de contacto" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="telefono"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Teléfono *</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="+54 9 387 610 6265" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email (opcional)</FormLabel>
                  <FormControl>
                    <Input {...field} type="email" placeholder="tu@empresa.com" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="motivo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Motivo (opcional)</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder="Contá brevemente qué necesitás"
                      rows={3}
                    />
                  </FormControl>
                  <FormDescription>Máximo 500 caracteres.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="urgencia"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Urgencia (opcional)</FormLabel>
                  <Select
                    value={field.value || ""}
                    onValueChange={(v) => field.onChange(v === "sin" ? "" : v)}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Sin especificar" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="sin">Sin especificar</SelectItem>
                      <SelectItem value="baja">Baja</SelectItem>
                      <SelectItem value="media">Media</SelectItem>
                      <SelectItem value="alta">Alta</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => onOpenChange(false)}
                disabled={isPending}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Enviando…" : "Enviar solicitud"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
