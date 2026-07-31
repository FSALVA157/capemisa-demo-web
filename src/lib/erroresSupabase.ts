// Señales de "tu sesión ya no sirve" al intentar escribir.
//
// Con RLS el acceso denegado casi nunca llega como error, llega como vacío
// (contrato de errores). Las escrituras son la excepción: sin sesión válida
// PostgREST rechaza con 401 (token vencido o ausente) o con 42501 (la política
// WITH CHECK no se cumple porque `auth.uid()` es nulo).
const CODIGOS_DE_SESION = ["PGRST301", "PGRST303", "42501"];

export const SIN_SESION = "SIN_SESION";

export function esErrorDeSesion(error: unknown): boolean {
  if (error instanceof Error && error.message === SIN_SESION) return true;

  const e = error as { status?: number; code?: string; message?: string } | null;
  if (!e) return false;

  if (e.status === 401) return true;
  if (e.code && CODIGOS_DE_SESION.includes(e.code)) return true;
  return Boolean(e.message && /jwt|token/i.test(e.message));
}
