-- =============================================================
-- CAPEMISA Conecta — Área de miembro (feature 002-login-area-miembro)
--
-- QUÉ CREA ESTE ARCHIVO
--   1. public.es_autor_de(uuid)        — función SECURITY DEFINER de autoría
--   2. consultas_select_autor          — política: el autor lee las solicitudes
--                                        recibidas en sus publicaciones
--   3. public.mis_publicaciones        — vista del área de miembro
--
-- QUÉ **NO** HACE ESTE ARCHIVO, Y POR QUÉ
--   No revoca ningún privilegio sobre la tabla base `publicaciones`, y no toca
--   `publicaciones_publicas`.
--
--   Hoy, cualquiera con la clave anónima —que viaja en el bundle público de la
--   web— puede leer `telefono`, `email` y `responsable` de todas las
--   publicaciones en estado 'publicada' consultando la tabla base directamente.
--   Se sabe, está medido, y se decidió postergarlo: es un problema PREEXISTENTE
--   y el login NO lo amplía, porque un miembro autenticado obtiene exactamente
--   los mismos datos que obtendría sin autenticarse.
--
--   Registrado como riesgo aceptado en FR-026b de la spec. Hay una segunda vía
--   abierta equivalente (`publicaciones_searchable`, T040 de la feature 001).
--   **Las dos deben cerrarse antes de pasar de demo a producción.** El
--   procedimiento y sus dos alternativas están en specs/002-login-area-miembro/
--   research.md → R-01. No hace falta investigarlo de nuevo.
--
-- SI ALGUIEN VIENE A "ARREGLAR" ESTO
--   Cerrar el agujero implica `REVOKE SELECT ON public.publicaciones FROM anon,
--   authenticated`. Ese revoke **rompe `publicaciones_publicas`**, que es
--   security_invoker y por lo tanto necesita que el consultante tenga privilegio
--   sobre la tabla base. Aplicarlo sin ajustar esa vista deja el catálogo
--   público caído. Leer R-01 antes de tocar nada.
-- =============================================================


-- -------------------------------------------------------------
-- 1) Función de autoría
--
-- Verifica si el usuario autenticado es el autor de una publicación.
--
-- POR QUÉ ES `SECURITY DEFINER` SI HOY NO HARÍA FALTA:
-- tal como está la base hoy, una subconsulta directa a `publicaciones` dentro de
-- la política funcionaría igual. Se usa la función igual por tres razones:
--
--   a) Sobrevive al cierre de R-01. El día que se aplique el REVOKE, una
--      subconsulta directa perdería el privilegio de lectura y la política
--      dejaría de encontrar coincidencias: el miembro vería CERO solicitudes
--      **sin ningún mensaje de error**. Falla silenciosa, de las peores.
--   b) Aísla esta política del RLS de `publicaciones`, que si no se arrastraría
--      a la evaluación de cada fila de `consultas`.
--   c) Es el mismo patrón que `public.is_admin()`, ya presente en 01_schema.sql.
--
-- No la "simplifiquen" a una subconsulta creyendo que sobra.
-- -------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.es_autor_de(pub_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.publicaciones
    WHERE id = pub_id AND autor_id = auth.uid()
  );
$$;


-- -------------------------------------------------------------
-- 2) Política: el autor lee las solicitudes de sus publicaciones
--
-- Hasta ahora `consultas` solo tenía dos políticas: cualquiera INSERTA
-- (consultas_insert_open) y solo administración LEE (consultas_select_admin).
-- O sea que el destinatario natural de una solicitud —el miembro que publicó—
-- no podía verla. Esta política cierra ese hueco.
--
-- Las políticas se combinan con OR: `consultas_select_admin` sigue vigente y la
-- administración conserva visibilidad completa.
--
-- NO se agregan políticas de UPDATE ni DELETE: el miembro LEE las solicitudes,
-- no las gestiona. Marcarlas como contactadas o cerradas (estado_seguimiento) es
-- atribución de administración y está fuera del alcance de esta feature.
-- -------------------------------------------------------------
DROP POLICY IF EXISTS consultas_select_autor ON public.consultas;

CREATE POLICY consultas_select_autor ON public.consultas
  FOR SELECT TO authenticated
  USING (public.es_autor_de(publicacion_id));


-- -------------------------------------------------------------
-- 3) Vista del área de miembro
--
-- Devuelve las publicaciones del miembro autenticado EN CUALQUIER ESTADO, más
-- la cantidad de solicitudes recibidas por cada una.
--
-- ⚠️ EL `WHERE autor_id = auth.uid()` NO ES REDUNDANTE CON EL RLS.
--
-- Es tentador pensar que con security_invoker el RLS de `publicaciones` ya
-- alcanza. NO alcanza. Las políticas de esa tabla se combinan con OR, y
-- `publicaciones_select_publica` (01_schema.sql) alcanza también al rol
-- `authenticated`:
--
--     FOR SELECT TO anon, authenticated USING (estado = 'publicada')
--
-- Sin ese WHERE, un miembro vería sus propias publicaciones MÁS todas las
-- publicadas de los demás miembros, con telefono, email y responsable
-- incluidos. Y a simple vista parecería que "funciona": hay datos, se ven
-- publicaciones. Verificar contando filas y comprobando autoría con DOS cuentas
-- distintas, no mirando la pantalla.
--
-- Se mantiene security_invoker igual, para conservar el RLS como segunda
-- barrera. El WHERE es la primera.
--
-- ⚠️ `cantidad_consultas` DEPENDE DE LA POLÍTICA DE ARRIBA.
-- Con security_invoker, esa subconsulta se evalúa con los privilegios del
-- consultante, así que el RLS de `consultas` se le aplica. Cuenta correctamente
-- **porque** existe `consultas_select_autor`. Si alguien elimina esa política,
-- los conteos pasan a 0 en silencio, sin error y sin que la vista falle.
--
-- COLUMNAS: se incluyen telefono, email y responsable porque son datos PROPIOS
-- del miembro, no de terceros. Se excluyen deliberadamente:
--   - observaciones_internas : anotaciones de CAPEMISA sobre la publicación
--   - autor_id, matches      : internos, no aportan nada al miembro
--   - texto_whatsapp         : texto interno de armado de mensajes
-- -------------------------------------------------------------
CREATE OR REPLACE VIEW public.mis_publicaciones
WITH (security_invoker = true)
AS
SELECT
  p.id,
  p.tipo_publicacion,
  p.descripcion,
  p.descripcion_comercial,
  p.rubro,
  p.subrubro,
  p.zona,
  p.condicion_comercial,
  p.disponibilidad,
  p.vencimiento,
  p.imagen_url,
  p.urgencia,
  p.estado,
  -- datos de contacto propios, tomados del perfil al crear la publicación
  p.empresa,
  p.responsable,
  p.telefono,
  p.email,
  p.created_at,
  p.updated_at,
  (
    SELECT count(*)
    FROM public.consultas c
    WHERE c.publicacion_id = p.id
  ) AS cantidad_consultas
FROM public.publicaciones p
WHERE p.autor_id = auth.uid();

-- Solo `authenticated`: sin sesión auth.uid() es nulo y la vista no devolvería
-- nada, pero no hay motivo para concederle el privilegio a `anon`.
GRANT SELECT ON public.mis_publicaciones TO authenticated;
