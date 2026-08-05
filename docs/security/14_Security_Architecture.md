# 14 — Security Architecture

## Purpose

Defines how TNPArch meets the project brief's mandatory pre-production security requirements, and how those requirements are implemented as architecture rather than as a checklist applied after the fact. This is the authoritative security specification; deviations from it require an explicit, documented decision in `19_Decision_Log.md`.

## Scope

Covers authentication, authorization, secrets management, input validation, upload handling, rate limiting, transport security, backups, audit logging, and retention. Applies to Phase 1 (mandatory before any production deployment) through Phase 4 (hardening). Where the brief specifies a hard requirement (e.g., bcrypt cost factor), this document treats it as non-negotiable rather than a target.

## Passwords

- Hashed with **bcrypt, cost factor 12 or higher**, no exceptions, no plaintext storage or logging under any circumstance (including error logs and stack traces — passwords are stripped before any exception is logged).
- Password strength requirements are enforced at signup/reset (minimum length, not solely complexity rules that encourage predictable substitutions like `Password1!`).
- Password reset uses a single-use, time-limited (short expiry, e.g., 30–60 minutes) token emailed to the account's registered address; the token is invalidated after use or expiry, whichever comes first.

## Authentication: JWT + Refresh Tokens

- **Access token**: short-lived JWT (minutes-scale expiry), signed with a server-held secret, carrying the user's ID and role. Sent as a Bearer token or via a short-lived cookie, used to authorize individual requests.
- **Refresh token**: longer-lived (days-scale), stored server-side (or as a hashed reference) and delivered to the client only via an **httpOnly, Secure, SameSite=Strict cookie** — never accessible to client-side JavaScript, which closes off the most common XSS-driven token theft path.
- **Rotation**: every refresh exchange issues a new refresh token and invalidates the previous one. If a previously-invalidated refresh token is presented (indicating token theft/replay), the entire token family for that session is revoked and the user is required to re-authenticate.
- **Logout** invalidates the refresh token server-side immediately, not merely by discarding it client-side.

## Authorization: Strict RBAC, Enforced Server-Side

- Every API route is protected by the authorization middleware described in `10_API_Architecture.md`, checking both role **and** scope (e.g., a Coordinator's assigned batches) against the specific resource requested — never a role-only check.
- Authorization logic lives in one shared location (not duplicated per route), so the permissions matrix in `09_User_Roles_and_Permissions.md` has exactly one code path to keep in sync with, not many.
- The two concrete boundaries the brief calls out by name are treated as the platform's highest-priority authorization tests (see `21_Testing_Strategy.md`):
  1. A Coordinator must never be able to read another batch's confidential/internal remarks, at the database-query level (queries are scoped by batch, not filtered post-fetch).
  2. A Recruiter must never be able to read any `StudentPrivateProfile` field, at the database-query level (the recruiter-facing read path has no code route that touches the private table at all — see `08_Database_Design.md`).
- The UI hiding an action (e.g., not rendering an "Approve" button) is treated purely as a UX convenience — it is never the mechanism relied upon for actual access control.

## Secrets Management

- All secrets (database connection string, JWT signing keys, object storage credentials, email provider API key) are read from environment variables at runtime.
- No secret is ever committed to version control; `.env.example` documents every required variable name with a placeholder/description, never a real value.
- Secrets differ per environment (local/staging/production — see `NFR-OPS-03`); production secrets are managed through the hosting platform's secret store (see `15_Deployment_Strategy.md`), not shared files.
- JWT signing keys are rotatable without requiring a code deployment (loaded from environment/secret store, not hardcoded).

## Input Validation

- Every API endpoint validates its input against an explicit schema before any business logic runs (`10_API_Architecture.md`), rejecting malformed or unexpected fields rather than silently ignoring or coercing them.
- Validation covers type, range, and format (e.g., CGPA bounded 0–10, email format, file MIME type), and is applied identically regardless of which role is calling the endpoint — validation is not weakened for "trusted" internal admin routes.

## File Upload Security

- Uploads (resumes, portfolio images, confidential documents) are restricted by an **allow-list** of MIME types (not a deny-list), validated by inspecting actual file content/signature, not just the filename extension or client-supplied `Content-Type` header.
- A maximum file size is enforced server-side (not only via a client-side check that a direct API call could bypass).
- Uploaded files are stored in object storage under non-guessable keys, with access mediated by short-lived signed URLs rather than permanently public URLs — this matters especially for `FileAsset.classification = PRIVATE` documents (`08_Database_Design.md`), which must never be reachable via a static, guessable link.
- Uploaded images are re-encoded/normalized on the server (not served as the raw uploaded bytes directly) as a defense against embedded-payload attacks in image files, where feasible within the chosen storage/processing pipeline.

## Rate Limiting & Brute-Force Protection

- Login and password-reset endpoints are rate-limited per account and per source IP; repeated failures trigger a backoff/lockout window.
- General API rate limiting protects against scraping the recruiter directory or the student database at a volume inconsistent with normal human use.

## Transport Security

- HTTPS is mandatory in production; the application redirects any HTTP request rather than serving content over it.
- Cookies (refresh token) are marked `Secure`, meaning they are never transmitted over an unencrypted connection.

## Backups

- Automated, scheduled database backups run on a defined cadence (daily, at minimum) once in production, with backups stored separately from the primary database (not merely a same-host snapshot).
- A restore procedure is documented and tested **before** go-live — an untested backup is treated as equivalent to no backup.
- Backup retention duration is aligned with whatever retention policy is confirmed for graduated batches (`18_Open_Questions.md`), since backups are themselves a copy of retained data.

## Audit Logging

- The `AuditLog` table (`08_Database_Design.md`) records, at minimum: Public Profile approvals/rejections, all Coordinator/Recruiter account creation and scope changes, Batch lifecycle changes, and any access to `StudentPrivateProfile` data by a Coordinator (so the Secretary can review who looked at what, matching the brief's explicit requirement to track "sensitive data access," not only writes).
- Audit log entries are append-only; the application exposes no update or delete path for this table, and database-level permissions (a restricted database role for the application's normal runtime connection) provide defense in depth against an application bug accidentally mutating history.
- Audit logs are visible to the Secretary in full; Coordinators can see their own actions and actions within their scope, consistent with `09_User_Roles_and_Permissions.md`.

## Retention Policy (Graduated Batches)

The exact policy (archive vs. delete, and for how long) is an open decision pending the Secretary's confirmation — see `18_Open_Questions.md`. This document specifies the architectural requirement independent of that decision: whatever policy is chosen must be **explicit, applied consistently by the system (not manually per-batch), and logged** when it executes (a Batch transitioning to `ARCHIVED` or being purged is itself an audited action).

## Security Scanning in the Release Process

- `npm audit` (or the package manager's equivalent, e.g. `pnpm audit`) runs in CI on every pull request and again before any production deployment; high/critical severity findings block the deployment pipeline (`15_Deployment_Strategy.md`) rather than merely generating a warning.
- Dependency updates addressing known vulnerabilities are treated as priority work, not deferred maintenance.

## Threat Model Summary

| Threat | Primary mitigation |
|---|---|
| Credential stuffing / brute force login | bcrypt cost 12+, rate limiting, account lockout backoff |
| Token theft via XSS | Refresh token in httpOnly cookie, never exposed to client JS |
| Token replay after theft | Refresh token rotation with reuse detection |
| Coordinator accessing another batch's private data | Query-level scoping by `CoordinatorBatchScope`, not UI hiding |
| Recruiter accessing private student data | Structurally separate tables/read-paths (`08_Database_Design.md`), no shared query surface |
| Malicious file upload (disguised executable, oversized file, image-embedded payload) | MIME allow-list validated by content, size limits, server-side re-encoding, signed URLs |
| Secret leakage via version control | Environment-variable-only secrets, `.env.example` with no real values, secret store in production |
| Undetected known-vulnerable dependency | `npm audit` gate in CI and pre-deploy |
| Silent data loss | Scheduled, tested backups |
| Unaccountable admin action | Append-only audit log covering approvals, admin actions, and sensitive data access |

## Assumptions

- The department's threat model is primarily **insider-boundary risk** (a Coordinator or Recruiter seeing more than their role should) rather than sophisticated external attack — the mitigations above are weighted accordingly, without neglecting standard external-facing hardening (rate limiting, HTTPS, dependency scanning).
- No regulatory compliance framework (e.g., GDPR, a specific Indian data protection statute) has been specified by the brief as a hard requirement; the security posture here is built to a strong general-purpose bar rather than a named compliance certification. If the department identifies a specific applicable regulation, this document should be revisited against it explicitly.
- Multi-factor authentication is not required by the brief and is not assumed for MVP; it is noted as a Phase 4 hardening candidate.

## Future Considerations

- Phase 4 "security hardening" (per `02_Project_Objectives.md`) is expected to include: multi-factor authentication (at minimum for Secretary/Coordinator accounts), more granular audit log review tooling in-product, and a periodic access review (confirming Coordinator scopes still match current assignments).
- If the platform ever handles payment or a formally regulated data category, a dedicated compliance review should precede that expansion — out of scope today.
