# GoGoCash API — multi-stage build.
#
# BUILD CONTEXT = monorepo ROOT (not apps/api). Build with:
#   docker build -f apps/api/Dockerfile -t gogocash-api .
# This lets `npm ci` use the single root package-lock.json that pins the
# whole workspace, then build only the gogocash-api workspace.

# ── Stage 1: build ───────────────────────────────────────────────────────────
FROM node:26-alpine AS build
WORKDIR /app

# Build is `swc src -d dist` (native, ~100ms) since the TS 7 upgrade — the old
# nest-build heap ceiling no longer applies, but keep headroom for npm ci.
ENV NODE_OPTIONS="--max-old-space-size=4096"

# Install deps from the root lockfile. .npmrc carries legacy-peer-deps=true
# (NestJS v10/v11 peer mix), so npm ci resolves without a manual flag — but we
# pass it explicitly too as a guard against an unread .npmrc. Ignore lifecycle
# scripts because the root postinstall patches admin assets that are not copied
# into this API-only image.
# --include=dev: Railway/Cloud Run may inject NODE_ENV=production into the
# build stage; without this, npm omits build tools (typescript/@swc/cli).
COPY package.json package-lock.json .npmrc ./
COPY apps/api/package.json ./apps/api/package.json
# Shared workspace packages (#19): npm ci must see every workspace dir that the
# api declares (@gogocash/contracts, @gogocash/tsconfig) or it fails to link.
# contracts is types-only for the api — nothing from packages/ is loaded at
# runtime, so the runtime stage deliberately does not copy it.
COPY packages ./packages
RUN npm install --global npm@10.9.8 \
 && npm ci --legacy-peer-deps --ignore-scripts --include=dev

# Copy the api source and build only its workspace (@swc/cli + .swcrc drive the
# build; type-checking is a separate native `tsc --noEmit` gate in CI).
COPY apps/api ./apps/api
RUN npm run build -w gogocash-api

# ── Stage 2: production runtime ──────────────────────────────────────────────
FROM node:26-alpine
WORKDIR /app

# Carry over the build stage's fully-resolved workspace node_modules (hoisted
# to the monorepo root). A production `npm ci --omit=dev` here with only
# apps/api/package.json present — not the sibling workspaces (admin/app) the
# root lockfile references — fails to install hoisted runtime deps like
# @nestjs/config, crashing the container with MODULE_NOT_FOUND on boot.
COPY package.json ./
COPY apps/api/package.json ./apps/api/package.json
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/apps/api/node_modules ./apps/api/node_modules

# Compiled output and the runtime uploads target directory.
COPY --from=build /app/apps/api/dist ./apps/api/dist
COPY apps/api/uploads ./apps/api/uploads

# App binds process.env.PORT ?? 8080; Cloud Run injects PORT at runtime.
EXPOSE 8080

# Run the compiled entrypoint (equivalent to start:prod = `node dist/main`).
WORKDIR /app/apps/api
CMD ["node", "dist/main"]
