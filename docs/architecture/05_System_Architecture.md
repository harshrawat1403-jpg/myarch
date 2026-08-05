# 05 — System Architecture

## Purpose

Describes the high-level shape of TNPArch: how the system is decomposed, how data flows through it, and how Clean Architecture and SOLID principles are applied concretely rather than as slogans.

## Scope

Covers the architectural style, layering, module boundaries, and major data/control flows for Phase 1–4. Concrete technology choices are in `06_Technology_Stack.md`; folder-level layout is in `07_Repository_Structure.md`; the data model itself is in `08_Database_Design.md`.

## Architectural Style: Modular Monolith, Feature-First

TNPArch is built as a **modular monolith**: a single deployable application (one Next.js codebase, one database) internally organized into independent, feature-first modules with enforced boundaries. This is a deliberate choice against two alternatives:

- **Not a distributed microservice system** — the team is small (effectively one developer, Claude Code, plus the Secretary as product owner), the scale is modest (see `04_Non_Functional_Requirements.md` Assumptions), and operating multiple services would add deployment and debugging overhead with no corresponding benefit at this scale.
- **Not an unstructured monolith either** — features are isolated into modules with explicit contracts between them, so that if the platform ever needs to extract a module into its own service (e.g., the Brochure Builder's PDF rendering, which is CPU-heavy), it can do so without a full rewrite.

## Layering (Clean Architecture)

Each feature module is internally layered, dependencies pointing inward only:

```
┌─────────────────────────────────────────────┐
│  Presentation (UI components, route handlers) │  ← depends on Application
├─────────────────────────────────────────────┤
│  Application (use cases / services)           │  ← depends on Domain
├─────────────────────────────────────────────┤
│  Domain (entities, business rules, types)     │  ← depends on nothing
├─────────────────────────────────────────────┤
│  Infrastructure (Prisma repos, email, storage)│  ← implements Domain interfaces
└─────────────────────────────────────────────┘
```

- **Domain layer**: framework-free TypeScript — entities (Student, Batch, Application, etc.), value objects (e.g., an `ApprovalStatus` type), and pure business rules (e.g., "a student is eligible for a drive if CGPA ≥ threshold and no active backlog"). No Prisma imports, no Next.js imports.
- **Application layer**: use cases such as `SubmitProfileDraft`, `ApproveProfileDraft`, `RecordApplicationStatusChange`. Orchestrates domain rules and calls infrastructure through interfaces (ports), never concrete implementations.
- **Infrastructure layer**: Prisma-backed repository implementations, the email provider adapter, the object-storage adapter, PDF/PPTX generation adapters. These implement interfaces defined by the Application layer (dependency inversion — SOLID's "D").
- **Presentation layer**: Next.js route handlers (API) and React Server/Client Components (UI). Thin — validates input, calls a use case, maps the result to a response or view. No business logic lives here.

This means, for example, the rule "a Public Profile draft never becomes visible without approval" is expressed once, in the Domain/Application layers, and is impossible to bypass from a route handler, a script, or a future admin tool — because those all have to go through the same use case.

## SOLID in Practice

- **Single Responsibility**: a use case does one thing (e.g., `ApproveProfileDraft` does not also send the notification email directly — it returns a domain event that a separate notification handler reacts to).
- **Open/Closed**: new placement drive eligibility rules are added as new rule objects, not by editing a growing `if/else` chain in one function.
- **Liskov Substitution**: any `EmailProvider` implementation (console logger in dev, Resend/SES/college SMTP in production) is interchangeable behind the same interface.
- **Interface Segregation**: repository interfaces are scoped per aggregate (`StudentRepository`, `ApplicationRepository`) rather than one giant `DatabaseRepository`.
- **Dependency Inversion**: Application layer defines interfaces; Infrastructure layer implements them. The Domain/Application layers never import Prisma directly.

## Module Map

| Module | Responsibility | Phase |
|---|---|---|
| `auth` | Login, session/token issuance, password reset, RBAC primitives | 1 |
| `batches` | Batch CRUD, coordinator-to-batch assignment | 1 |
| `students` | Student record CRUD, Private Profile data | 1 |
| `profiles` | Public Profile draft/approval workflow | 1 |
| `admin` | Dashboard aggregation, coordinator account management | 1 |
| `recruiters` | Recruiter accounts, directory browse/search/filter | 1 |
| `notifications` | Email (and later WhatsApp) dispatch, templated messages | 1 |
| `exports` | Excel/CSV export (and later import) | 1–2 |
| `companies` | Company records | 2 |
| `drives` | Placement Drive lifecycle, eligibility rules | 2 |
| `applications` | Application pipeline, status history | 2 |
| `analytics` | Derived placement statistics | 2 |
| `brochure` | Brochure template, data binding, PDF/PPTX export | 3 |
| `studio-import` | Studio project ingestion into Public Profile | 3 |
| `feedback-bank` | Interview feedback records | 3 |
| `alumni` | Alumni opt-in, mentor matching | 3 |
| `audit` | Audit log capture and query (cross-cutting, used by all modules) | 1 |

Cross-cutting concerns — `audit`, authorization middleware, validation — are implemented once and consumed by every module, not duplicated per module.

## Core Data Flow: Public Profile Publishing

This flow illustrates why the layering matters, since it is the platform's most safety-critical path:

```
Student edits Public Profile
        │
        ▼
[Presentation] PATCH /api/profiles/:id/draft
        │  (validates input shape only)
        ▼
[Application] SaveProfileDraftUseCase
        │  (writes to PublicProfileDraft, status=PENDING)
        ▼
[Infrastructure] ProfileRepository.saveDraft()
        │
        ▼
   Draft stored — recruiter-visible PublicProfile UNCHANGED
        │
        ▼
Coordinator/Secretary opens Approval Queue
        │
        ▼
[Application] ApproveProfileDraftUseCase
        │  (checks: approver is Secretary OR Coordinator scoped to student's batch)
        ▼
   PublicProfile (published) ← copied from approved Draft
        │
        ▼
   AuditLog entry written (who approved, when, what changed)
        │
        ▼
   NotificationEvent → student emailed
        │
        ▼
Recruiter Portal now serves the new PublicProfile version
```

The recruiter-facing read path queries only the published `PublicProfile` table/view — it has no code path that can reach `PublicProfileDraft`, which is the architectural enforcement of FR-PROF-04, not just a permission check.

## Deployment Topology (Phase 1)

```
                    ┌────────────────────┐
   Browser  ──────▶ │   Next.js App      │
  (Student,         │  (App Router,      │
  Coordinator,      │   Route Handlers,  │
  Secretary,        │   Server Components)│
  Recruiter)        └─────────┬──────────┘
                               │
                ┌──────────────┼───────────────┐
                ▼              ▼               ▼
        ┌──────────────┐ ┌───────────┐ ┌───────────────┐
        │ PostgreSQL   │ │  Object    │ │ Email Provider │
        │ (Prisma)     │ │  Storage   │ │ (adapter)      │
        │              │ │ (resumes,  │ │                │
        │              │ │  images)   │ │                │
        └──────────────┘ └───────────┘ └───────────────┘
```

See `06_Technology_Stack.md` for concrete provider choices and `15_Deployment_Strategy.md` for hosting.

## Assumptions

- A single Next.js deployment is sufficient through at least Phase 3; Phase 4 mobile PWA reuses the same backend rather than introducing a separate mobile API.
- Background/async work (email sending, brochure PDF generation) is handled via a database-backed job queue for MVP rather than a separate message broker, to avoid additional infrastructure at this scale (revisited in Future Considerations).
- The "modular monolith" boundary is enforced by convention plus lint rules (e.g., restricted imports between module folders), not by physically separate packages, at least through Phase 2.

## Future Considerations

- If the Brochure Builder's PDF rendering (Phase 3) proves too resource-heavy for the main app process, it can be extracted into a separate worker service without changing the Domain/Application layers, because the rendering adapter already sits behind an interface.
- If the platform expands to other departments (see `01_Product_Vision.md`), module boundaries would likely become actual package boundaries (a small monorepo) rather than folder conventions.
- A real message queue (e.g., BullMQ + Redis) can replace the DB-backed job queue if job volume or latency requirements grow beyond what polling the database comfortably supports.
