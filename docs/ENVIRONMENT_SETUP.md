# Environment Setup

Covers both local development setup and the full production environment variable reference. `.env.example` is the source file this document explains — copy it to `.env.local` for local development (already gitignored) or set the equivalent variables directly in your hosting platform's environment configuration for production.

## Local development setup

1. **Install prerequisites:** Node.js ≥ 20, npm, and a PostgreSQL 16+ instance reachable locally (a Docker container, a portable/standalone install, or a system install — anything that gives you a connection string).
2. **Install dependencies:** `npm install`.
3. **Configure environment:** `cp .env.example .env.local`, then fill in at minimum `DATABASE_URL`, `JWT_ACCESS_SECRET`, and `JWT_REFRESH_SECRET` (see generation instructions below).
4. **Run migrations:** `npm run db:migrate` (this is `prisma migrate dev` — creates/updates `prisma/migrations/` interactively; use `db:deploy` instead in any non-development environment).
5. **Seed development data (optional but recommended):** `npm run db:seed` — creates one account per role (Secretary, Coordinator, Recruiter, three Students in different profile states) so you can log in and exercise every flow immediately. **Never run this against a database containing real student data** — see the loud warning in `prisma/seed.ts` and `ADMIN_GUIDE.md`.
6. **Start the app:** `npm run dev`.
7. **Start the worker** (in a second terminal, if you're testing notifications): `npm run worker` (persistent) or `npm run worker:once` (single pass).

## Generating secrets

`JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` must each be long, random, and **different from each other** (`src/config/env.ts` enforces both a minimum length and that they differ — the app will refuse to start otherwise). Generate them with:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64'))"
```

Run it twice for two distinct values. Never reuse a value across environments (dev/staging/production should each have their own), and never commit a real value to source control — `.env`, `.env.local`, and `.env.*.local` are all gitignored for exactly this reason.

## Full environment variable reference

| Variable | Required | Default | Notes |
|---|---|---|---|
| `DATABASE_URL` | **Yes** | — | PostgreSQL connection string, Prisma format (`postgresql://user:password@host:port/database`) |
| `JWT_ACCESS_SECRET` | **Yes** | — | ≥32 characters; must differ from `JWT_REFRESH_SECRET` |
| `JWT_REFRESH_SECRET` | **Yes** | — | ≥32 characters; must differ from `JWT_ACCESS_SECRET` |
| `JWT_ACCESS_TTL` | No | `15m` | Access token lifetime |
| `JWT_REFRESH_TTL` | No | `30d` | Refresh token lifetime |
| `BCRYPT_COST_FACTOR` | No | `12` | Enforced minimum is 12 — the app refuses to start below it (NFR-SEC per `docs/security/14_Security_Architecture.md`) |
| `STORAGE_ENDPOINT` / `STORAGE_REGION` / `STORAGE_BUCKET` / `STORAGE_ACCESS_KEY_ID` / `STORAGE_SECRET_ACCESS_KEY` | No | empty | Reserved for the object-storage integration (resumes/portfolio files) — **not yet implemented**; the app runs fully without these today (see `SYSTEM_ARCHITECTURE.md`'s known limitations) |
| `EMAIL_PROVIDER` | No | `console` | `console` (dev logger, the only one implemented) \| `resend` \| `smtp` (both accepted by validation but throw "not implemented" at first use — see `DEPLOYMENT_GUIDE.md`) |
| `EMAIL_FROM_ADDRESS` | No | `noreply@myarch.in` | |
| `RESEND_API_KEY` | No | empty | Only consulted once a Resend implementation exists |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASSWORD` | No | empty | Only consulted once an SMTP implementation exists |
| `JOB_WORKER_POLL_INTERVAL_MS` | No | `2000` | How often the worker polls when idle |
| `JOB_WORKER_BATCH_SIZE` | No | `5` | Max jobs claimed per poll |
| `APP_BASE_URL` | No | `http://localhost:3000` | Used to build links in emails |
| `NODE_ENV` | No | `development` | **Must be `production` in production** — controls the refresh-token cookie's `Secure` flag among other things |

All validation happens in `src/config/env.ts` via Zod, evaluated lazily on first real use (not at process start) — an invalid or missing required variable fails loudly the first time something actually needs it, with a specific error naming the variable, not a generic crash.

## Per-environment differences

| | Development | Staging | Production |
|---|---|---|---|
| `DATABASE_URL` | Local/portable Postgres | A separate staging database — never share with production | Managed production database |
| `EMAIL_PROVIDER` | `console` | `console` (or the real provider, once implemented, pointed at a test inbox) | The real, chosen provider only once implemented |
| `JWT_*_SECRET` | Any value meeting the length/distinctness rule | A distinct value from dev and prod | A distinct, securely generated and stored value |
| `NODE_ENV` | `development` | `production` | `production` |
| Seed data (`npm run db:seed`) | Yes, freely | Only into a scratch/throwaway staging DB | **Never** |

## Verifying your setup

```bash
npm run db:generate   # prisma generate — should succeed silently
npm run typecheck     # tsc --noEmit — 0 errors expected
npm test              # vitest run — 514/514 expected
npm run build         # next build — should complete and list all routes
curl http://localhost:3000/api/health         # {"status":"ok",...}
curl http://localhost:3000/api/health/ready   # {"status":"ok","checks":{"database":"ok"}}
```

Every command above was run successfully in this validation pass against a real PostgreSQL instance — if any of them fail in your environment, the mismatch is almost always `DATABASE_URL` (wrong host/port/credentials) or a missing/too-short JWT secret.
