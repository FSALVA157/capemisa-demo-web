# CAPEMISA Conecta — Frontend

Frontend de la demo institucional CAPEMISA Conecta. Ver spec, plan y tasks en `../specs/001-catalogo-publico/`.

## Stack

Vite + React + TypeScript + Tailwind + shadcn/ui + React Router v6 + TanStack Query + Supabase.

Congelado por la [Constitución del proyecto](../.specify/memory/constitution.md) v1.0.1.

## Variables de entorno requeridas

Copiar `.env.example` a `.env.local` y completar:

```
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon key desde Supabase → Settings → API>
```

`.env.local` está en `.gitignore` (nunca commitearlo).

## Comandos

```bash
npm install       # instalar dependencias
npm run dev       # dev server en http://localhost:5173
npm run build     # build de producción a dist/
npm run preview   # preview local del build
```

## Deploy

Pipeline: push a `main` en GitHub → auto-deploy Coolify → VPS Hostinger.
Prohibido `ssh`/`scp` manual al VPS (Constitución v1.0.1). Ver `../specs/001-catalogo-publico/contracts/deploy.md`.
