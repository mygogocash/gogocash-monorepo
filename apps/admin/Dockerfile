# syntax=docker/dockerfile:1
#
# GoGoCash admin (Next.js 16, standalone output) → Cloud Run (asia-southeast1).
# Image: asia-southeast1-docker.pkg.dev/gogocash-staging/gogocash/gogocash-admin
#
# IMPORTANT: build context is the MONOREPO ROOT, not apps/admin.
#   docker build -f apps/admin/Dockerfile -t <image> .
# The single root package-lock.json drives the npm workspace install; the admin
# app no longer carries its own lockfile.
#
# NEXT_PUBLIC_API_URL and NEXT_PUBLIC_APP_URL are inlined by Next at build time.
# Pass them explicitly so admin API calls and customer-app deep links target the
# same environment. NEXT_PUBLIC_API_URL has no default to avoid silently pointing
# production builds at staging.

FROM node:26-slim AS builder
WORKDIR /app

# 1) Install dependencies from the lockfile first, for layer caching.
#    Copy only the manifests needed to resolve the workspace tree. The admin
#    postinstall (scripts/patch-apexcharts-border-radius.mjs) runs during
#    `npm ci`, so the admin package.json + scripts must be present.
#    Root postinstall must stay admin-only — do not reference apps/app paths
#    (this image copies only apps/admin before npm ci).
COPY package.json package-lock.json .npmrc ./
COPY apps/admin/package.json ./apps/admin/package.json
COPY apps/admin/.npmrc ./apps/admin/.npmrc
COPY apps/admin/scripts ./apps/admin/scripts
# Shared workspace packages (#19): admin depends on @gogocash/contracts (source
# transpiled by Next via transpilePackages) and @gogocash/tsconfig — npm ci
# must see the workspace dirs, and next build must see the contracts source.
COPY packages ./packages
# --legacy-peer-deps: the lockfile carries a peerOptional conflict
# (@types/node vs vite) that strict `npm ci` rejects; mirrored in .npmrc.
# --include=dev: Railway injects NODE_ENV=production into the image build,
# which would otherwise omit typescript (devDependency). Next then tries to
# auto-install TS via yarn and dies on Corepack / packageManager mismatch.
RUN npm install --global npm@10.9.8 \
 && npm ci --legacy-peer-deps --include=dev

# 2) Copy the admin source and build the standalone bundle.
COPY apps/admin ./apps/admin
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_APP_URL
RUN test -n "$NEXT_PUBLIC_API_URL" || (echo "ERROR: NEXT_PUBLIC_API_URL build-arg is required" >&2 && exit 1)
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL
ENV STANDALONE=1
ENV NEXT_TELEMETRY_DISABLED=1
# Production mode for the Next compile only — after deps are fully installed.
ENV NODE_ENV=production
RUN npm run build:standalone -w gogocash-admin

FROM node:26-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=8080
RUN groupadd --system --gid 1001 nodejs \
 && useradd --system --uid 1001 --gid nodejs nextjs

# Next.js standalone output for a workspace app: the traced server (server.js)
# and hoisted node_modules live under apps/admin/.next/standalone, mirroring the
# monorepo layout (so the entrypoint is apps/admin/server.js). Static assets and
# public/ must be copied alongside their app path.
COPY --from=builder --chown=nextjs:nodejs /app/apps/admin/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/admin/.next/static ./apps/admin/.next/static
COPY --from=builder --chown=nextjs:nodejs /app/apps/admin/public ./apps/admin/public

USER nextjs
EXPOSE 8080
CMD ["node", "apps/admin/server.js"]
