import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase, type PerfilRow } from "@/lib/supabase";

type AuthContextValue = {
  session: Session | null;
  perfil: PerfilRow | null;
  /** true mientras se resuelve la sesión inicial. Distinto de "no hay sesión". */
  cargando: boolean;
  /** Hay sesión pero la cuenta no tiene fila en `perfiles`. No debería pasar con
   *  las cuentas precargadas, pero la interfaz no tiene que romperse si pasa. */
  perfilFaltante: boolean;
  ingresar: (email: string, password: string) => Promise<void>;
  salir: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [perfil, setPerfil] = useState<PerfilRow | null>(null);
  const [cargando, setCargando] = useState(true);
  const [perfilFaltante, setPerfilFaltante] = useState(false);

  useEffect(() => {
    let vigente = true;

    // La sesión inicial se resuelve de forma asincrónica leyendo el
    // almacenamiento del navegador. Hasta que termine, `cargando` es true:
    // tratar "todavía no sé" como "no hay sesión" produce un destello de
    // redirección al recargar cualquier página del área (ver R-03).
    supabase.auth.getSession().then(({ data }) => {
      if (!vigente) return;
      setSession(data.session);
      setCargando(false);
    });

    // Cubre inicio, cierre, expiración del token y cierre de sesión hecho en
    // otra pestaña, sin lógica adicional.
    const { data: sub } = supabase.auth.onAuthStateChange((_evento, nueva) => {
      if (!vigente) return;
      setSession(nueva);
      setCargando(false);
    });

    return () => {
      vigente = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  // El perfil aporta la empresa que se muestra en la interfaz (FR-006) y los
  // datos de contacto que se copian a una publicación nueva (FR-018). Se trae
  // una sola vez por sesión en lugar de consultarlo en cada pantalla.
  useEffect(() => {
    const userId = session?.user?.id;

    if (!userId) {
      setPerfil(null);
      setPerfilFaltante(false);
      return;
    }

    let vigente = true;

    supabase
      .from("perfiles")
      .select("id, rol, empresa, responsable, telefono, email, created_at")
      .eq("id", userId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (!vigente) return;
        setPerfil(data ?? null);
        setPerfilFaltante(!error && !data);
      });

    return () => {
      vigente = false;
    };
  }, [session?.user?.id]);

  const ingresar = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };

  const salir = async () => {
    await supabase.auth.signOut();
    setPerfil(null);
    setPerfilFaltante(false);
  };

  return (
    <AuthContext.Provider
      value={{ session, perfil, cargando, perfilFaltante, ingresar, salir }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth debe usarse dentro de <AuthProvider>");
  }
  return ctx;
}
