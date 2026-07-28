# Build: compila el bundle estático de Vite.
# Las VITE_* se inlinean en el JS en build-time, por eso llegan como build args
# (en Coolify: marcar cada variable como "Build Variable").
# Tag pinneado a propósito: los tags flotantes (node:24-slim) traen npm 12, que
# resuelve las deps opcionales nativas distinto y rompe `npm ci` con este lockfile.
# 24.11.1-slim = npm 11.6.2, el mismo que generó package-lock.json.
FROM node:24.11.1-slim AS build

ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# Runtime: nginx sirve dist/ con fallback SPA para las rutas de React Router.
FROM nginx:alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
