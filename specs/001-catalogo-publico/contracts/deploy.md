# Contract — Pipeline de deploy

**Feature**: 001-catalogo-publico
**Scope**: cómo se materializa el requerimiento constitucional (v1.0.1) de "push a `main` → auto-deploy VPS Hostinger vía Coolify" para esta feature.

---

## Requisito de la constitución

> Toda salida a producción MUST pasar por push/merge a la rama `main` del repositorio GitHub del proyecto, disparando auto-deploy al VPS Hostinger. Deploys manuales por SSH, SFTP, FTP, `scp` o edición directa en el VPS están prohibidos, incluso para hotfixes urgentes.

Esta feature es la primera del proyecto, así que la habilitación del pipeline forma parte del scope de sus tasks.

---

## Componentes del pipeline

```text
[Fernando] git push main → GitHub repo → Coolify webhook → build (Vite) → deploy static → VPS Hostinger → sitio en dominio
```

### 1. Repositorio GitHub

- Repo: **`FSALVA157/capemisa-demo-web`** (público), creado 2026-07-28. Rama por default: `main`.
- Rama `main` = producción; features en ramas `NNN-nombre-feature` (matching `specs/NNN-nombre/`).
- **Layout real**: el repo tiene el contenido de `web/` en la **raíz** — NO hay carpeta `web/` dentro del repo. El git repo local vive en `capemisa-app-demo/web/`, no en la raíz del proyecto.
- **Gap conocido**: `specs/` y `.specify/` quedaron FUERA de este repo (viven solo local, bajo el repo padre `/Projects` que pertenece a otro proyecto). La trazabilidad requerimiento→código está desconectada del versionado. Pendiente de resolver.

### 2. Coolify

- Dashboard Coolify existente en el VPS Hostinger de Fernando (según memoria de contexto).
- Servicio tipo **Application**, build pack **Dockerfile** (decidido 2026-07-28).
- El build está definido en `Dockerfile` (multi-stage: `node:24.11.1-slim` compila → `nginx:alpine` sirve) y `nginx.conf`, ambos versionados en la raíz del repo. Coolify no necesita build/publish commands: los toma del Dockerfile.
- Puerto expuesto: **80**.
- Se eligió Dockerfile sobre el build pack Static para que el **fallback SPA** (`try_files $uri $uri/ /index.html`, necesario para rutas como `/publicacion/:id`) quede versionado en git y no dependa de config del dashboard.
- El tag de la imagen Node está **pinneado** a `24.11.1-slim` a propósito: los tags flotantes traen npm 12, que resuelve las deps opcionales nativas de Rolldown distinto y rompe `npm ci` con este lockfile.
- Trigger: webhook desde GitHub sobre push a `main`.
- Variables de entorno, ambas marcadas como **Build Variable** en Coolify (llegan como `--build-arg`; Vite las inlinea en el JS en build-time, no existen en runtime):
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`

### 3. VPS Hostinger

- Sirve el bundle estático de `web/dist/` bajo el dominio elegido.
- Nginx (o el proxy que use Coolify) sirve `index.html` para todas las rutas del router SPA (`try_files ... /index.html`).

### 4. Dominio

- **Sin decidir** en esta feature: puede usarse un subdominio de un dominio propio, o el subdominio *.coolify.tu-vps que Coolify autoprovisiona.
- Este contrato NO fija el dominio final; queda como decisión operativa (tarea en `tasks.md`).

---

## Convenciones de rama y merge

- Trabajo local en rama `001-catalogo-publico`.
- Merge a `main` = "release" de la feature.
- No hay entorno staging separado en esta demo (Principio V).
- Rollback: revertir el commit merge en `main` y push → Coolify redeploya la versión anterior automáticamente.

---

## Prohibiciones (recordatorio de la constitución)

Prohibidos en esta feature y en cualquier posterior:

- `ssh` al VPS para editar archivos.
- `scp` / `rsync` de `web/dist/` al VPS.
- Deploy manual desde el dashboard Coolify sin push a GitHub.
- Cualquier cambio de configuración del VPS que no esté versionado.

Los hotfixes urgentes se materializan como commits en `main`, incluso si es un cambio de 1 línea.

---

## Contrato de secretos

- `.env.local` en `web/` — gitignored, contiene las variables reales para dev local. NO se commitea.
- `.env.example` en `web/` — commiteado, contiene los NOMBRES de las variables con valores vacíos o dummy.
- Variables reales en producción viven en el **dashboard de Coolify**, NUNCA en el repo.
- La `anon key` de Supabase es de diseño pública (RLS es la defensa); aún así se maneja como env var por higiene.
- El `service_role` key JAMÁS aparece en `web/*` — está solo en n8n y en el dashboard Supabase.

---

## Definición de "done" para el deploy en esta feature

Se considera cumplido el contrato cuando:

1. Existe un repo GitHub del proyecto y esta feature vive en un commit trackeable.
2. Coolify tiene un servicio configurado que apunta al repo y se dispara con push a `main`.
3. Las variables `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` están cargadas en Coolify.
4. Un `git push origin main` desde la máquina local produce, sin intervención manual, un nuevo bundle servido en el dominio elegido.
5. El sitio en producción muestra el catálogo con los 3 casos precargados (SC-006).
6. Fernando NO tocó el VPS por SSH ni scp durante todo el proceso.
