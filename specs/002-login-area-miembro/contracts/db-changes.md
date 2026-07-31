# Contract — Cambios en la base de datos

**Feature**: 002-login-area-miembro

Todos estos cambios **los ejecuta una persona** contra el proyecto Supabase (constitución, Development Workflow: nunca migraciones automáticas desde la aplicación). Van en un archivo nuevo bajo `db/`, siguiendo la numeración existente.

**Alcance**: tres objetos nuevos. **No se modifica ningún objeto existente y no se revoca ningún privilegio** — ver la nota de abajo.

---

## Lo que esta feature deliberadamente NO hace

Una versión anterior de este contrato incluía dos pasos previos: revocar el acceso de lectura de `anon` y `authenticated` a la tabla base `publicaciones`, y reescribir `publicaciones_publicas` para que sobreviviera a ese revoke.

**Ambos se quitaron el 2026-07-30.** El motivo está en R-01: el acceso directo a la tabla base con datos de contacto ya está abierto hoy para cualquiera con la clave anónima, y **el inicio de sesión no lo amplía** — un miembro autenticado obtiene los mismos datos que obtendría sin autenticarse. Cerrarlo es necesario antes de producción, pero no es prerequisito de esta feature, y hacerlo acá implicaba tocar la vista del catálogo en producción con riesgo de dejarlo caído.

Queda como riesgo aceptado y registrado en FR-026b, junto con la T040 de la feature 001. El procedimiento de cierre está documentado en R-01.

**Consecuencia práctica**: `publicaciones_publicas` **no se toca**, conserva `security_invoker`, y el catálogo público sigue funcionando exactamente igual. La vista nueva de esta feature también usa `security_invoker`, así que el RLS sigue siendo la barrera de fondo en toda la aplicación.

---

## Paso 1 — Vista `mis_publicaciones`

```sql
CREATE OR REPLACE VIEW public.mis_publicaciones
WITH (security_invoker = true)   -- respeta el RLS de publicaciones; el WHERE de abajo
                                 -- es la barrera efectiva (ver aviso)
AS
SELECT
  p.id, p.tipo_publicacion, p.descripcion, p.descripcion_comercial,
  p.rubro, p.subrubro, p.zona, p.condicion_comercial, p.disponibilidad,
  p.vencimiento, p.imagen_url, p.urgencia, p.estado,
  p.empresa, p.responsable, p.telefono, p.email,   -- datos propios del miembro
  p.created_at, p.updated_at,
  (SELECT count(*) FROM public.consultas c WHERE c.publicacion_id = p.id) AS cantidad_consultas
FROM public.publicaciones p
WHERE p.autor_id = auth.uid();   -- barrera de filas

GRANT SELECT ON public.mis_publicaciones TO authenticated;
```

**Excluye `observaciones_internas`** (anotación interna de CAPEMISA) y **`autor_id`, `matches`, `texto_whatsapp`** (no aportan al miembro).

**No se otorga a `anon`**: sin sesión, `auth.uid()` es nulo y la vista no devolvería nada, pero no hay razón para concederle el privilegio.

> ⚠️ **El `WHERE p.autor_id = auth.uid()` es el que hace el trabajo, y no es redundante con el RLS.**
>
> Es tentador pensar que con `security_invoker` el RLS ya alcanza. No alcanza: las políticas de
> `publicaciones` se combinan con **OR**, y `publicaciones_select_publica` alcanza también a
> `authenticated`. Sin ese `WHERE`, un miembro autenticado vería sus propias publicaciones **más
> todas las publicadas de los demás, con teléfono, email y responsable incluidos**.
>
> Verificarlo con dos cuentas distintas antes de darlo por bueno (puntos 2 y 3 de la verificación).

---

## Paso 2 — Función de autoría

```sql
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
```

**Por qué `SECURITY DEFINER` aunque hoy no haga falta**: sin el revoke, una subconsulta directa dentro de la política también funcionaría. Se usa la función igual porque **sobrevive al cierre de R-01** (el día que se aplique el revoke, una subconsulta perdería el privilegio y la política devolvería cero filas *sin ningún error*), porque aísla la política del RLS de la otra tabla, y porque es el mismo patrón de la función `is_admin()` ya existente. Decisión de robustez barata — no la "simplifiquen" más adelante creyendo que sobra. Detalle en R-05.

---

## Paso 3 — Política de lectura de solicitudes por el autor

```sql
CREATE POLICY consultas_select_autor ON public.consultas
  FOR SELECT TO authenticated
  USING (public.es_autor_de(publicacion_id));
```

Las políticas se combinan con OR: `consultas_select_admin` sigue vigente y la administración conserva visibilidad completa.

**No se agregan políticas de `UPDATE` ni `DELETE`** sobre `consultas` (el miembro lee, no gestiona) ni de `DELETE` sobre `publicaciones` (FR-027 decidió que no hay baja desde la web).

---

## Verificación posterior

Con los cambios aplicados, todo esto debe cumplirse **consultado contra la API, no desde la interfaz** (SC-005):

Estas verificaciones cubren **las puertas que esta feature abre**. Son las que importan: los objetos nuevos son los únicos que pueden filtrar datos entre miembros por una vía que hoy no existe.

| # | Consulta | Resultado esperado |
|---|---|---|
| 1 | `mis_publicaciones` sin sesión | Vacío o permiso denegado; nunca datos |
| 2 | `mis_publicaciones` con token del miembro A | Solo publicaciones de A, en todos los estados. **Ninguna publicación de otro miembro, ni siquiera publicada** |
| 3 | `mis_publicaciones` con token del miembro B | Solo publicaciones de B; ninguna de A |
| 4 | `consultas` con token de A | Solo solicitudes de publicaciones de A |
| 5 | `consultas` con token de B | Ninguna solicitud de publicaciones de A |
| 6 | `consultas` sin sesión | Vacío o permiso denegado; nunca datos |
| 7 | Catálogo público en el navegador, con sesión y sin sesión | Idéntico en ambos casos (FR-026) |

**El punto 2 es el más fácil de dar por bueno erróneamente.** Si la vista quedó sin el `WHERE autor_id`, el miembro A ve sus publicaciones **y además todas las publicadas de los demás con sus teléfonos**, y a simple vista parece que "funciona": hay datos, se ven publicaciones. Hay que contar filas y verificar autoría, no mirar la pantalla.

Los puntos 3 y 5 exigen **dos cuentas de miembro distintas, cada una con publicaciones y solicitudes**. Los seeds actuales traen una sola: crear la segunda es parte de la preparación. Sin eso, SC-003 no se puede validar.

### Estado conocido y no verificado acá

Estas dos vías **quedan abiertas a propósito** y no forman parte de esta verificación, porque son preexistentes y su cierre se postergó (FR-026b, R-01, T040 de la feature 001):

- Tabla base `publicaciones` con la anon key, pidiendo `telefono`, `email`, `responsable` → devuelve datos.
- Vista `publicaciones_searchable` con la anon key → devuelve datos, incluidas filas no publicadas.

Registrarlo como estado conocido en cada corrida, para que nadie lo lea como "verificado y correcto".
