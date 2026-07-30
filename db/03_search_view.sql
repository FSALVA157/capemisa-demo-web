-- =============================================================
-- CAPEMISA Conecta — Búsqueda por keywords con unaccent
-- Corrida limpia: dropea residuos previos, recrea vista, sin índice.
-- =============================================================

-- 0) Limpiar residuos de corridas anteriores
DROP INDEX IF EXISTS public.publicaciones_search_trgm_idx;
DROP VIEW  IF EXISTS public.publicaciones_searchable;

-- 1) Extensión unaccent (Supabase la instala en el schema `extensions`)
CREATE EXTENSION IF NOT EXISTS unaccent WITH SCHEMA extensions;

-- 2) Vista con columna searchable pre-normalizada.
--    Usamos el nombre calificado `extensions.unaccent(...)` para
--    evitar sorpresas de search_path.
CREATE VIEW public.publicaciones_searchable AS
SELECT
  p.*,
  extensions.unaccent(lower(
    coalesce(p.rubro, '') || ' ' ||
    coalesce(p.subrubro, '') || ' ' ||
    coalesce(p.descripcion_comercial, '') || ' ' ||
    coalesce(p.texto_whatsapp, '') || ' ' ||
    coalesce(p.descripcion, '')
  )) AS search_text
FROM public.publicaciones p;

-- 3) Permisos
GRANT SELECT ON public.publicaciones_searchable TO anon, authenticated, service_role;
