# TNPArch — Training & Placement Portal

**Department of Architecture & Planning, VNIT Nagpur**
Version 1.0.0 — production-ready baseline release.

A private, department-owned platform replacing WhatsApp/Excel/email-based placement coordination with a single system of record — built around a strict separation between a student's private academic data and their public, recruiter-facing profile.

## Status

Version 1.0 is feature-complete and has passed implementation, testing, security, performance, accessibility, and production-readiness review. See `docs/CHANGELOG.md` for the full history and `docs/PRODUCTION_CHECKLIST.md` for the current go/no-go assessment.

## What's implemented

Eight modules, each following Clean Architecture (`domain/application/infrastructure/presentation`) inside a single Next.js Modular Monolith:

| Module | Responsibility |
|---|---|
| `auth` | Authentication, session/refresh-token lifecycle, centralized RBAC |
| `batches` | Batch (cohort/year) management |
| `students` | Student roster, private-field management, confidential document references |
| `profiles` | The two-profile workflow — editable draft vs. immutable published profile, approval state machine |
| `recruiters` | The structurally isolated recruiter-facing directory/search/profile/resume surface |
| `exports` | Administrative CSV exports (student directory, batch report, public placement dataset, recruiter directory) |
| `notifications` | Channel-agnostic notification abstraction (email today) |
| `jobs` | Generic background job processing (dispatcher, registry, worker, retry/backoff, dead-lettering) |

Full architecture detail: `docs/SYSTEM_ARCHITECTURE.md`. Full endpoint reference: `docs/API_REFERENCE.md`.

## Quick start (local development)

```bash
npm install
cp .env.example .env.local        # fill in DATABASE_URL and JWT secrets — see docs/ENVIRONMENT_SETUP.md
npm run db:migrate                # applies prisma/migrations/ to your database
npm run db:seed                   # optional — creates one dev account per role
npm run dev                       # http://localhost:3000
npm run worker                    # in a second terminal, if testing notifications
```

Full setup instructions, every environment variable, and secret-generation guidance: `docs/ENVIRONMENT_SETUP.md`.

## Testing and validation

```bash
npm run typecheck   # tsc --noEmit
npm test            # vitest run
npm run lint         # eslint .
npm run build        # next build (production)
npm audit
```

514 automated tests across 63 test files, 0 TypeScript errors, 0 lint errors, 0 dependency vulnerabilities. Full detail: `docs/ARCHITECTURE_REVIEW.md`, `docs/SECURITY_AUDIT.md`, `docs/PERFORMANCE_REVIEW.md`.

## Deployment

Packaged as two Docker images (`web` and `worker`, one `Dockerfile`, two build targets) plus a managed PostgreSQL database — runs on any Docker-compatible host. Full instructions: `docs/DEPLOYMENT_GUIDE.md`. Operational runbook: `docs/OPERATIONS_GUIDE.md`. Backup/restore: `docs/BACKUP_AND_RECOVERY.md`.

## Documentation map

| Document | For |
|---|---|
| `docs/README.md` | Full documentation index (product vision, requirements, frozen architecture/security/design specs) |
| `docs/CHANGELOG.md` | Complete implementation history, milestone by milestone |
| `docs/SYSTEM_ARCHITECTURE.md` | Current architecture, module map, data flow |
| `docs/API_REFERENCE.md` | Every endpoint, method, role requirement, and response shape |
| `docs/ADMIN_GUIDE.md` | For the Secretary/Coordinators using the dashboard day to day |
| `docs/ENVIRONMENT_SETUP.md` | Local dev setup and full environment variable reference |
| `docs/DEPLOYMENT_GUIDE.md` | How to deploy to production |
| `docs/OPERATIONS_GUIDE.md` | Running it day to day — health checks, logs, troubleshooting |
| `docs/BACKUP_AND_RECOVERY.md` | Backup schedule, restore procedure, disaster recovery |
| `docs/ARCHITECTURE_REVIEW.md`, `docs/SECURITY_AUDIT.md`, `docs/PERFORMANCE_REVIEW.md` | Findings from the pre-release audit passes |
| `docs/TECHNICAL_DEBT.md` | Every known gap and deferred decision, with its trigger for revisiting |
| `docs/PRODUCTION_CHECKLIST.md` | The go/no-go reference for deploying against real student data |

## Known operational prerequisites before go-live

Not blockers in the code — decisions that belong to the department, not this repository:

- Hosting platform (any Docker-compatible host works; none has been designated yet).
- Production email provider (only a development/logging provider is implemented today).
- A tested backup schedule against the live production database.

Full detail: `docs/PRODUCTION_CHECKLIST.md`.

## License

Private, unpublished software owned by the Department of Architecture & Planning, VNIT Nagpur. Not licensed for external use or redistribution.
