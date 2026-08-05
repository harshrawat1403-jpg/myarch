# Security Audit

**Date:** 2026-08-06
**Scope:** Full application — authentication, authorization, data privacy boundaries, background jobs, and dependency posture.
**Conducted as part of:** Production Readiness Sprint, Phase B.

## Method

Every area listed below was reviewed by reading the actual implementation (not just tests), cross-referenced against `docs/security/14_Security_Architecture.md`, `docs/04_Non_Functional_Requirements.md`'s NFR-SEC-* items, and `docs/03_Functional_Requirements.md`'s FR-AUTH-* items. Where a gap was found, it was fixed and a regression test was added (or, where a live database would be required to exercise it, the fix was verified by direct code inspection and by testing the primitive it depends on — noted explicitly below). Privilege-escalation attempts were reasoned through directly against the authorization code for every role × module combination, not just the pre-existing test suite.

## Findings and fixes

### 1. JWT algorithm not explicitly pinned — **Fixed**

`JwtTokenService.signAccessToken()`/`verifyAccessToken()` called `jwt.sign()`/`jwt.verify()` without an explicit `algorithm`/`algorithms` option. The `jsonwebtoken` v9 library used here defaults safely for a string HMAC secret (it will not accept `none` or an asymmetric algorithm against a plain string key), so this was **not an exploitable vulnerability today**, but it relied on implicit library behavior rather than an explicit, auditable constraint — exactly the shape of bug that becomes exploitable silently after a library upgrade changes its defaults.

**Fix:** `algorithm: "HS256"` added to `sign()`; `algorithms: ["HS256"]` added to `verify()`. No behavior change for any valid token; closes the "algorithm confusion" vulnerability class defensively regardless of library defaults.

### 2. Login rate limiting did not actually enforce "per account AND per IP" — **Fixed, real gap**

FR-AUTH-05 and NFR-SEC-07 both explicitly require login attempts to be rate-limited **per account and per IP** ("so a single attacker can't spray one IP across many accounts, nor hammer one account from many IPs"). The implementation used a single **composite** key (`login:${email}:${ip}`) for one `consume()` call. This only rate-limits the exact (email, IP) *pair* — it does not limit either dimension independently:

- An attacker trying many different email addresses from one IP (credential stuffing) never accumulates against a per-IP limit, because each attempt uses a different composite key.
- An attacker trying one email from many IPs (distributed brute force) never accumulates against a per-account limit, for the same reason.

This is a genuine, documented-requirement-violating security gap, not a stylistic issue.

**Fix:** `loginRouteHandler` now performs two independent `consume()` calls — `login:email:${email}` and `login:ip:${ip}` — and rejects if either is exhausted, always consuming both so each dimension's sliding window stays accurate regardless of which one trips first.

**Test coverage added:** `InMemoryRateLimiter` had zero dedicated tests before this sprint despite backing a P0 security requirement. `tests/unit/auth/rate-limiter.test.ts` now covers: allow-until-limit, reject-with-positive-retryAfterMs, **independent key isolation** (the specific property this fix depends on), window sliding, and `reset()`. A subsequent phase (Production Deployment & Operational Readiness) validated live login success against a real PostgreSQL instance for every admin-facing role, but did not specifically drive the rate limiter to its threshold to observe a live `429` — that specific scenario remains verified by direct code review plus the `InMemoryRateLimiter` unit tests above, not a live integration test (see `docs/TECHNICAL_DEBT.md`).

### 3. Confidential document MIME type had no allow-list — **Fixed, partial**

`docs/security/14_Security_Architecture.md` and NFR-SEC-06 require upload MIME types to be validated against an **allow-list, validated by content** — not a bare, unconstrained string. `AttachConfidentialDocumentRequestSchema` accepted any string 1–255 characters as `mimeType`.

**Important scope note:** this system does not yet implement actual file upload — `AttachConfidentialDocumentUseCase` only registers a *reference* (`storageKey`/`mimeType`/`sizeBytes`) to a file uploaded through some other, not-yet-built storage mechanism. It never receives file bytes, so **true content-sniffing validation is not possible at this layer** — it is a prerequisite of building the actual upload endpoint, not something this metadata-registration code can perform regardless of how it's written.

**Fix:** the declared `mimeType` is now validated against an allow-list (`application/pdf`, `image/jpeg`, `image/png`) via `z.enum(...)`. This is a real, if partial, improvement — it rejects an obviously wrong or unexpected declared type at the boundary that exists today. Full content-signature validation is tracked in `TECHNICAL_DEBT.md` against the not-yet-built upload endpoint.

**Test coverage added:** `tests/unit/students/validation.test.ts` gained tests for both acceptance of every allow-listed type and rejection of common disallowed types (`text/html`, `application/x-msdownload`, `application/octet-stream`, `image/svg+xml`).

## Areas reviewed and found sound (no changes needed)

- **Authentication / password storage:** bcrypt cost factor 12+ enforced at `BcryptPasswordHasher` construction (throws if lower); generic `InvalidCredentialsError` on both unknown-email and wrong-password paths (no account-enumeration signal) — confirmed by existing tests.
- **Refresh token rotation & reuse detection:** rotation-on-use and full-family revocation on detected reuse are implemented in `RefreshAccessTokenUseCase`; refresh tokens are opaque, high-entropy (`crypto.randomBytes(32)`), and stored hashed via keyed HMAC-SHA256, never in plaintext.
- **Cookie configuration:** the refresh-token cookie is `httpOnly`, `Secure` in production, `SameSite=Strict`, and path-scoped to `/api/auth` only — verified by reading `cookies.ts` directly. `SameSite=Strict` alone is sufficient to prevent CSRF against `/api/auth/refresh` (the browser won't attach the cookie to any cross-site request, including top-level navigation); combined with no CORS headers being configured anywhere (verified — cross-origin `fetch`/`XHR` reads are blocked by the browser's default same-origin policy), CSRF risk across the whole API surface is minimal by construction, not by a bolt-on CSRF token.
- **RBAC / authorization matrix:** every permission function in `auth/domain/permissions.ts` was re-read against `docs/security/09_User_Roles_and_Permissions.md`'s matrix and matches. `withAuth`'s four-step flow (Authentication → JWT validation → Role validation → Batch-scope validation) is applied uniformly; no route handler re-implements a role/scope check inline.
- **Privilege escalation attempts (reasoned through directly, not just tested):**
  - A Student cannot view or edit another student's profile draft: `canEditPublicProfileDraft`/`GetDraftUseCase`/`SubmitDraftUseCase` all check `actor.studentProfileId === targetStudentProfileId`, sourced from the signed JWT claim (set once, server-side, at login), not from client-supplied data.
  - A Coordinator cannot act outside their assigned batch scope: every batch-scoped permission function checks `actor.batchScope` membership, and `withAuth`'s `getRequiredBatchId` option enforces this centrally before a handler ever runs, in addition to each use case's own re-check.
  - A Recruiter cannot reach any draft, private field, admin route, audit log, or batch-admin endpoint — confirmed both by the permission matrix and by the extensive Days 8–9 regression test suite (still passing, 25 authorization tests for the recruiter routes alone).
  - Root-cause check for the `getRequiredBatchId` returning `undefined` when a resource doesn't exist (which skips the Coordinator scope check in `withAuth`): confirmed safe, because the only way that resolver returns `undefined` is when the underlying entity doesn't exist at all — in which case the use case itself throws a `NotFoundError` before any data is returned, so no scope bypass is actually possible.
- **DTO boundaries:** every external-facing DTO (recruiter profile, all four export rows) is built by an explicitly field-mapped, exported `toDTO()`/`toRow()` function — never a spread — and every one has a dedicated regression test that feeds it a deliberately "poisoned" row (containing password hashes, JWT-shaped strings, CGPA, phone, personal email, internal remarks, confidential-document references) and asserts none of it survives into the output. All of these tests still pass.
- **SQL injection:** every database query in the codebase goes through Prisma's typed query builder except one — `PrismaJobRepository.claimBatch()`'s atomic `FOR UPDATE SKIP LOCKED` claim, which is not expressible via the fluent builder. That one query uses Prisma's parameterized tagged-template `$queryRaw` (never string concatenation, never `$queryRawUnsafe`/`$executeRawUnsafe`, both confirmed absent from the entire codebase) — safe from injection.
- **XSS:** no `dangerouslySetInnerHTML` exists anywhere in `src/`; React's default JSX escaping is the only rendering path. Reviewer-authored free text that reaches a rendered email (`reviewComment`) is explicitly HTML-escaped in the notification template layer before interpolation, verified by an existing regression test that feeds it a `<script>` payload.
- **Environment variables / secrets handling:** every secret-shaped value (`DATABASE_URL`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `BCRYPT_COST_FACTOR`, email provider credentials) is read exclusively through the single validated `getEnv()` accessor in `src/config/env.ts` — no module reads `process.env.<SECRET>` directly (confirmed by grep; the only direct `process.env` reads anywhere are `NODE_ENV` checks, which are not secrets). `getEnv()` is lazy (parses on first real use, not at import time), and `.env.example` documents every variable without real values.
- **Audit logging tamper-resistance (NFR-SEC-10):** the only route touching `AuditLog` is `GET /api/audit/recent`, restricted to `SECRETARY`/`COORDINATOR` and read-only — there is no `POST`/`PATCH`/`DELETE` audit route anywhere in the API surface, so audit history cannot be altered by any authenticated role via the API. Writes only ever happen server-side, from within use cases, never from client-supplied data.
- **Background job security:** job payloads are never reachable from any HTTP route today (`jobDispatcher`/`jobRegistry` are only ever imported by server-side composition roots and the standalone worker script) — there is no job-injection surface. The one notification job payload shape was already verified (prior milestone, still passing) to contain only `notificationId`/`recipientUserId`/`template`/`context` (`studentName`/`reviewComment`), never a private-profile-shaped field.
- **Export / recruiter / student / notification privacy:** all four export DTOs, the recruiter directory DTO, and the notification payload each have dedicated, still-passing "poisoned row" regression tests (see DTO boundaries above) — re-verified as part of this audit rather than assumed from the CHANGELOG.
- **Dependency vulnerabilities:** `npm audit` reports **0 vulnerabilities** (re-verified as part of this sprint's Phase F).

## Issues found (summary)

| # | Issue | Severity | Status |
|---|---|---|---|
| B1 | JWT algorithm not explicitly pinned | Low (defense in depth; not currently exploitable) | Fixed |
| B2 | Login rate limiting used one composite key instead of two independent ones | **Medium** — violates FR-AUTH-05/NFR-SEC-07 as written | Fixed |
| B3 | Confidential document MIME type had no allow-list | Low–Medium (partial fix; full fix blocked on unbuilt upload endpoint) | Fixed (partial) |

## Recommendations / future improvements

- **Full MIME content-signature validation** must be implemented when the actual file-upload endpoint is built (not a metadata-registration concern) — see `TECHNICAL_DEBT.md`.
- **Move `InMemoryRateLimiter` to a shared store (e.g. Redis)** before horizontally scaling beyond one application instance — already documented in the class's own doc comment; re-flagged here since it's now carrying a verified-correct two-dimension check that would silently stop working across multiple instances (each instance would have its own independent counters).
- Consider adding `issuer`/`audience` claims to access tokens if this JWT is ever consumed by more than one service — not implemented now because there is currently only one issuer and one consumer (this single monolith), so it would add complexity without a concrete threat it defends against today.
- HTTPS enforcement (NFR-SEC-08) and scheduled database backups (NFR-SEC-09) are deployment-platform concerns, not application code — tracked in `PRODUCTION_CHECKLIST.md` rather than fixed here, since the hosting platform remains an open decision (`docs/planning/18_Open_Questions.md`, Q1).
