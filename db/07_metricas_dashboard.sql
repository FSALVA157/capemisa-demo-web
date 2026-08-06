-- =============================================================
-- CAPEMISA Conecta — Métricas del dashboard (feature 004)
--
-- POR QUÉ ES SECURITY DEFINER
-- La web consulta con la anon key y respeta el RLS de `publicaciones` y
-- `consultas`. Con esos privilegios el navegador ve:
--   · solo las publicaciones en estado='publicada'  (publicaciones_select_publica)
--   · CERO consultas                                (consultas_select_admin / _autor)
-- Un dashboard armado con eso mostraría 20 de 26 publicaciones y 0 consultas:
-- números mutilados presentados como si fueran el total. Inaceptable.
--
-- QUÉ GARANTIZA QUE NO FILTRA
-- La función NO devuelve filas: devuelve conteos. No hay una sola columna de
-- PII en el resultado — nada de telefono, email, responsable, persona_contacto
-- ni observaciones_internas. La única columna de texto que sale es `empresa`,
-- que ya es pública: la muestra el catálogo anónimo vía
-- `publicaciones_publicas` (04_public_view.sql).
--
-- Es decir: la anon key no gana acceso a ninguna fila que hoy no pueda ver.
-- Gana acceso a agregados. Eso mantiene el Principio IV de la constitución.
--
-- NO agregarle parámetros ni devolver filas individuales. Si en algún momento
-- el dashboard necesita detalle, la respuesta correcta es una vista
-- `security_invoker` + una ruta protegida por rol, no ampliar esta función.
-- =============================================================

CREATE OR REPLACE FUNCTION public.metricas_dashboard()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, extensions
AS $$
  WITH base AS (SELECT * FROM public.publicaciones),
       c    AS (SELECT * FROM public.consultas)
  SELECT jsonb_build_object(

    'generado_en', now(),

    -- Tarjetas de cabecera.
    'totales', (
      SELECT jsonb_build_object(
        'publicaciones',   count(*),
        'publicadas',      count(*) FILTER (WHERE estado = 'publicada'),
        'empresas',        count(DISTINCT empresa),
        -- "Enriquecida por IA" = la IA le asignó rubro. Es el marcador más
        -- confiable: `matches` está vacío en todas las filas y `urgencia`
        -- también la puede dejar en null.
        'enriquecidas_ia', count(*) FILTER (WHERE rubro IS NOT NULL),
        'consultas',       (SELECT count(*) FROM c),
        'consultas_por_publicada',
          CASE WHEN count(*) FILTER (WHERE estado = 'publicada') = 0 THEN 0
               ELSE round(
                 (SELECT count(*) FROM c)::numeric
                 / count(*) FILTER (WHERE estado = 'publicada'), 2)
          END
      )
      FROM base
    ),

    -- Embudo IA → revisión humana → catálogo. Acá van TODOS los estados,
    -- no solo 'publicada': el punto del gráfico es mostrar que hay filas
    -- frenadas en el gate humano (Principio II).
    'por_estado', (
      SELECT jsonb_agg(jsonb_build_object('estado', estado, 'n', n) ORDER BY n DESC)
      FROM (SELECT estado, count(*) n FROM base GROUP BY 1) t
    ),

    -- De acá en adelante, solo lo publicado: es lo que el visitante ve.
    'por_tipo', (
      SELECT jsonb_agg(jsonb_build_object('tipo', tipo_publicacion, 'n', n) ORDER BY n DESC)
      FROM (SELECT tipo_publicacion, count(*) n FROM base
            WHERE estado = 'publicada' GROUP BY 1) t
    ),

    'por_urgencia', (
      SELECT jsonb_agg(jsonb_build_object('urgencia', urg, 'n', n) ORDER BY n DESC)
      FROM (SELECT coalesce(urgencia, 'sin_dato') urg, count(*) n FROM base
            WHERE estado = 'publicada' GROUP BY 1) t
    ),

    -- Crecimiento del catálogo. `acum` es la serie que se grafica; `n` queda
    -- para el tooltip ("ese día entraron 4").
    'linea_tiempo', (
      SELECT jsonb_agg(jsonb_build_object('dia', dia, 'n', n, 'acum', acum) ORDER BY dia)
      FROM (
        SELECT dia, n, sum(n) OVER (ORDER BY dia) acum
        FROM (
          SELECT (created_at AT TIME ZONE 'America/Argentina/Salta')::date::text dia,
                 count(*) n
          FROM base GROUP BY 1
        ) d
      ) e
    ),

    -- Ranking. Devuelve empresa y tipo, nunca los datos del interesado.
    'top_consultadas', (
      SELECT jsonb_agg(jsonb_build_object('empresa', empresa, 'tipo', tipo_publicacion, 'n', n)
                       ORDER BY n DESC)
      FROM (
        SELECT b.empresa, b.tipo_publicacion, count(c.id) n
        FROM base b JOIN c ON c.publicacion_id = b.id
        WHERE b.estado = 'publicada'
        GROUP BY 1, 2
        ORDER BY n DESC
        LIMIT 5
      ) t
    )
  );
$$;

COMMENT ON FUNCTION public.metricas_dashboard() IS
  'Agregados para /dashboard. SECURITY DEFINER a propósito: la anon key no ve consultas ni publicaciones sin publicar. Devuelve solo conteos, cero PII.';

GRANT EXECUTE ON FUNCTION public.metricas_dashboard() TO anon, authenticated, service_role;
