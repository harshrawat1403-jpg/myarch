# 07 — Repository Structure

## Purpose

Defines how the codebase is organized on disk so that the feature-first, Clean Architecture principles in `05_System_Architecture.md` are visible and enforceable in the actual folder layout, not just described in prose.

## Scope

Covers the top-level repository layout and the internal structure of a feature module. Does not itself contain code — this document is written ahead of implementation so that when Claude Code begins building, the structure is already agreed rather than improvised file-by-file.

## Top-Level Layout

```
tnparch/
├── docs/                        # This documentation set
├── prisma/
│   ├── schema.prisma             # Single source of truth for the data model
│   ├── migrations/               # Version-controlled schema migrations
│   └── seed.ts                   # Seed script for local/dev data
├── src/
│   ├── app/                      # Next.js App Router: routes, layouts, pages
│   │   ├── (public)/              # Unauthenticated routes (login, landing)
│   │   ├── (student)/             # Student-facing authenticated routes
│   │   ├── (admin)/               # Secretary/Coordinator authenticated routes
│   │   ├── (recruiter)/           # Recruiter-facing authenticated routes
│   │   └── api/                   # Route Handlers, grouped by module
│   ├── modules/                  # Feature-first modules (see below)
│   │   ├── auth/
│   │   ├── batches/
│   │   ├── students/
│   │   ├── profiles/
│   │   ├── admin/
│   │   ├── recruiters/
│   │   ├── notifications/
│   │   ├── exports/
│   │   ├── companies/            # Phase 2
│   │   ├── drives/                # Phase 2
│   │   ├── applications/         # Phase 2
│   │   ├── analytics/            # Phase 2
│   │   ├── brochure/              # Phase 3
│   │   ├── studio-import/        # Phase 3
│   │   ├── feedback-bank/        # Phase 3
│   │   ├── alumni/                # Phase 3
│   │   └── audit/                 # Cross-cutting
│   ├── components/               # Shared, cross-module UI primitives (Title Block, buttons, inputs)
│   ├── design-system/             # Design tokens, theme, typography scale
│   ├── lib/                       # Cross-cutting technical utilities (not business logic)
│   └── config/                    # Environment/config loading, validated at startup
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
├── scripts/                      # One-off ops scripts (data migration, backfills)
├── .github/workflows/            # CI/CD pipelines
├── .env.example                  # Documented environment variables, no real secrets
└── package.json
```

## Anatomy of a Feature Module

Every folder under `src/modules/<feature>` follows the same internal shape, mirroring the Clean Architecture layers from `05_System_Architecture.md`:

```
modules/profiles/
├── domain/
│   ├── entities.ts                # PublicProfile, PublicProfileDraft types
│   ├── rules.ts                   # Pure business rules (e.g. draft eligibility)
│   └── errors.ts                  # Domain-specific error types
├── application/
│   ├── use-cases/
│   │   ├── save-profile-draft.ts
│   │   ├── approve-profile-draft.ts
│   │   └── reject-profile-draft.ts
│   └── ports/
│       ├── profile-repository.ts  # Interface, implemented by infrastructure
│       └── notifier.ts             # Interface for triggering notifications
├── infrastructure/
│   ├── prisma-profile-repository.ts  # Implements profile-repository.ts via Prisma
│   └── mappers.ts                     # Prisma model ↔ Domain entity mapping
├── presentation/
│   ├── components/                # React components specific to this feature
│   └── route-handlers/            # Thin handlers calling use-cases, used by app/api
└── index.ts                        # Public exports — the only thing other modules may import
```

**Enforced boundary:** other modules may only import from a feature module's `index.ts`, never reach into its `domain/`, `application/`, or `infrastructure/` folders directly. This is enforced via ESLint import restrictions (`no-restricted-imports` / a project-specific plugin) so the boundary survives beyond code review vigilance — see `20_Coding_Standards.md`.

## Why Route Groups Mirror Roles

The `(student)`, `(admin)`, `(recruiter)` route groups in `app/` are a deliberate mirror of the RBAC model in `09_User_Roles_and_Permissions.md`. This keeps role-specific layouts (navigation, available actions) physically separated, reducing the chance that a Secretary-only page accidentally renders inside a student-facing layout.

## Naming Conventions

- Files: `kebab-case.ts` / `kebab-case.tsx`.
- React components: `PascalCase` export names, file name matches the component (`TitleBlockCard.tsx` exports `TitleBlockCard`).
- Use cases: named as verbs (`ApproveProfileDraft`, not `ProfileApprovalService`), reflecting a single action.
- Prisma models: `PascalCase` singular (`Student`, `PlacementDrive`), matching `08_Database_Design.md`.

## Assumptions

- A single Next.js application repository is sufficient through Phase 3; no monorepo tooling (Turborepo/Nx) is introduced unless the module count or team size grows enough to justify it (see `05_System_Architecture.md` Future Considerations).
- `tests/` is organized by test type rather than colocated with modules, because integration and e2e tests frequently span multiple modules (e.g., "approve a draft, confirm recruiter sees it") and a single cross-cutting home avoids ambiguity about where such a test belongs.

## Future Considerations

- If a module is extracted into its own deployable service (e.g., `brochure` for PDF rendering load, per `05_System_Architecture.md`), its folder can move to a package in a monorepo largely unchanged, because its internal layering already isolates infrastructure concerns behind ports.
- Should the platform expand to other departments, `config/` would grow to support per-tenant configuration (branding, domain) rather than the current single-tenant assumption.
