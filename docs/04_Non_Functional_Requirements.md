# 04 — Non-Functional Requirements

## Purpose

Defines the quality attributes the system must exhibit regardless of feature — security, performance, reliability, accessibility, maintainability, and operability. These constrain *how* functional requirements (`03_Functional_Requirements.md`) are implemented.

## Scope

Applies platform-wide, across all phases. Detailed treatments live in their dedicated documents (`14_Security_Architecture.md`, `22_Performance_Guidelines.md`, `23_Accessibility_Guidelines.md`); this document is the summary and single point of traceability.

## NFR-SEC — Security

- **NFR-SEC-01** (P0): All passwords hashed with bcrypt, cost factor 12 or higher. No plaintext password ever persisted or logged.
- **NFR-SEC-02** (P0): Authentication uses short-lived JWT access tokens plus rotating refresh tokens; refresh tokens stored in httpOnly, secure, `SameSite` cookies.
- **NFR-SEC-03** (P0): All secrets (database URL, JWT signing keys, email provider keys, storage credentials) live in environment variables and are never committed to version control.
- **NFR-SEC-04** (P0): Authorization is enforced server-side on every API route, using strict role-based access control — never relying on the client to hide unauthorized UI.
- **NFR-SEC-05** (P0): Every API endpoint validates and sanitizes input against a defined schema before processing.
- **NFR-SEC-06** (P0): File uploads are restricted by type (allow-list, not deny-list) and size; uploaded files are scanned for type-spoofing (content sniffing, not just extension).
- **NFR-SEC-07** (P0): Login and password-reset endpoints are rate-limited per account and per IP.
- **NFR-SEC-08** (P0): HTTPS is mandatory in production; HTTP requests are redirected, not served.
- **NFR-SEC-09** (P0): Automated, scheduled database backups run before production go-live, with a documented restore procedure.
- **NFR-SEC-10** (P0): Audit logs capture profile approvals, admin actions, and access to sensitive (Private Profile) data, and are themselves protected from tampering by non-Secretary roles.
- **NFR-SEC-11** (P0): A security scan (`npm audit` or equivalent, e.g. `pnpm audit` / GitHub Dependabot alerts) runs before every production deployment; high/critical findings block deployment.
- **NFR-SEC-12** (P1): A documented archive-vs-delete retention policy exists for graduated batches before the first batch actually graduates under the system (see `18_Open_Questions.md`).

Full detail: `14_Security_Architecture.md`.

## NFR-PERF — Performance

- **NFR-PERF-01** (P0): Recruiter search/filter over the student directory returns results in well under a second for the department's realistic scale (a few hundred students per batch, single digit batches active at once — see Assumptions).
- **NFR-PERF-02** (P1): Public Profile pages (image-heavy, portfolio-first) use responsive, appropriately sized images and lazy loading so that a mobile connection loads a usable page without waiting on full-resolution portfolio assets.
- **NFR-PERF-03** (P1): Brochure PDF/PPTX generation (Phase 3) completes within a bounded time (target: under one minute for a full department brochure) and runs as a background job rather than blocking the request.
- **NFR-PERF-04** (P2): The admin dashboard's summary statistics are either computed fast enough to serve on demand or cached with a short, explicit staleness window — never silently stale with no indication.

Full detail: `22_Performance_Guidelines.md`.

## NFR-AVAIL — Reliability & Availability

- **NFR-AVAIL-01** (P0): The system has no single point of data loss — the production database is backed up on a schedule (see NFR-SEC-09) with tested restore.
- **NFR-AVAIL-02** (P1): Planned maintenance windows are communicated in advance; the platform does not need 24/7 zero-downtime guarantees given its usage pattern is bursty around placement season, not continuous.
- **NFR-AVAIL-03** (P1): A degraded external dependency (email provider, object storage) fails gracefully — e.g., a failed notification email is retried/queued rather than silently dropping the underlying action it was supposed to notify about.

## NFR-A11Y — Accessibility

- **NFR-A11Y-01** (P1): All interactive flows are operable via keyboard alone.
- **NFR-A11Y-02** (P1): Color contrast in the dark, blueprint-inspired design system (see `12_Design_System.md`) meets WCAG 2.1 AA for text and meaningful UI elements.
- **NFR-A11Y-03** (P1): Form fields, especially in the Private/Public profile editors, have properly associated labels and error messaging usable by assistive technology.

Full detail: `23_Accessibility_Guidelines.md`.

## NFR-MAINT — Maintainability

- **NFR-MAINT-01** (P0): The codebase follows Clean Architecture boundaries and feature-first organization (see `05_System_Architecture.md`, `07_Repository_Structure.md`) so a single new maintainer (given yearly Secretary/Coordinator turnover) can navigate it.
- **NFR-MAINT-02** (P0): TypeScript strict mode is enabled project-wide; no `any` escape hatches without an explicit, commented justification.
- **NFR-MAINT-03** (P1): Automated tests cover authorization boundaries (private/public data separation, role scoping) as the highest-priority test surface, ahead of general feature coverage (see `21_Testing_Strategy.md`).

## NFR-OPS — Operability

- **NFR-OPS-01** (P0): Deployment is reproducible from version control — no manual, undocumented server configuration required to stand up a new environment.
- **NFR-OPS-02** (P1): Structured logging exists for request errors and background job failures, sufficient to diagnose an incident without database access.
- **NFR-OPS-03** (P1): The system distinguishes local, staging, and production environments with separate credentials and separate databases — production data is never used in local development.

## NFR-DATA — Data Integrity

- **NFR-DATA-01** (P0): Private and Public profile data are enforced as structurally separate at the database and API layer, not merely by an application-level flag (directly supports FR-PROF-01).
- **NFR-DATA-02** (P0): Every status-changing action on an Application, Profile approval, or Admin action is attributable to a specific actor and timestamp.
- **NFR-DATA-03** (P1): Exported data (Excel/CSV, brochure) is generated from the live system of record at export time — never a manually maintained parallel copy.

## Assumptions

- Realistic scale: low hundreds of students per batch, a handful of active batches, tens of concurrent recruiter/admin users during peak placement season — not thousands of concurrent users. Performance targets are set against this scale, not generic internet-SaaS scale.
- The department accepts brief, scheduled maintenance windows (e.g., late night) rather than requiring true zero-downtime deployments for MVP.
- "AA" accessibility conformance is the target level; AAA is not required given the specialized, authenticated user base (students, coordinators, verified recruiters).

## Future Considerations

- If the platform is later adopted by other departments (see `01_Product_Vision.md` future considerations), NFR-PERF and NFR-AVAIL targets should be re-evaluated against a materially larger user base before that expansion.
- Formal uptime SLAs are not defined at this stage; they should be introduced only if the platform ever supports paying/external stakeholders beyond the department itself.
