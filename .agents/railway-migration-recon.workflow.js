export const meta = {
  name: 'railway-migration-recon',
  description: 'Map the gogocash monorepo and Railway target platform to produce a Railway migration plan',
  phases: [
    { title: 'Recon' },
    { title: 'Synthesize' },
  ],
}

const ROOT = '/Users/kunanonjarat/Developer/gogocash-monorepo-migrate-monorepo'

const RECON_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['area', 'summary', 'findings', 'envVars', 'externalDeps', 'statefulConcerns', 'railwayConsiderations', 'risks', 'openQuestions'],
  properties: {
    area: { type: 'string' },
    summary: { type: 'string', description: '3-6 sentence overview of how this app is built, run, and currently deployed' },
    findings: {
      type: 'array',
      items: {
        type: 'object', additionalProperties: false,
        required: ['topic', 'detail', 'evidence'],
        properties: {
          topic: { type: 'string' },
          detail: { type: 'string' },
          evidence: { type: 'string', description: 'file path(s) and/or line refs that prove this' },
        },
      },
    },
    buildAndRun: {
      type: 'object', additionalProperties: false,
      properties: {
        buildCommand: { type: 'string' },
        startCommand: { type: 'string' },
        port: { type: 'string' },
        nodeVersion: { type: 'string' },
        dockerfile: { type: 'string', description: 'path to Dockerfile if any, else none' },
        currentHosting: { type: 'string', description: 'where it is deployed today + evidence' },
      },
    },
    envVars: {
      type: 'array',
      items: {
        type: 'object', additionalProperties: false,
        required: ['name', 'purpose', 'secret'],
        properties: {
          name: { type: 'string' },
          purpose: { type: 'string' },
          secret: { type: 'boolean' },
        },
      },
    },
    externalDeps: {
      type: 'array',
      items: {
        type: 'object', additionalProperties: false,
        required: ['name', 'type', 'notes'],
        properties: {
          name: { type: 'string' },
          type: { type: 'string', description: 'database | object-storage | auth | payments | messaging | analytics | blockchain | email | other' },
          notes: { type: 'string', description: 'how it is used; does it need migration or can it stay external' },
        },
      },
    },
    statefulConcerns: { type: 'array', items: { type: 'string' }, description: 'cron/schedulers, websockets, in-memory cache, file writes, long-poll bots, anything that breaks under multi-instance or ephemeral fs' },
    railwayConsiderations: { type: 'array', items: { type: 'string' } },
    risks: { type: 'array', items: { type: 'string' } },
    openQuestions: { type: 'array', items: { type: 'string' } },
  },
}

phase('Recon')

const reconTasks = [
  {
    area: 'apps/api (NestJS backend)',
    prompt: [
      'You are doing deployment recon on the NestJS API in a monorepo. Repo root: ' + ROOT + '. Focus ONLY on apps/api.',
      '',
      'Read and analyze (use Read/Grep/Glob, do not guess):',
      '- apps/api/Dockerfile and apps/api/cloudbuild.yaml: current build/deploy pipeline, base image, build args, exposed port, npm ci strategy, how the monorepo workspace is built.',
      '- apps/api/.env.example (and any committed .env.*): enumerate EVERY env var with purpose and whether secret.',
      '- apps/api/src/main.ts (bootstrap): port binding (process.env.PORT?), global pipes, CORS, helmet, body limits, swagger, listen host (0.0.0.0?).',
      '- apps/api/src/app.module.ts and how Mongoose/Mongo connection is configured (connection string env var), cache-manager config, @nestjs/schedule usage (cron jobs), telegraf/telegram bot setup (long-poll vs webhook), GCS storage usage (@google-cloud/storage; bucket env; the new apps/api/src/media/local-object-storage.ts), firebase-admin init (service account via env?), stripe/resend/posthog/crossmint/ethers usage.',
      '- Any file writes to local disk (multer disk storage, temp dirs) that would break on ephemeral container fs.',
      '- How config is loaded (@nestjs/config? process.env directly?).',
      '',
      'Report: build command, start command (npm run start:prod which runs node dist/main), required PORT handling, the full env var inventory, all external deps and whether each must migrate or can stay external (esp. MongoDB Atlas vs Railway Mongo, GCS vs Railway volume/R2), stateful concerns (cron, telegram long-poll), and Railway-specific considerations.',
    ].join('\n'),
  },
  {
    area: 'apps/admin (Next.js)',
    prompt: [
      'You are doing deployment recon on the Next.js admin app in a monorepo. Repo root: ' + ROOT + '. Focus ONLY on apps/admin.',
      '',
      'Read and analyze (do not guess):',
      '- apps/admin/package.json scripts: distinguish build (next build) vs build:standalone (STANDALONE=1) vs build:firebase (BUILD_FOR_FIREBASE=1, NEXT_PUBLIC_FIREBASE_STATIC=1). Which is used for production?',
      '- apps/admin/next.config.*: output mode (standalone? export?), conditional on STANDALONE / BUILD_FOR_FIREBASE env, image config, basePath, rewrites/redirects/proxy to the API.',
      '- firebase.json / .firebaserc / any apphosting.yaml: is admin on Firebase Hosting (static), Firebase App Hosting (SSR), or static export? Find evidence.',
      '- apps/admin/.env.example and any NEXT_PUBLIC_* vars: enumerate every env var, especially the API base URL var and next-auth secrets/providers.',
      '- next-auth config (under apps/admin/src): providers, secret, callback URLs, session strategy.',
      '- How admin talks to the API (axios baseURL env var?) and any server-side routes / route handlers / middleware.',
      '',
      'Report: whether admin is currently static or SSR, the exact build and start commands needed on Railway (static site vs running "next start" Node service from standalone output), full env var inventory, the API URL wiring, auth secrets, and Railway considerations (Dockerfile vs Nixpacks/Railpack for Next.js, NEXT_PUBLIC_* baked at build time).',
    ].join('\n'),
  },
  {
    area: 'apps/app (Expo / React Native + web export)',
    prompt: [
      'You are doing deployment recon on the Expo/React Native app in a monorepo. Repo root: ' + ROOT + '. Focus ONLY on apps/app.',
      '',
      'Read and analyze (do not guess):',
      '- apps/app/package.json: native build path (eas build profiles) vs web export (export:web which runs expo export --platform web producing static output). What dir does web export to (dist?)?',
      '- app.json / app.config.* / eas.json: env/config, web output config, EAS profiles, where API base URL / Firebase / Sentry / PostHog config comes from (expo-constants extra? EXPO_PUBLIC_* env vars?).',
      '- Any web hosting today (firebase.json targets for the web export? a separate Firebase site?).',
      '- apps/app/.env.example or EXPO_PUBLIC_* usage: enumerate env vars.',
      '- Whether the web export is a pure static SPA (servable by any static host such as "npx serve dist").',
      '',
      'Report: clearly separate NATIVE (stays on EAS/App Store/Play, NOT a Railway concern) from WEB EXPORT (could be a Railway static service). Give the web build command, output dir, env vars (EXPO_PUBLIC_*), and Railway considerations for hosting a static Expo web bundle.',
    ].join('\n'),
  },
  {
    area: 'monorepo infra / env / build pipeline / current providers',
    prompt: [
      'You are doing cross-cutting infra recon on a monorepo. Repo root: ' + ROOT + '. Do NOT deep-dive a single app; map the SHARED picture.',
      '',
      'Read and analyze (do not guess):',
      '- Root package.json (npm workspaces, turbo, Node >=22, packageManager npm@10.9.0), turbo.json tasks, root .dockerignore (note: apps build with context = monorepo root via -f apps/X/Dockerfile).',
      '- Whether apps/admin and apps/app have their OWN Dockerfiles (find every Dockerfile in the repo).',
      '- All committed env example files across the repo (find files named .env.example) and produce a consolidated list of which app needs which vars.',
      '- Evidence of CURRENT hosting providers: GCP (cloudbuild.yaml, Cloud Run, Artifact Registry, project id), Firebase (firebase.json, .firebaserc, hosting/app-hosting), MongoDB (Atlas connection string env var name), GCS bucket names/env, Cloudflare. Cite files.',
      '- Any shared packages/ workspace consumed by the apps (do packages/* exist? what do they export? do apps depend on them at build time, which affects Docker build context).',
      '- CI: .github/workflows (any?) what runs on push, what deploys.',
      '- Any Redis/queue/cache external service.',
      '',
      'Report: the consolidated env-var matrix (app x var), the list of Dockerfiles present vs missing, current provider inventory with evidence, monorepo build constraints for Railway (must build from root context; turbo; workspace deps), and the biggest cross-cutting migration risks.',
    ].join('\n'),
  },
  {
    area: 'Railway platform target (docs research)',
    prompt: [
      'You are researching the Railway platform to inform a migration of an npm-workspaces + Turbo MONOREPO (Node 22) containing: a NestJS API (Dockerized, MongoDB, GCS object storage, in-process @nestjs/schedule cron, a Telegram long-poll bot), a Next.js admin app, and an Expo web static export.',
      '',
      'Use the Railway MCP tools. First load them: call ToolSearch with query "select:mcp__railway__docs_search,mcp__railway__docs_fetch". Then use docs_search / docs_fetch to gather AUTHORITATIVE, current Railway guidance on:',
      '1. Deploying a MONOREPO: multiple services from one repo, setting service Root Directory and/or Dockerfile path, isolated monorepo vs shared monorepo, watch paths.',
      '2. Build options: Dockerfile vs Railpack/Nixpacks; how Railway picks; building from repo root context for a workspace (does Root Directory break monorepo workspace installs? how to handle).',
      '3. Databases on Railway: is there managed MongoDB? Railway DB templates vs database services; backups; or recommendation to keep MongoDB Atlas external. TCP proxy for external access.',
      '4. Environment variables & secrets: service variables, shared variables, reference variables (Railway uses the dollar-double-brace Service.VAR syntax), sealed variables, build-time vs runtime (important for NEXT_PUBLIC_* baked at build).',
      '5. Networking: private networking between services (internal DNS), public domains, PORT binding expectations (does Railway inject PORT? must app bind 0.0.0.0 on $PORT?), healthchecks.',
      '6. Persistent storage: Volumes (mounting, single-instance limitation) relevant if replacing GCS with local storage. Also Railway object storage / bucket support if any.',
      '7. Cron: Railway cron jobs / scheduled services vs in-process scheduler; serverless/sleeping and how it affects an in-process cron and a long-poll bot.',
      '8. Deploy mechanics: GitHub repo deploys, config-as-code (railway.json / railway.toml), CLI, environments (staging/prod), replicas, regions.',
      '',
      'Report concrete, current facts with the doc detail level needed to write a migration runbook. Note anything that is a HARD constraint (e.g., volumes do not support horizontal scaling) vs a recommendation.',
    ].join('\n'),
  },
]

const recon = await parallel(reconTasks.map((t) => () =>
  agent(t.prompt, { label: 'recon:' + t.area.split(' ')[0], phase: 'Recon', schema: RECON_SCHEMA })
))

const valid = recon.filter(Boolean)

phase('Synthesize')

const PLAN_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['serviceTopology', 'dataAndStorage', 'envStrategy', 'phasedRunbook', 'risks', 'decisionsNeeded', 'costNotes'],
  properties: {
    serviceTopology: {
      type: 'array',
      description: 'one entry per proposed Railway service',
      items: {
        type: 'object', additionalProperties: false,
        required: ['serviceName', 'sourceApp', 'buildMethod', 'buildCommand', 'startCommand', 'public', 'notes'],
        properties: {
          serviceName: { type: 'string' },
          sourceApp: { type: 'string' },
          buildMethod: { type: 'string', description: 'Dockerfile (path) | Railpack/Nixpacks | static' },
          buildCommand: { type: 'string' },
          startCommand: { type: 'string' },
          public: { type: 'boolean', description: 'gets a public domain?' },
          notes: { type: 'string' },
        },
      },
    },
    dataAndStorage: {
      type: 'array',
      items: {
        type: 'object', additionalProperties: false,
        required: ['concern', 'recommendation', 'rationale'],
        properties: { concern: { type: 'string' }, recommendation: { type: 'string' }, rationale: { type: 'string' } },
      },
      description: 'MongoDB, GCS/object storage, cache, cron, telegram bot, file writes',
    },
    envStrategy: { type: 'string', description: 'how to manage env vars across services on Railway: shared vars, reference vars, build-time vs runtime, NEXT_PUBLIC/EXPO_PUBLIC baking' },
    phasedRunbook: {
      type: 'array',
      description: 'ordered phases of the migration',
      items: {
        type: 'object', additionalProperties: false,
        required: ['phase', 'goal', 'steps', 'verification', 'rollback'],
        properties: {
          phase: { type: 'string' },
          goal: { type: 'string' },
          steps: { type: 'array', items: { type: 'string' } },
          verification: { type: 'string' },
          rollback: { type: 'string' },
        },
      },
    },
    risks: {
      type: 'array',
      items: {
        type: 'object', additionalProperties: false,
        required: ['risk', 'severity', 'mitigation'],
        properties: { risk: { type: 'string' }, severity: { type: 'string', description: 'R0|R1|R2 or high|med|low' }, mitigation: { type: 'string' } },
      },
    },
    decisionsNeeded: { type: 'array', items: { type: 'string' }, description: 'choices only the user can make' },
    costNotes: { type: 'string' },
  },
}

const allFindings = JSON.stringify(valid, null, 2)

const plan = await agent(
  [
    'You are a senior platform/DevOps engineer producing a Railway migration plan for the gogocash monorepo. Below are structured recon findings from 5 parallel analysts (3 apps + infra + Railway platform docs). Cross-check them, resolve conflicts, and design the migration.',
    '',
    'Constraints & facts to honor:',
    '- Monorepo: npm workspaces + Turbo, Node >=22, npm@10.9.0. Apps build with Docker context = REPO ROOT (-f apps/X/Dockerfile per the root .dockerignore comment).',
    '- API is NestJS, already Dockerized, uses MongoDB (Mongoose), GCS object storage, in-process @nestjs/schedule cron, Telegram long-poll bot, plus Stripe/Resend/PostHog/firebase-admin/crossmint+ethers.',
    '- Admin is Next.js (currently Firebase). App is Expo (native via EAS, OUT OF SCOPE for Railway except its static web export).',
    '',
    'Produce a concrete, adversarially-sane plan:',
    '- serviceTopology: which Railway services to create (API; admin as SSR Node vs static; optional Expo-web static; whether to run cron as a separate Railway cron service or keep in-process; whether the Telegram bot stays in the API or splits out). Use Dockerfile build where a Dockerfile exists.',
    '- dataAndStorage: MAKE A CLEAR RECOMMENDATION for MongoDB (keep Atlas vs Railway Mongo, default to keeping Atlas unless there is a strong reason), GCS object storage (keep GCS vs Railway Volume vs Cloudflare R2, note the new local-object-storage.ts), in-process cron under Railway (single instance vs separate cron), and the Telegram long-poll bot (must stay a single always-on instance, flag webhook alternative).',
    '- envStrategy: Railway shared/reference variables; CRITICAL: NEXT_PUBLIC_* and EXPO_PUBLIC_* are baked at BUILD time, so the API URL must be known before build.',
    '- phasedRunbook: ordered, low-risk phases (e.g. 1: provision project + Mongo decision + API service in staging; 2: admin; 3: DNS cutover; 4: decommission). Each phase: goal, concrete steps, verification, rollback.',
    '- risks with R0/R1/R2 severity and mitigations. Untested infra changes and any money/auth path = treat as high.',
    '- decisionsNeeded: the specific choices only the repo owner can make.',
    '- costNotes: rough Railway cost shape (per-service usage based) vs current GCP/Firebase.',
    '',
    'Be specific and honest. If recon left an open question that blocks a recommendation, surface it in decisionsNeeded rather than inventing an answer.',
    '',
    'RECON FINDINGS (JSON):',
    allFindings,
  ].join('\n'),
  { label: 'synthesize:plan', phase: 'Synthesize', schema: PLAN_SCHEMA, effort: 'high' }
)

return { recon: valid, plan }
