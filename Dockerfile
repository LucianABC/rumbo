# syntax=docker/dockerfile:1
# Production images for every service, built from one pnpm workspace (#53).
# Targets: api, worker, web, migrate. Build from the repo root:
#   docker build --target api -t rumbo-api .

# Pinned by digest for reproducible builds; Dependabot (docker) proposes updates.
ARG NODE_IMAGE=node:24-slim@sha256:d6aa754f16b3197301076f047b5def2f02ea1dbbc2ca920407d46d7ec7f87b20

# ---------- base: Node + pnpm (version pinned by package.json → packageManager) ----------
FROM ${NODE_IMAGE} AS base
ENV PNPM_HOME=/pnpm \
    PATH=/pnpm:$PATH \
    COREPACK_ENABLE_DOWNLOAD_PROMPT=0
RUN corepack enable pnpm
WORKDIR /repo

# ---------- build: install everything, compile every package ----------
FROM base AS build
# Prisma's schema engine (prisma migrate) links against OpenSSL.
RUN apt-get update && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN corepack install
COPY . .
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm install --frozen-lockfile
RUN pnpm build
# Self-contained, production-only node_modules per service (workspace deps copied in, not linked).
# --ignore-scripts: @rumbo/db's postinstall rebuilds from sources, already built above.
RUN pnpm deploy --filter @rumbo/api --prod --ignore-scripts /out/api \
 && pnpm deploy --filter @rumbo/worker --prod --ignore-scripts /out/worker

# ---------- runtime base: no pnpm, no build tools, non-root ----------
FROM ${NODE_IMAGE} AS runtime
ENV NODE_ENV=production
WORKDIR /app
USER node

# ---------- api ----------
FROM runtime AS api
ARG APP_VERSION=dev
ARG GIT_COMMIT=unknown
ENV APP_VERSION=${APP_VERSION} \
    GIT_COMMIT=${GIT_COMMIT} \
    PORT=3001
COPY --from=build --chown=node:node /out/api ./
EXPOSE 3001
HEALTHCHECK --interval=10s --timeout=3s --start-period=10s --retries=3 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:'+process.env.PORT+'/api/v1/healthz').then(r=>process.exit(r.ok?0:1),()=>process.exit(1))"]
CMD ["node", "dist/main.js"]

# ---------- worker ----------
FROM runtime AS worker
COPY --from=build --chown=node:node /out/worker ./
CMD ["node", "dist/main.js"]

# ---------- web: Next.js standalone server ----------
FROM runtime AS web
ENV PORT=3000 \
    HOSTNAME=0.0.0.0 \
    NEXT_TELEMETRY_DISABLED=1
COPY --from=build --chown=node:node /repo/apps/web/.next/standalone ./
COPY --from=build --chown=node:node /repo/apps/web/.next/static ./apps/web/.next/static
EXPOSE 3000
CMD ["node", "apps/web/server.js"]

# ---------- migrate: one-off `prisma migrate deploy`, never run at app boot ----------
# Reuses the build stage: the Prisma CLI is a dev dependency and its schema engine binary is
# downloaded by an install script. Heavier than the app images, but it only runs once per deploy.
FROM build AS migrate
ENV NODE_ENV=production
WORKDIR /repo/packages/db
USER node
CMD ["node", "node_modules/prisma/build/index.js", "migrate", "deploy"]
