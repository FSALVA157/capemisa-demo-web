-- ============================================================
-- CAPEMISA Conecta — Schema demo
-- Tablas: perfiles, publicaciones, consultas
-- Helper: is_admin()
-- ============================================================

-- ---------- perfiles ----------
CREATE TABLE public.perfiles (
  id           uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  rol          text NOT NULL DEFAULT 'miembro' CHECK (rol IN ('miembro','admin')),
  empresa      text NOT NULL,
  responsable  text NOT NULL,
  telefono     text NOT NULL UNIQUE,
  email        text,
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX perfiles_telefono_idx ON public.perfiles (telefono);

-- ---------- helper is_admin (depende de perfiles) ----------
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.perfiles
    WHERE id = auth.uid() AND rol = 'admin'
  );
$$;

-- ---------- publicaciones ----------
CREATE TABLE public.publicaciones (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  autor_id               uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- campos usuario
  empresa                text NOT NULL,
  responsable            text NOT NULL,
  telefono               text NOT NULL,
  email                  text,
  tipo_publicacion       text NOT NULL CHECK (tipo_publicacion IN (
                           'oferta_servicio','oferta_equipo','venta_equipo',
                           'busqueda_proveedor','busqueda_equipo')),
  zona                   text,
  descripcion            text NOT NULL,
  condicion_comercial    text,
  disponibilidad         text,
  vencimiento            date,
  imagen_url             text,
  -- campos IA
  rubro                  text,
  subrubro               text,
  descripcion_comercial  text,
  texto_whatsapp         text,
  urgencia               text CHECK (urgencia IN ('baja','media','alta')),
  matches                jsonb NOT NULL DEFAULT '[]'::jsonb,
  -- control
  estado                 text NOT NULL DEFAULT 'pendiente' CHECK (estado IN (
                           'pendiente','faltan_datos','aprobada','publicada','rechazada')),
  observaciones_internas text,
  created_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX publicaciones_estado_idx ON public.publicaciones (estado);
CREATE INDEX publicaciones_autor_idx  ON public.publicaciones (autor_id);
CREATE INDEX publicaciones_tipo_idx   ON public.publicaciones (tipo_publicacion);

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER publicaciones_set_updated_at
BEFORE UPDATE ON public.publicaciones
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------- consultas ----------
CREATE TABLE public.consultas (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  publicacion_id       uuid NOT NULL REFERENCES public.publicaciones(id) ON DELETE CASCADE,
  empresa_interesada   text NOT NULL,
  persona_contacto     text NOT NULL,
  telefono             text NOT NULL,
  email                text,
  motivo               text,
  urgencia             text CHECK (urgencia IN ('baja','media','alta')),
  estado_seguimiento   text NOT NULL DEFAULT 'nueva' CHECK (estado_seguimiento IN (
                         'nueva','contactada','cerrada')),
  created_at           timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX consultas_publicacion_idx ON public.consultas (publicacion_id);

-- ============================================================
-- RLS
-- ============================================================
ALTER TABLE public.perfiles      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.publicaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consultas     ENABLE ROW LEVEL SECURITY;

-- perfiles
CREATE POLICY perfiles_select_self ON public.perfiles
  FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.is_admin());

CREATE POLICY perfiles_update_self ON public.perfiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid() OR public.is_admin())
  WITH CHECK (id = auth.uid() OR public.is_admin());

-- publicaciones SELECT
CREATE POLICY publicaciones_select_publica ON public.publicaciones
  FOR SELECT TO anon, authenticated
  USING (estado = 'publicada');

CREATE POLICY publicaciones_select_propia ON public.publicaciones
  FOR SELECT TO authenticated
  USING (autor_id = auth.uid());

CREATE POLICY publicaciones_select_admin ON public.publicaciones
  FOR SELECT TO authenticated
  USING (public.is_admin());

-- publicaciones INSERT
CREATE POLICY publicaciones_insert_auth ON public.publicaciones
  FOR INSERT TO authenticated
  WITH CHECK (autor_id = auth.uid());

-- publicaciones UPDATE
CREATE POLICY publicaciones_update_propia ON public.publicaciones
  FOR UPDATE TO authenticated
  USING (autor_id = auth.uid() AND estado IN ('pendiente','faltan_datos'))
  WITH CHECK (autor_id = auth.uid() AND estado IN ('pendiente','faltan_datos'));

CREATE POLICY publicaciones_update_admin ON public.publicaciones
  FOR UPDATE TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- consultas
CREATE POLICY consultas_insert_open ON public.consultas
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY consultas_select_admin ON public.consultas
  FOR SELECT TO authenticated
  USING (public.is_admin());
