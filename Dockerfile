# syntax=docker/dockerfile:1
#
# GoGoCash admin (Next.js 16, standalone output) → Cloud Run.
# Makes the admin reproducibly buildable from the repo (the prod `admin` service
# was console-configured with no Dockerfile).
#
# NEXT_PUBLIC_API_URL is inlined by Next at build time. It defaults to the
# STAGING API so the admin talks to the real staging backend instead of the
# in-process mock (the long-standing "mock-by-default" blocker). For other
# environments pass `--build-arg NEXT_PUBLIC_API_URL=...`.

<<<<<<< Updated upstream
FROM node:22-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

=======
>>>>>>> Stashed changes
FROM node:22-slim AS builder
WORKDIR /app
# Copy the full source BEFORE install: a postinstall script
# (scripts/patch-apexcharts-border-radius.mjs) runs during `npm ci` and needs it.
COPY . .
ARG NEXT_PUBLIC_API_URL=https://api-staging.gogocash.co
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV STANDALONE=1
ENV NEXT_TELEMETRY_DISABLED=1
# --legacy-peer-deps: the lockfile carries a peerOptional conflict
# (@types/node vs vite) that strict `npm ci` rejects; the API repo uses it too.
RUN npm ci --legacy-peer-deps
RUN npm run build:standalone

FROM node:22-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=8080
RUN groupadd --system --gid 1001 nodejs \
 && useradd --system --uid 1001 --gid nodejs nextjs
# Next.js standalone output: server.js + traced node_modules live in .next/standalone;
# static assets and public/ must be copied alongside it.
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
USER nextjs
EXPOSE 8080
CMD ["node", "server.js"]
