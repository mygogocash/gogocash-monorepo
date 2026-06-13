# GoGoCash API — multi-stage build.
#
# BUILD CONTEXT = monorepo ROOT (not apps/api). Build with:
#   docker build -f apps/api/Dockerfile -t gogocash-api .
# This lets `npm ci` use the single root package-lock.json that pins the
# whole workspace, then build only the gogocash-api workspace.

# ── Stage 1: build ───────────────────────────────────────────────────────────
FROM node:22-alpine AS build
WORKDIR /app

# nest build (tsc) exceeds Node's default container heap
ENV NODE_OPTIONS="--max-old-space-size=4096"

# Install deps from the root lockfile. .npmrc carries legacy-peer-deps=true
# (NestJS v10/v11 peer mix), so npm ci resolves without a manual flag — but we
# pass it explicitly too as a guard against an unread .npmrc.
COPY package.json package-lock.json .npmrc ./
COPY apps/api/package.json ./apps/api/package.json
RUN npm ci --legacy-peer-deps

# Copy the api source and build only its workspace (@nestjs/cli is a devDep,
# already installed above).
COPY apps/api ./apps/api
RUN npm run build -w gogocash-api

# ── Stage 2: production runtime ──────────────────────────────────────────────
FROM node:22-alpine
WORKDIR /app

# Production-only deps from the same root lockfile.
COPY package.json package-lock.json .npmrc ./
COPY apps/api/package.json ./apps/api/package.json
RUN npm ci --legacy-peer-deps --omit=dev

# Compiled output and the runtime uploads target directory.
COPY --from=build /app/apps/api/dist ./apps/api/dist
COPY apps/api/uploads ./apps/api/uploads

# App binds process.env.PORT ?? 8080; Cloud Run injects PORT at runtime.
EXPOSE 8080

# Run the compiled entrypoint (equivalent to start:prod = `node dist/main`).
WORKDIR /app/apps/api
CMD ["node", "dist/main"]
