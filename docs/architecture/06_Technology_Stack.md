# 06 — Technology Stack

## Purpose

Records the concrete technology choices for TNPArch and, critically, *why* each was chosen over the alternatives considered. This is a decision record, not a tutorial — see `19_Decision_Log.md` for the dated log entry corresponding to each choice.

## Scope

Covers the full stack: language, frontend, backend, database, storage, email, background jobs, brochure export, testing, and CI/CD. Deployment hosting is decided in `15_Deployment_Strategy.md` because it remains an open decision pending the Secretary's input (see `18_Open_Questions.md`); this document specifies the application-level stack, which is not deployment-target-dependent.

## Stack Summary

| Concern | Choice | Status |
|---|---|---|
| Language | TypeScript (strict mode), end-to-end | Decided |
| Frontend framework | Next.js (App Router), React | Decided |
| Styling | Tailwind CSS + CSS custom properties for design tokens | Decided |
| UI primitives | shadcn/ui-style unstyled primitives, restyled to the Title Block design system | Decided |
| Backend | Next.js Route Handlers (same codebase as frontend) | Decided |
| Database | PostgreSQL | Decided |
| ORM | Prisma | Decided |
| Auth | Custom JWT (access + refresh), bcrypt | Decided |
| Object storage | S3-compatible (Cloudflare R2 recommended) | Recommended, open per brief |
| Email provider | Abstracted interface; production provider TBD | **Open decision** — see `18_Open_Questions.md` |
| Background jobs | Database-backed job table (Phase 1–2), reassess at Phase 3 | Decided for MVP |
| Brochure PDF export | Playwright (headless Chromium) | Decided |
| Brochure PPTX export | `pptxgenjs` | Decided |
| Testing | Vitest + React Testing Library, Playwright for E2E | Decided |
| CI/CD | GitHub Actions | Decided |
| Deployment hosting | TBD | **Open decision** — see `15_Deployment_Strategy.md` |

## Language: TypeScript (Strict Mode)

Chosen end-to-end (frontend, backend, scripts) for type safety across the private/public data boundary, which is the platform's single most important correctness property. Strict mode is non-negotiable — see `20_Coding_Standards.md`.

## Frontend & Backend: Next.js (App Router)

**Why Next.js over a separate SPA + API server (e.g., Vite/React + Express):**

- One codebase, one deployment, one set of environment variables — matches the modular monolith decision in `05_System_Architecture.md` and the small-team operating reality.
- Server Components let image-heavy portfolio pages (public profiles) render efficiently without shipping unnecessary client JavaScript, directly supporting `NFR-PERF-02`.
- Route Handlers provide a conventional REST-style API surface (see `10_API_Architecture.md`) without a second framework.
- Built-in image optimization is a direct fit for a portfolio-first, image-heavy product.

**Why not a heavier framework (e.g., NestJS backend + separate frontend):** would add operational surface area (two deployments, two sets of secrets, cross-origin auth complexity) with no benefit at this team size and scale.

## Styling & UI: Tailwind CSS + Custom Design Tokens

Tailwind is used as a utility layer, but all color, spacing, and typography values are defined once as CSS custom properties matching the design system (see `12_Design_System.md`), not as ad hoc Tailwind classes with inline hex values. Base component primitives follow the shadcn/ui pattern (own the component code, not a black-box library dependency) so the Title Block motif and blueprint aesthetic can be fully customized rather than fought against a pre-styled component kit.

## Database: PostgreSQL + Prisma

**Why PostgreSQL:** the data model is fundamentally relational (students belong to batches, applications reference students and drives, approval workflows reference actors and timestamps) with real need for transactional integrity around the approval workflow. A document database would fight this shape.

**Why Prisma:** type-safe query results generated directly from the schema, migrations as version-controlled files, and a schema file that doubles as living documentation of the data model (see `08_Database_Design.md`).

## Authentication: Custom JWT + Refresh Tokens + bcrypt

Built directly rather than via a third-party auth-as-a-service (e.g., Auth0, Clerk), because:

- The brief mandates specific mechanics (bcrypt cost 12+, short-lived JWT + refresh tokens) that map to a straightforward, well-understood custom implementation.
- Four distinct roles with scoped permissions (Coordinator → Batch scope) are easier to model directly against the application's own data than to bolt onto a generic third-party identity product.
- Avoids an external dependency and recurring cost for a department-scale user base.

Full mechanics in `14_Security_Architecture.md`.

## Object Storage: S3-Compatible (Cloudflare R2 recommended)

Resumes, portfolio images, and brochure assets are binary files that do not belong in the relational database. An S3-compatible object store is used, with signed URLs for controlled access (e.g., a recruiter's resume download link is time-limited, not a permanently public URL for a Private-adjacent asset).

**Recommendation: Cloudflare R2** — S3-compatible API (no code lock-in to a proprietary SDK), no egress fees (relevant for a portfolio-heavy, image-dense product), competitive storage pricing. AWS S3 remains a drop-in alternative if the department has existing AWS infrastructure or preference.

## Email Provider: Abstracted, Production Choice Open

The brief explicitly lists this as an open decision (college mail server vs. SendGrid vs. Resend vs. Amazon SES). The application defines a single `EmailProvider` interface (send a templated message to an address); the concrete implementation is swapped via environment configuration. Local development uses a console/log-based provider so no external dependency is needed to develop the feature.

**Recommendation pending confirmation:** Resend, for its straightforward transactional-email DX and reasonable pricing at low volume; the college mail server remains viable if the department prefers to keep email fully in-house and its SMTP relay supports the required send volume without being flagged as bulk/spam. See `18_Open_Questions.md`.

## Background Jobs: Database-Backed Queue (MVP)

A simple `Job` table (type, payload, status, attempts, run_at) polled by a scheduled task handles email sending and, later, brochure generation — avoiding a Redis/queue-broker dependency at MVP scale. This is explicitly a Phase 1–2 decision, revisited if Phase 3 brochure generation volume/latency needs outgrow it (see Future Considerations).

## Brochure Export: Playwright + pptxgenjs (Phase 3)

- **PDF**: an HTML/CSS brochure template is rendered by a headless Chromium instance (Playwright) to a print-ready PDF — this reuses the same design system components as the web app rather than maintaining a second templating engine.
- **PPTX**: `pptxgenjs` builds a native, editable PowerPoint file with real text and image objects (not a flattened screenshot), satisfying FR-BROCH-04/05's editability requirement.

## Testing: Vitest + React Testing Library + Playwright

- **Vitest**: unit and integration tests for Domain/Application layer logic (eligibility rules, approval workflow use cases) — fast, TypeScript-native.
- **React Testing Library**: component-level tests for UI, focused on behavior over implementation detail.
- **Playwright**: end-to-end tests for critical flows (login, profile approval, recruiter search) — also reused as the brochure PDF rendering engine, so the team maintains only one headless-browser dependency.

Full strategy in `21_Testing_Strategy.md`.

## CI/CD: GitHub Actions

Runs lint, type-check, tests, and `npm audit`/dependency scanning on every pull request; blocks merge on failure. Deployment pipeline detailed in `15_Deployment_Strategy.md` once the hosting target is confirmed.

## Assumptions

- The department has (or can obtain) a private GitHub repository for version control; no other VCS is assumed.
- Node.js LTS is the runtime target; exact version pinned in `07_Repository_Structure.md`'s tooling configuration once implementation begins.
- No existing AWS/GCP/Azure account exists at the department level; Cloudflare R2 is recommended partly because it has no minimum commitment and a generous free tier suited to piloting.

## Future Considerations

- If email volume or brochure PDF rendering load grows meaningfully (e.g., multi-department adoption), migrate background jobs from the DB-backed queue to BullMQ + Redis, and consider extracting brochure rendering into a separate worker process per `05_System_Architecture.md`'s Future Considerations.
- If the college's own mail infrastructure is confirmed as the email provider, the `EmailProvider` interface should be implemented against its SMTP relay directly rather than a third-party API.
