-- =============================================================
-- CAPEMISA Conecta — Vista pública para la web (catálogo anónimo)
--
-- POR QUÉ EXISTE ESTA VISTA
-- `publicaciones_searchable` (03_search_view.sql) se diseñó para el bot de
-- n8n, que consulta con service_role y NECESITA el teléfono del oferente para
-- dárselo a los miembros. Tiene dos propiedades que la hacen inapta para la web:
--
--   1. Se creó sin `security_invoker`, así que corre con privilegios del owner
--      y SALTEA el RLS de `publicaciones` → expone filas no publicadas.
--   2. Su SELECT es `p.*` → expone telefono, email, responsable y
--      observaciones_internas.
--
-- Con la anon key (que va embebida en el bundle público de la web) eso
-- significaba que cualquiera podía leer PII y publicaciones sin aprobar.
-- Detectado el 2026-07-29 validando el Principio IV de la constitución.
--
-- NO "arreglar" 03_search_view.sql sacándole columnas: el nodo
-- `Shape resultados` de capemisa_tool_buscar lee `p.telefono` de ahí, y
-- `texto_whatsapp` se usa para el matching. Sacarlas rompe el bot EN SILENCIO,
-- sin error. Por eso esta vista es nueva y separada, y aquella queda intacta.
-- =============================================================

CREATE OR REPLACE VIEW public.publicaciones_publicas
WITH (security_invoker = true)   -- respeta el RLS de quien consulta:
                                 -- anon solo ve estado='publicada'
AS
SELECT
  p.id,
  p.empresa,
  p.tipo_publicacion,
  p.rubro,
  p.subrubro,
  p.descripcion,
  p.descripcion_comercial,
  p.zona,
  p.condicion_comercial,
  p.disponibilidad,
  p.vencimiento,
  p.imagen_url,
  p.urgencia,
  p.estado,          -- se conserva para que la web pueda filtrar explícitamente
                     -- (defensa en profundidad; el RLS ya lo garantiza)
  p.created_at,
  -- search_text se sigue calculando con texto_whatsapp, pero esa columna
  -- NO se devuelve: es texto interno de armado de mensajes.
  extensions.unaccent(lower(
    coalesce(p.rubro, '') || ' ' ||
    coalesce(p.subrubro, '') || ' ' ||
    coalesce(p.descripcion_comercial, '') || ' ' ||
    coalesce(p.texto_whatsapp, '') || ' ' ||
    coalesce(p.descripcion, '')
  )) AS search_text
FROM public.publicaciones p;

-- Deliberadamente EXCLUIDAS: autor_id, responsable, telefono, email,
-- texto_whatsapp, matches, observaciones_internas, updated_at.

GRANT SELECT ON public.publicaciones_publicas TO anon, authenticated, service_role;
