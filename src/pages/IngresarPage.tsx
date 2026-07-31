import { useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, Loader2 } from "lucide-react";
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { loginSchema, type FormLogin } from "@/lib/schemaLogin";
import { useAuth } from "@/auth/AuthProvider";

// Dos fallas distintas, dos mensajes distintos (contrato de `/ingresar`).
type FallaIngreso = "credenciales" | "red";

// El mensaje de credenciales es deliberadamente genérico: no distingue email
// inexistente de contraseña incorrecta (FR-005). Cambiarlo por algo más "útil"
// convierte la pantalla en un verificador de qué direcciones tienen cuenta.
const MENSAJE: Record<FallaIngreso, { titulo: string; detalle: string }> = {
  credenciales: {
    titulo: "No pudimos ingresar",
    detalle: "El email o la contraseña no son correctos. Revisalos e intentá de nuevo.",
  },
  red: {
    titulo: "No pudimos conectarnos",
    detalle: "Revisá tu conexión e intentá de nuevo.",
  },
};

export default function IngresarPage() {
  const { session, cargando, ingresar } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [falla, setFalla] = useState<FallaIngreso | null>(null);

  // Destino guardado por RutaProtegida al desviar a esta pantalla.
  const desde = (location.state as { desde?: { pathname: string } } | null)?.desde;
  const destino = desde?.pathname ?? "/mi-area";

  const form = useForm<FormLogin>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  // Mientras la sesión se resuelve no se decide nada: sin esto, entrar por
  // dirección directa con sesión activa muestra el formulario un instante
  // antes de redirigir (R-03).
  if (cargando) {
    return (
      <div className="mx-auto max-w-md space-y-4 py-8">
        <Skeleton className="h-8 w-1/2" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  // Ya hay sesión: no se muestra el formulario.
  if (session) {
    return <Navigate to={destino} replace />;
  }

  const onSubmit = async (values: FormLogin) => {
    setFalla(null);
    try {
      await ingresar(values.email, values.password);
      navigate(destino, { replace: true });
    } catch (error) {
      // Supabase responde 400 cuando las credenciales no sirven. Sin status
      // (fetch cortado, sin conexión) el problema es de red, no del usuario.
      const status = (error as { status?: number })?.status;
      setFalla(status ? "credenciales" : "red");
      // Se conserva el email cargado; la contraseña se limpia.
      form.resetField("password");
    }
  };

  const enviando = form.formState.isSubmitting;

  return (
    <div className="mx-auto max-w-md py-8">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Ingresar</CardTitle>
          <CardDescription>
            Accedé al área de miembro para ver tus publicaciones y quién se interesó en ellas.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {falla && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>{MENSAJE[falla].titulo}</AlertTitle>
              <AlertDescription>{MENSAJE[falla].detalle}</AlertDescription>
            </Alert>
          )}

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        autoComplete="email"
                        placeholder="tuempresa@ejemplo.com"
                        {...field}
                      />
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

              {/* Deshabilitado mientras envía: evita el doble envío. */}
              <Button type="submit" className="w-full" disabled={enviando}>
                {enviando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {enviando ? "Ingresando…" : falla === "red" ? "Reintentar" : "Ingresar"}
              </Button>
            </form>
          </Form>

          {/* Sin registro ni recuperación de contraseña a propósito (FR-002):
              la demo no tiene ninguna de las dos cosas y no debe prometerlas. */}
          <p className="mt-6 text-center text-sm text-muted-foreground">
            <Link to="/" className="underline hover:text-foreground">
              Volver al catálogo
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
