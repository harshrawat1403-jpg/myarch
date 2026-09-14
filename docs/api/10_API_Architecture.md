# 10 — API Architecture

## Purpose

Defines the conventions the API layer follows: routing style, request/response shape, error handling, versioning stance, and how authorization is enforced at this layer specifically. This is the contract implementation must follow so that every endpoint behaves predictably.

## Scope

Covers the API layer (Next.js Route Handlers) for Phase 1–3. Does not enumerate every endpoint (that emerges during implementation and is better tracked as generated/living API documentation, e.g. an OpenAPI spec produced from the actual route handlers, rather than hand-maintained here and left to drift).

## Style: REST-ish, Resource-Oriented Route Handlers

The API is implemented as Next.js Route Handlers under `src/app/api/`, following conventional REST resource semantics rather than RPC-style action endpoints, with narrow, deliberate exceptions for workflow actions that don't map cleanly to CRUD (e.g., approving a draft is a distinct action, not a generic `PATCH`).

**Convention:**

```
GET    /api/students                 List students (scoped to caller's permissions)
GET    /api/students/:id             Fetch one student (private+public, permission-checked)
POST   /api/students                 Create a student record (Secretary/Coordinator)
PATCH  /api/students/:id             Update a student record

GET    /api/profiles/:studentId/draft        Fetch a student's own draft
PUT    /api/profiles/:studentId/draft        Save draft edits
POST   /api/profiles/:studentId/draft/submit Submit draft for review
POST   /api/profiles/:draftId/approve        Approve a pending draft (Coordinator/Secretary)
POST   /api/profiles/:draftId/reject         Reject a pending draft, with reason

GET    /api/recruiters/directory     Search/filter approved public profiles (Recruiter-scoped)
GET    /api/recruiters/students/:id  Fetch one approved public profile (Recruiter-scoped)

POST   /api/drives                   Create a Placement Drive (Phase 2)
POST   /api/applications/:id/status  Advance an application's pipeline status (Phase 2)

POST   /api/brochure/generate        Kick off brochure generation job (Phase 3, async)
GET    /api/brochure/jobs/:id        Poll brochure generation job status
```

Workflow actions (`submit`, `approve`, `reject`, `status`, `generate`) are modeled as sub-resource `POST` actions rather than forced into generic `PATCH` semantics — this keeps the audit trail (`14_Security_Architecture.md`) mapped cleanly to a named action per `NFR-DATA-02`.

## Request/Response Conventions

- All request and response bodies are JSON; file uploads use `multipart/form-data` against dedicated upload endpoints that return a `FileAsset` reference, not raw bytes embedded in JSON.
- Every response follows a consistent envelope:

```json
// Success
{ "data": { /* resource or list */ }, "meta": { /* pagination, etc. */ } }

// Error
{ "error": { "code": "VALIDATION_ERROR", "message": "cgpa must be between 0 and 10", "details": [ /* field-level errors */ ] } }
```

- HTTP status codes are used meaningfully: `400` validation errors, `401` unauthenticated, `403` authenticated but not authorized (e.g., Coordinator out of scope), `404` not found (never leaked as `403` to avoid confirming existence to an unauthorized caller where that itself would be sensitive — see Assumptions), `409` conflict (e.g., approving an already-approved draft), `500` unexpected.

## Input Validation

Every route handler validates its input against a schema (e.g., Zod) **before** any use case is invoked — directly implementing `NFR-SEC-05`. Validation lives at the Presentation layer boundary described in `05_System_Architecture.md`; the Domain/Application layers assume already-validated input and never re-parse raw request bodies.

## Authorization at the API Layer

Every route handler runs through a shared authorization middleware before reaching its use case:

1. **Authenticate**: verify the JWT access token; reject `401` if missing/expired/invalid.
2. **Authorize**: resolve the caller's role and scope (e.g., Coordinator's assigned batches), and check it against the specific resource being requested — not just "is this role allowed to hit this route" but "is this role allowed to hit this route *for this specific record*."
3. **Delegate**: only after both pass does the handler invoke the Application-layer use case.

This mirrors `09_User_Roles_and_Permissions.md` exactly — the permissions matrix in that document is the specification this middleware must satisfy, and authorization tests (`21_Testing_Strategy.md`) are written directly against that matrix.

## Rate Limiting

Login, password-reset, and any public-facing (unauthenticated) endpoints carry a stricter rate limit than authenticated endpoints, applied per-IP and per-account where applicable (`NFR-SEC-07`).

## Pagination & Filtering

List endpoints (student directory, recruiter search, applications) use cursor-based pagination for consistent results under concurrent writes, with filter parameters passed as query strings validated against an allow-list of filterable fields (never raw pass-through to the database query layer).

## Background/Async Actions

Long-running actions (brochure generation, bulk export/import) return `202 Accepted` immediately with a `Job` reference; the client polls (or is notified via the existing Notification mechanism) rather than the request blocking until completion — directly implementing `NFR-PERF-03`.

## Versioning Stance

No `/v1/` prefix or formal versioning scheme for Phase 1–3. The API has exactly one internal consumer (the MYARCH frontend, same repository, deployed together), so there is no independent client to version against. This is revisited only if a genuinely external API consumer emerges (see Future Considerations).

## Assumptions

- The API is not intended for third-party/public consumption in Phase 1–3; no public API keys or developer portal are in scope.
- A generated OpenAPI/Swagger document (from Zod schemas or route handler types) is the preferred way to keep endpoint-level documentation current, rather than a hand-maintained endpoint list in this document, which would drift.
- `404` vs `403` handling favors `404` specifically where record existence itself is sensitive (e.g., a Coordinator probing for a student ID outside their batch should not learn "that student exists but you can't see them" vs. "no such student").

## Future Considerations

- If the platform expands to other departments, path structure would gain a tenant/department segment and API versioning would become necessary as external integrations accumulate.
- If a genuine external consumer appears (e.g., an institutional dashboard needing NAAC/NBA data programmatically), introduce a versioned, explicitly scoped read-only API surface rather than opening up the internal API as-is.
