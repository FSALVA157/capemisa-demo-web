-- ============================================================
-- CAPEMISA Conecta — Seeds demo
-- Usuarios: miembro@capemisa.com / admin@capemisa.com   pass: demo1234
-- ============================================================

-- ---------- auth.users ----------
INSERT INTO auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at,
  raw_app_meta_data, raw_user_meta_data, is_super_admin
) VALUES
('00000000-0000-0000-0000-000000000000',
 '11111111-1111-1111-1111-111111111111',
 'authenticated', 'authenticated',
 'miembro@capemisa.com', crypt('demo1234', gen_salt('bf')),
 now(), now(), now(),
 '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, false),
('00000000-0000-0000-0000-000000000000',
 '22222222-2222-2222-2222-222222222222',
 'authenticated', 'authenticated',
 'admin@capemisa.com', crypt('demo1234', gen_salt('bf')),
 now(), now(), now(),
 '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, false);

-- ---------- auth.identities (necesario para login email) ----------
INSERT INTO auth.identities (
  id, user_id, identity_data, provider, provider_id,
  last_sign_in_at, created_at, updated_at
) VALUES
(gen_random_uuid(),
 '11111111-1111-1111-1111-111111111111',
 jsonb_build_object('sub','11111111-1111-1111-1111-111111111111','email','miembro@capemisa.com','email_verified',true),
 'email', 'miembro@capemisa.com', now(), now(), now()),
(gen_random_uuid(),
 '22222222-2222-2222-2222-222222222222',
 jsonb_build_object('sub','22222222-2222-2222-2222-222222222222','email','admin@capemisa.com','email_verified',true),
 'email', 'admin@capemisa.com', now(), now(), now());

-- ---------- perfiles ----------
INSERT INTO public.perfiles (id, rol, empresa, responsable, telefono, email) VALUES
('11111111-1111-1111-1111-111111111111', 'miembro', 'Servicios Andinos SRL', 'Mario Vargas', '+5493875550001', 'miembro@capemisa.com'),
('22222222-2222-2222-2222-222222222222', 'admin',   'CAPEMISA',              'Edgardo Salva', '+5493875550000', 'admin@capemisa.com');

-- ---------- publicaciones ----------
-- 1) OFERTA de servicio publicada — camionetas 4x4 con chofer a la Puna
INSERT INTO public.publicaciones (
  id, autor_id, empresa, responsable, telefono, email,
  tipo_publicacion, zona, descripcion, condicion_comercial, disponibilidad,
  rubro, subrubro, descripcion_comercial, texto_whatsapp, urgencia, estado
) VALUES (
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaa01',
  '11111111-1111-1111-1111-111111111111',
  'Servicios Andinos SRL', 'Mario Vargas', '+5493875550001', 'miembro@capemisa.com',
  'oferta_servicio', 'Puna salteña',
  'Ofrecemos camionetas 4x4 con chofer para operaciones mineras en la Puna. Flota nueva, seguros al día.',
  'Tarifa por día o por proyecto, mínimo 15 días',
  'Inmediata',
  'Logística', 'Transporte 4x4',
  'Servicio de transporte 4x4 con chofer para operaciones mineras de altura, flota renovada y cobertura integral en la Puna salteña.',
  '🚙 SERVICIO 4x4 CON CHOFER — Puna salteña
Flota nueva, seguros al día, mínimo 15 días.
Contacto: Mario Vargas · +54 9 387 555-0001',
  'media', 'publicada'
);

-- 2) BÚSQUEDA de proveedor publicada — neumáticos para flota (matcheable con futura oferta)
INSERT INTO public.publicaciones (
  id, autor_id, empresa, responsable, telefono, email,
  tipo_publicacion, zona, descripcion, condicion_comercial, disponibilidad,
  rubro, subrubro, descripcion_comercial, texto_whatsapp, urgencia, estado
) VALUES (
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaa02',
  '11111111-1111-1111-1111-111111111111',
  'Servicios Andinos SRL', 'Mario Vargas', '+5493875550001', 'miembro@capemisa.com',
  'busqueda_proveedor', 'Salta capital',
  'Necesitamos proveedor de neumáticos 265/70 R17 para flota de 8 camionetas, entrega en Salta capital.',
  'Contado o 30 días', 'Urgente, en 2 semanas',
  'Repuestos', 'Neumáticos',
  'Búsqueda de proveedor de neumáticos 265/70 R17 para flota corporativa de 8 unidades con entrega en Salta capital.',
  '🔎 BUSCAMOS NEUMÁTICOS 265/70 R17
Flota de 8 camionetas · Salta capital · 2 semanas
Contacto: Mario Vargas · +54 9 387 555-0001',
  'alta', 'publicada'
);

-- 3) VENTA de equipo pendiente — grupo electrógeno usado
INSERT INTO public.publicaciones (
  id, autor_id, empresa, responsable, telefono, email,
  tipo_publicacion, zona, descripcion, condicion_comercial,
  rubro, subrubro, urgencia, estado
) VALUES (
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaa03',
  '11111111-1111-1111-1111-111111111111',
  'Servicios Andinos SRL', 'Mario Vargas', '+5493875550001', 'miembro@capemisa.com',
  'venta_equipo', 'Salta',
  'Vendo grupo electrógeno 60 kVA diesel, 2018, 3.200 hs de uso, service al día. Retiro en obrador.',
  'USD, negociable',
  'Equipos', 'Generación eléctrica',
  'baja', 'pendiente'
);

-- ---------- consultas ----------
-- Solicitud de contacto sobre la oferta de camionetas 4x4
INSERT INTO public.consultas (
  publicacion_id, empresa_interesada, persona_contacto, telefono, email, motivo, urgencia
) VALUES (
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaa01',
  'Minera Norte SA', 'Laura Rojas', '+5493875550100', 'laura.rojas@mineranorte.com',
  'Necesitamos 3 unidades por 60 días para relevamiento geológico', 'alta'
);
