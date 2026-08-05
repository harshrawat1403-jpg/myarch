# System Architecture

A single, current reference for how TNPArch is built and deployed. Where the frozen `docs/architecture/*` documents describe the original Phase 1 design intent, this document describes what actually exists today, including everything added across the Notification Architecture, Background Job Processing System, Production Readiness Sprint, and this deployment phase.

## Overview

TNPArch is a **Modular Monolith**: one Next.js 16 (App Router) application, one PostgreSQL database, deployed as two processes (`web` and `worker`) built from the same codebase. It is not microservices — every module runs in the same process space and shares one database — but internally it is organized as if it could be split apart later, via strict per-module boundaries.

```
                         ┌─────────────────────────────┐
                         │      PostgreSQL (single      │
                         │   database, all modules)     │
                         └───────────────┬──────────────┘
                                          │
                     ┌────────────────────┼────────────────────┐
                     │                    │                    │
              ┌──────▼──────┐      ┌──────▼──────┐             │
              │   web        │      │   worker     │            │
              │  (Next.js,   │      │ (job poller, │            │
              │  stateless,  │      │  stateless,  │            │
              │  scale out   │      │  scale out   │            │
              │  behind a    │      │  by running  │            │
              │  load        │      │  more        │            │
              │  balancer)   │      │  processes)  │            │
              └──────────────┘      └──────────────┘
```

## Module map and dependency graph

Eight modules under `src/modules/`, each internally layered `domain/ → application/ → infrastructure/ → presentation/` (Clean Architecture), with an ESLint rule mechanically preventing any module from importing another's internals — only a module's `index.ts` may be imported from outside it.

```
auth (no module dependencies — the one module everything else may depend on)
  ← batches
      ← students
          ← profiles ← notifications ← jobs
              ← recruiters
              ← exports (also ← batches)
```

This is a strict DAG (verified in the Production Readiness Sprint) — no circular dependencies exist. `jobs` is a deliberately generic leaf module with zero dependencies on any other module, so any future module can dispatch background work through it without creating a new dependency edge back toward business logic.

| Module | Responsibility |
|---|---|
| `auth` | Authentication (bcrypt + JWT), session/refresh-token lifecycle, the centralized RBAC permission matrix, the `withAuth` route-protection middleware |
| `batches` | Batch (cohort/year) CRUD and lifecycle status |
| `students` | Student roster CRUD, private-field management, confidential document references, archive/restore |
| `profiles` | The two-profile workflow: editable draft vs. immutable published profile, the approval state machine |
| `recruiters` | The recruiter-facing directory/search/profile/resume surface — structurally isolated from admin data (see below) |
| `exports` | Administrative CSV exports (student directory, batch report, public placement dataset, recruiter directory) |
| `notifications` | The channel-agnostic `NotificationService` abstraction; Version 1.0 has one channel (email) and one concrete provider (a console logger) |
| `jobs` | The generic Background Job Processing System — dispatcher, registry, handler abstraction, worker, retry/backoff, dead-lettering |

## Data flow: the two-profile workflow (representative end-to-end path)

```
Student edits   →  StudentPublicProfileDraft (mutable working copy)
Student submits →  draft.status = PENDING_REVIEW
Reviewer (Secretary/Coordinator-in-scope) approves
   → StudentPublicProfile row is created (immutable, published)
   → NotificationService.notify() is called
       → a Notification row is written (status PENDING)
       → a SEND_NOTIFICATION Job is enqueued (status PENDING)
   → the approve request returns immediately — sending is asynchronous
JobWorker (separate process) polls, atomically claims the job
   → renders the email template, calls the EmailProvider
   → Notification marked SENT, Job marked COMPLETED
Recruiter directory / exports read ONLY from StudentPublicProfile
   → a student who was never approved has no row there at all —
     "approved only" is a structural guarantee, not a filter to remember
```

Every step above was executed against a real PostgreSQL instance during this deployment phase's validation (see `DEPLOYMENT_GUIDE.md` and the Production Readiness Report) — not just asserted by unit tests.

## Privacy architecture

Student data has three separate tables, never a boolean "is this visible" flag: `StudentPrivateProfile` (CGPA, backlog, contact info, internal remarks — never reachable by any recruiter-facing query), `StudentPublicProfileDraft` (in-progress, reviewer-visible, never recruiter-visible), and `StudentPublicProfile` (published, the only table recruiter/export queries are ever rooted at). Every external-facing shape (the recruiter DTO, all four export rows, the notification payload) is built by an explicit, field-by-field mapping function — never an object spread — each backed by a regression test that feeds it a deliberately "poisoned" row and asserts none of the extra fields survive.

## Background Job Processing System

`jobs` is a generic, reusable queue, not notification-specific:

- **Dispatcher** (`JobDispatcher`) — the only thing a producer module depends on: `dispatch(type, payload, options)`.
- **Registry** (`JobRegistry`) — handlers register under a type string; the worker never has a switch statement over job types.
- **Handler** (`JobHandler`) — `handle(payload)` plus an optional `onPermanentFailure(payload, error)` hook.
- **Worker** (`JobWorker`) — polls, atomically claims a batch via a parameterized `UPDATE ... WHERE id IN (SELECT ... FOR UPDATE SKIP LOCKED) RETURNING *` (the standard Postgres job-queue pattern — this exact query was executed against a real database in this phase and correctly prevented double-claiming), executes sequentially, retries transient failures with exponential backoff + jitter, dead-letters exhausted/unknown-type jobs, and shuts down gracefully (finishes any in-flight job before stopping).

Today exactly one job type is registered (`SEND_NOTIFICATION`, owned by the `notifications` module). Adding another (CSV export generation, PDF rendering, analytics aggregation, data cleanup) requires only: a new type string, a `JobHandler` implementation, a `jobRegistry.register(...)` call from that module's own composition root, and one import line in `scripts/run-worker.ts` — no change to the `jobs` module itself.

## Deployment topology

```
                    ┌────────────────────┐
   HTTPS traffic →  │  reverse proxy /   │
                    │  platform edge     │  (TLS termination — see DEPLOYMENT_GUIDE.md)
                    └─────────┬──────────┘
                              │ HTTP
                    ┌─────────▼──────────┐
                    │   web (N replicas)  │  next start, stateless
                    └─────────┬──────────┘
                              │
                    ┌─────────▼──────────┐        ┌──────────────────┐
                    │     PostgreSQL      │◄───────┤ worker (N procs) │
                    └────────────────────┘        └──────────────────┘
```

`web` holds no session state in memory beyond a single request (the access token lives in the browser's JS memory, never a cookie; the refresh token is an httpOnly cookie validated against the database on each refresh) — any replica can serve any request. `worker` instances are also interchangeable; the database-level atomic claim is what makes running more than one safe.

## Technology stack

Next.js 16 (App Router, Turbopack) · React 19 · TypeScript 5.7 (strict) · PostgreSQL 16+ via Prisma 6 · Tailwind CSS v4 · bcryptjs + jsonwebtoken for auth · Zod for input validation · Vitest + React Testing Library for tests (514 tests, 63 files) · tsx for running the worker/seed scripts without a separate compile step.

## Known limitations (carried forward, not fixed in this phase — see `TECHNICAL_DEBT.md` for full detail)

- Object storage (resumes, portfolio files, confidential documents) is not implemented — the schema and application layer only ever handle metadata *references* to files; actual upload/storage integration is a Phase 2+ item.
- Only a console/dev-logger email provider exists; a real provider (SMTP/Resend/SES) is a pending decision plus a small, additive implementation.
- List endpoints (student search, recruiter directory search) return unbounded result sets — acceptable at the documented department-scale roster size, not yet paginated.
- The retention policy for graduated batches is undecided.

## Validation record for this document

The module dependency graph, the profile-approval-to-notification data flow, and the job-claiming query were all exercised against a real PostgreSQL 16.4 instance during this deployment phase (see `DEPLOYMENT_GUIDE.md`'s validation section and the Production Readiness Report for the full trace of commands and results).
