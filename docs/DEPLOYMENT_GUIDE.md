# Deployment Guide

**Audience:** whoever deploys and maintains TNPArch in production.
**Last validated:** 2026-08-06, against a real PostgreSQL 16.4 instance (see "How this guide was validated" at the end).

## Platform choice

`docs/planning/18_Open_Questions.md` (Q1) left the hosting platform as an open decision. This guide makes it concrete: **the application is packaged as two Docker images** (`web` and `worker`, both built from the single root `Dockerfile`) **plus a managed PostgreSQL database**. This runs unchanged on any Docker-compatible host — a managed container platform (Render, Railway, Fly.io, AWS App Runner/ECS) or a plain VPS with `docker compose`. Nothing below is vendor-specific except the two short "if you're using X" notes.

Why Docker rather than committing to one vendor: it's the one deployment shape every realistic option supports, it's exactly what was built and validated in this phase, and it doesn't foreclose changing hosting providers later without touching the application.

## Components to deploy

| Component | What it is | How it runs |
|---|---|---|
| `web` | The Next.js application (UI + all `/api/*` routes) | `Dockerfile` target `web` — `node server.js`, listens on `$PORT` (default 3000) |
| `worker` | The background job processor (notifications today; extensible to more job types) | `Dockerfile` target `worker` — `npx tsx scripts/run-worker.ts`, a long-running process. `--once` mode also exists for a scheduler/cron-triggered single pass instead of a persistent process — use whichever your platform supports |
| PostgreSQL 16+ | The database | A managed instance (recommended) — Neon, Supabase, Render Postgres, Railway Postgres, AWS RDS, or your own — or a `postgres` container per `docker-compose.yml` on a self-hosted VPS |

`web` and `worker` are stateless and can each be scaled to multiple instances independently — `web` behind a load balancer, `worker` as multiple processes polling the same job queue (the atomic `FOR UPDATE SKIP LOCKED` claim in `PrismaJobRepository` is what makes that safe; see `SYSTEM_ARCHITECTURE.md`).

## Prerequisites

- A PostgreSQL 16+ database reachable from wherever `web`/`worker` will run, with its connection string in Prisma format.
- Generated production secrets for `JWT_ACCESS_SECRET`/`JWT_REFRESH_SECRET` (see `ENVIRONMENT_SETUP.md` — never reuse a development value).
- A decision on the email provider (`EMAIL_PROVIDER`). Only `console` (dev logger) is implemented today — see "Known limitation" below.
- Docker installed, if building locally before pushing to a registry.

## Step-by-step deployment

### 1. Build the images

```bash
docker build --target web    -t <registry>/tnparch-web:<tag>    .
docker build --target worker -t <registry>/tnparch-worker:<tag> .
docker push <registry>/tnparch-web:<tag>
docker push <registry>/tnparch-worker:<tag>
```

On a platform that builds from your Dockerfile directly (Render, Railway), point it at this repository and specify the build target (`web` or `worker`) per service instead of pushing images yourself.

### 2. Provision the database

Create the PostgreSQL instance (managed or self-hosted) and note its connection string. No manual schema setup is needed — migrations handle that in the next step.

### 3. Configure environment variables

Set every variable in `.env.example` on both the `web` and `worker` services (worker doesn't need `APP_BASE_URL`/storage variables, but it's harmless to set them everywhere). Full reference: `ENVIRONMENT_SETUP.md`. The two that must never be skipped or reused from development:

- `DATABASE_URL` — the production database's connection string.
- `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` — freshly generated, long, random, and different from each other.

### 4. Run database migrations

**Before starting `web` or `worker` for the first time** (and again after every deploy that includes a schema change):

```bash
docker run --rm -e DATABASE_URL=<production-url> <registry>/tnparch-web:<tag> npx prisma migrate deploy
```

`prisma migrate deploy` (not `migrate dev`) is the production command — it applies whatever is already committed under `prisma/migrations/` without prompting or generating a new migration. This was run against a real PostgreSQL 16.4 instance in this validation pass and applied cleanly (see "How this guide was validated").

### 5. Start the services

Start `web` (listening on `$PORT`) and `worker` (a persistent process, or scheduled via `--once` — see the components table above). On `docker compose` (self-hosted VPS path):

```bash
cp .env.example .env.production   # fill in real values
docker compose --env-file .env.production up -d --build
docker compose exec web npx prisma migrate deploy
```

### 6. Verify health

```bash
curl https://<your-domain>/api/health         # liveness — process is up
curl https://<your-domain>/api/health/ready   # readiness — database is reachable
```

Both were validated locally against a real database in this phase (`{"status":"ok",...}` and `{"status":"ok","checks":{"database":"ok"}}` respectively). Wire your platform's health-check / load-balancer target to `/api/health/ready` — it's the one that actually confirms the instance can serve real requests, not just that the process started.

### 7. Verify the worker is processing jobs

```bash
docker logs <worker-container>   # expect structured JSON lines: {"event":"worker.started",...}
```

Trigger something that enqueues a notification (e.g. approve a student's profile draft as Secretary/Coordinator) and confirm a `job.started` → `job.completed` pair appears in the worker's logs within one poll interval (`JOB_WORKER_POLL_INTERVAL_MS`, default 2s).

### 8. HTTPS

This application does not terminate TLS itself — `next start` serves plain HTTP on `$PORT`. **HTTPS must be provided by the platform or a reverse proxy in front of it** (every managed platform listed above terminates TLS automatically for you; on a self-hosted VPS, put nginx/Caddy/Traefik in front of the `web` container). Once HTTPS is in place:

- Set `NODE_ENV=production` — this is what makes the refresh-token cookie's `Secure` flag active (`src/modules/auth/presentation/cookies.ts`); without it, the cookie is sent over plain HTTP too, which must never happen in production.
- Redirect HTTP → HTTPS at the proxy/platform level (NFR-SEC-08) — this application does not and should not implement that redirect itself; it's a routing-layer concern, not an application concern.

## Rollback

Both images are tagged (`<tag>` above) — rolling back is redeploying the previous tag for `web` and `worker`. **Database migrations are not automatically reversible** — `prisma migrate deploy` only applies forward. If a deploy included a schema migration and needs to be rolled back, restore from the most recent backup taken before that migration ran (see `BACKUP_AND_RECOVERY.md`) rather than attempting to hand-write a down-migration, unless the migration is trivially additive (e.g. a new nullable column, safe to leave in place while rolling back application code).

## Known limitation carried into production

Only `EMAIL_PROVIDER=console` (a logger, not a real send) is implemented. Setting `EMAIL_PROVIDER=resend` or `smtp` is accepted by configuration validation but the application will throw a clear "not implemented" error at startup of any code path that tries to send — **do not deploy to production with real students relying on email notifications until a real provider is implemented** (`docs/planning/18_Open_Questions.md` Q2 is the open decision blocking this; implementing the chosen provider is an addition to `createEmailProvider()`'s factory switch only, per `SYSTEM_ARCHITECTURE.md`).

## How this guide was validated

Every command in this guide that could be run without a production platform account was actually run, in this development environment, against a real PostgreSQL 16.4 instance (not mocked, not simulated):

- `npx prisma migrate deploy` — applied the full schema to a clean database in one pass.
- `npm run build` — produced the standalone production bundle used by the `web` Docker target.
- `npm run start` — ran the actual production server; `/api/health` and `/api/health/ready` both returned healthy against the real database.
- `npx tsx scripts/run-worker.ts --once` — claimed and processed a real job end to end (see `OPERATIONS_GUIDE.md` for the full trace).
- Login, profile approval, exports, and the recruiter portal were all exercised over real HTTP against the running server — see `SYSTEM_ARCHITECTURE.md`'s validation notes and the final Production Readiness Report for the full results.

Not validated in this pass: an actual deploy to a named hosting platform (no account/credentials for one exists in this environment) and HTTPS termination (requires a real domain/certificate). Both are platform-account-dependent steps outside what a development environment can self-certify — everything upstream of them (the images, the migration, the health checks, the app itself) is proven to work.
