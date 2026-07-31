-- =============================================================
-- CAPEMISA Conecta — Datos de prueba para el área de miembro (feature 002)
--
-- POR QUÉ EXISTE ESTE ARCHIVO
--   El control de acceso central de la feature 002 es que un miembro vea
--   ÚNICAMENTE lo suyo (SC-003, FR-008, FR-009). Eso es **imposible de validar
--   con una sola cuenta de miembro**: con una sola, cualquier vista mal escrita
--   pasa la prueba, porque no hay datos ajenos contra los cuales fallar.
--
--   `02_seeds.sql` trae una sola cuenta de miembro. Este archivo agrega la
--   segunda, con publicaciones y solicitudes propias, y completa los datos de
--   la primera para cubrir todos los estados.
--
--   Sin correr este archivo, las verificaciones 3 y 5 de
--   specs/002-login-area-miembro/contracts/db-changes.md no se pueden hacer.
--
-- ⚠️ ANTES DE CORRERLO: verificar que el id '55555555-...' esté libre en la base
--   real. Se eligió ese en lugar de 33333333/44444444 porque esos ya están
--   tomados por perfiles cargados fuera de los seeds versionados.
--   Comprobar con:  SELECT id, email FROM auth.users;
--
-- Idempotente: todos los INSERT llevan ON CONFLICT DO NOTHING.
-- Contraseña de la cuenta nueva: demo1234 (igual que las demás cuentas demo).
-- =============================================================


-- ---------- Miembro B: cuenta de autenticación ----------
-- ⚠️ Las 8 columnas de token van en cadena vacía, NO en NULL, y por eso se listan
-- explícitamente. GoTrue las lee como `string` de Go: si quedan en NULL, el login
-- devuelve 500 con "Scan error on column index 3, name confirmation_token:
-- converting NULL to string is unsupported" — y rompe el login de TODAS las cuentas
-- de la base, no solo de esta. Diagnosticado el 2026-07-31 durante T008.
INSERT INTO auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at,
  raw_app_meta_data, raw_user_meta_data, is_super_admin,
  confirmation_token, recovery_token, email_change, email_change_token_new,
  email_change_token_current, phone_change, phone_change_token, reauthentication_token
) VALUES
('00000000-0000-0000-0000-000000000000',
 '55555555-5555-5555-5555-555555555555',
 'authenticated', 'authenticated',
 -- pgcrypto vive en el schema `extensions` en Supabase y no está en el
 -- search_path por defecto: calificar el schema o falla con "function does not exist".
 'miembro.b@capemisa.com', extensions.crypt('demo1234', extensions.gen_salt('bf')),
 now(), now(), now(),
 '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, false,
 '', '', '', '', '', '', '', '')
ON CONFLICT (id) DO NOTHING;

-- Necesario para que funcione el login por email.
INSERT INTO auth.identities (
  id, user_id, identity_data, provider, provider_id,
  last_sign_in_at, created_at, updated_at
) VALUES
(gen_random_uuid(),
 '55555555-5555-5555-5555-555555555555',
 jsonb_build_object(
   'sub','55555555-5555-5555-5555-555555555555',
   'email','miembro.b@capemisa.com',
   'email_verified',true),
 'email', 'miembro.b@capemisa.com', now(), now(), now())
ON CONFLICT (provider, provider_id) DO NOTHING;

INSERT INTO public.perfiles (id, rol, empresa, responsable, telefono, email) VALUES
('55555555-5555-5555-5555-555555555555', 'miembro',
 'Metalúrgica del Norte SA', 'Laura Quiroga', '+5493875550002', 'miembro.b@capemisa.com')
ON CONFLICT (id) DO NOTHING;


-- ---------- Miembro B: una publicación publicada ----------
-- Sirve de "dato ajeno" contra el cual verificar que el miembro A no la ve en
-- su área. Está en estado 'publicada' a propósito: es el caso peligroso, porque
-- publicaciones_select_publica alcanza al rol authenticated.
INSERT INTO public.publicaciones (
  id, autor_id, empresa, responsable, telefono, email,
  tipo_publicacion, zona, descripcion, condicion_comercial, disponibilidad,
  rubro, subrubro, descripcion_comercial, urgencia, estado
) VALUES (
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb01',
  '55555555-5555-5555-5555-555555555555',
  'Metalúrgica del Norte SA', 'Laura Quiroga', '+5493875550002', 'miembro.b@capemisa.com',
  'oferta_servicio', 'Gran Salta',
  'Fabricación y reparación de estructuras metálicas para plantas industriales. Taller propio con capacidad de 20 toneladas.',
  'Presupuesto por proyecto, 30% de anticipo',
  'A 15 días de la orden de compra',
  'Metalurgia', 'Estructuras metálicas',
  'Taller metalúrgico con capacidad de 20 toneladas para fabricación y reparación de estructuras industriales en el Gran Salta.',
  'media', 'publicada'
) ON CONFLICT (id) DO NOTHING;

-- Solicitud recibida por el miembro B. El miembro A NO debe verla nunca.
INSERT INTO public.consultas (
  id, publicacion_id, empresa_interesada, persona_contacto, telefono, email,
  motivo, urgencia
) VALUES (
  'cccccccc-cccc-cccc-cccc-cccccccccb01',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb01',
  'Ingeniería Austral SRL', 'Pablo Sosa', '+5493875551010', 'compras@ingaustral.com.ar',
  'Necesitamos cotizar estructuras para ampliación de planta.', 'media'
) ON CONFLICT (id) DO NOTHING;


-- ---------- Miembro A: completar estados faltantes ----------
-- 02_seeds.sql ya dejó publicaciones publicadas del miembro A. Faltan los
-- estados que solo se ven desde el área de miembro, que es justamente lo que
-- esta feature agrega (FR-008, FR-011).

-- Pendiente de revisión: el estado en el que nace todo lo creado desde la web.
INSERT INTO public.publicaciones (
  id, autor_id, empresa, responsable, telefono, email,
  tipo_publicacion, zona, descripcion, disponibilidad, estado
) VALUES (
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaa10',
  '11111111-1111-1111-1111-111111111111',
  'Servicios Andinos SRL', 'Mario Vargas', '+5493875550001', 'miembro@capemisa.com',
  'busqueda_equipo', 'Puna salteña',
  'Buscamos compresor de aire portátil para obra en altura, alquiler por 3 meses.',
  'A la brevedad', 'pendiente'
) ON CONFLICT (id) DO NOTHING;

-- Rechazada: debe seguir apareciendo en el área del miembro con su estado.
-- Ocultarla haría que el miembro la vuelva a cargar sin saber que fue rechazada
-- (decisión registrada en los Edge Cases de la spec).
INSERT INTO public.publicaciones (
  id, autor_id, empresa, responsable, telefono, email,
  tipo_publicacion, descripcion, estado, observaciones_internas
) VALUES (
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaa11',
  '11111111-1111-1111-1111-111111111111',
  'Servicios Andinos SRL', 'Mario Vargas', '+5493875550001', 'miembro@capemisa.com',
  'venta_equipo',
  'Vendo camioneta usada.',
  'rechazada',
  'Descripción insuficiente y sin datos del vehículo. Se pidió ampliar y no hubo respuesta.'
) ON CONFLICT (id) DO NOTHING;

-- Faltan datos: el estado que hoy no tiene salida desde la web y que US4 resuelve.
INSERT INTO public.publicaciones (
  id, autor_id, empresa, responsable, telefono, email,
  tipo_publicacion, descripcion, estado, observaciones_internas
) VALUES (
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaa12',
  '11111111-1111-1111-1111-111111111111',
  'Servicios Andinos SRL', 'Mario Vargas', '+5493875550001', 'miembro@capemisa.com',
  'oferta_equipo',
  'Alquiler de generadores.',
  'faltan_datos',
  'Falta indicar potencia de los generadores, zona de cobertura y condición comercial.'
) ON CONFLICT (id) DO NOTHING;


-- ---------- Miembro A: solicitudes recibidas ----------
-- Dos sobre la misma publicación, para verificar el conteo y el orden por fecha.

-- Con todos los campos completos.
INSERT INTO public.consultas (
  id, publicacion_id, empresa_interesada, persona_contacto, telefono, email,
  motivo, urgencia
) VALUES (
  'cccccccc-cccc-cccc-cccc-ccccccccca01',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaa01',
  'Minera Los Andes SA', 'Carolina Ruiz', '+5493875552020', 'logistica@mineralosandes.com',
  'Necesitamos 4 camionetas con chofer para campaña de exploración de 45 días.', 'alta'
) ON CONFLICT (id) DO NOTHING;

-- ⚠️ SIN email, SIN motivo y SIN urgencia: los tres son opcionales al enviar una
-- solicitud. Este registro existe para verificar que la lista de interesados se
-- vea bien con los tres vacíos, mostrando que no se dejaron en lugar de un hueco
-- ambiguo (edge case de la spec, AC-2.5). No borrar "para completar los datos".
INSERT INTO public.consultas (
  id, publicacion_id, empresa_interesada, persona_contacto, telefono, email,
  motivo, urgencia
) VALUES (
  'cccccccc-cccc-cccc-cccc-ccccccccca02',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaa01',
  'Transportes del Valle', 'Jorge Medina', '+5493875553030', NULL,
  NULL, NULL
) ON CONFLICT (id) DO NOTHING;

-- La publicación 'aaaaaaaa-...aa02' de 02_seeds.sql queda deliberadamente SIN
-- solicitudes, para verificar el estado vacío de la lista de interesados (AC-2.2).
