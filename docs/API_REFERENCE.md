# API Reference

All endpoints are under the deployed origin (e.g. `https://myarch.in`). Every endpoint except `/api/health`, `/api/health/ready`, and `/api/auth/*` requires a valid access token in an `Authorization: Bearer <token>` header, obtained from `POST /api/auth/login`.

**Response envelope**, consistent across every endpoint: success responses are `{ "data": ... }`; errors are `{ "error": { "code": "...", "message": "...", "details": ... } }` with a matching HTTP status (401 unauthenticated, 403 forbidden, 400 validation, 404 not found, 409 conflict, 429 rate-limited, 503 a health check's dependency is down).

## Health

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/health` | None | Liveness — process is up. Always `{"status":"ok"}` if reachable at all. |
| GET | `/api/health/ready` | None | Readiness — checks database connectivity. `200 {"status":"ok","checks":{"database":"ok"}}` or `503 {"status":"error",...}`. |

## Authentication

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/login` | None (rate-limited per email **and** per IP) | `{ email, password }` → `{ accessToken, role }` + sets the httpOnly refresh-token cookie |
| POST | `/api/auth/refresh` | Refresh cookie | Rotates the refresh token, returns a new `accessToken` |
| POST | `/api/auth/logout` | Refresh cookie | Revokes the current refresh-token family, clears the cookie |
| GET | `/api/auth/me` | Any authenticated role | Returns the caller's own `{ userId, role, batchScope?, studentProfileId? }` |

## Batches

| Method | Path | Roles | Description |
|---|---|---|---|
| GET | `/api/batches` | Secretary, Coordinator | List batches (Coordinator sees only their assigned batches) |
| POST | `/api/batches` | Secretary | Create a batch |
| GET | `/api/batches/:id` | Secretary, Coordinator (in-scope) | Get one batch |
| PATCH | `/api/batches/:id` | Secretary | Update a batch's name/year |
| POST | `/api/batches/:id/status` | Secretary | Change lifecycle status (ACTIVE/GRADUATED/ARCHIVED) |

## Students

| Method | Path | Roles | Description |
|---|---|---|---|
| GET | `/api/students` | Secretary, Coordinator | Search/list students (query params: `name`, `rollNumber`, `batchId`, `batchStatus`, `skills`, `software`, `cgpaMin`, `cgpaMax`, `includeInactive`) |
| POST | `/api/students` | Secretary, Coordinator | Create a student (including private fields) |
| GET | `/api/students/:id` | Secretary, Coordinator (in-scope) | Get one student, including private fields |
| PATCH | `/api/students/:id` | Secretary, Coordinator (in-scope) | Update a student's public/private fields |
| POST | `/api/students/:id/archive` | Secretary, Coordinator (in-scope) | Archive (also deactivates login) |
| POST | `/api/students/:id/restore` | Secretary, Coordinator (in-scope) | Restore an archived student |
| GET | `/api/students/:id/private/documents` | Secretary, Coordinator (in-scope) | List confidential document references |
| POST | `/api/students/:id/private/documents` | Secretary, Coordinator (in-scope) | Register a confidential document reference (`storageKey`, `mimeType` — allow-listed to PDF/JPEG/PNG, `sizeBytes` ≤ 50MB) |
| DELETE | `/api/students/:id/private/documents/:fileId` | Secretary, Coordinator (in-scope) | Remove a confidential document reference |

## Profiles (the two-profile workflow)

| Method | Path | Roles | Description |
|---|---|---|---|
| GET | `/api/students/:id/profile/draft` | Secretary, Coordinator (in-scope), Student (own) | Get the working draft |
| PUT | `/api/students/:id/profile/draft` | Student (own only) | Edit the draft's content |
| POST | `/api/students/:id/profile/draft/submit` | Student (own only) | Submit for review (→ PENDING_REVIEW) |
| POST | `/api/students/:id/profile/draft/approve` | Secretary, Coordinator (in-scope) | Approve — publishes, notifies the student asynchronously |
| POST | `/api/students/:id/profile/draft/request-changes` | Secretary, Coordinator (in-scope) | Request changes with a comment — notifies the student asynchronously |
| GET | `/api/students/:id/profile/published` | Secretary, Coordinator (in-scope), Student (own) | Get the published (approved) profile |
| GET | `/api/profiles/approval-queue` | Secretary, Coordinator | List drafts awaiting review |

## Recruiter Portal (structurally isolated — see `SYSTEM_ARCHITECTURE.md`)

| Method | Path | Roles | Description |
|---|---|---|---|
| GET | `/api/recruiters/dashboard` | Recruiter | Aggregate stats (available students, batches, skills represented) |
| GET | `/api/recruiters/students` | Recruiter | Search the directory of approved, active students (query params: `batchId`, `skills`, `software`, `query`, `hasInternshipExperience`, `hasCertification`, `internshipKeyword`, `certificationKeyword`) |
| GET | `/api/recruiters/students/:id` | Recruiter | Get one approved student's recruiter-facing profile |
| GET | `/api/recruiters/students/:id/resume` | Recruiter | Get a reference (storage key + MIME type) to the approved public resume only |

## Exports (Secretary/Coordinator only — never Recruiter or Student)

| Method | Path | Roles | Description |
|---|---|---|---|
| GET | `/api/exports/students` | Secretary, Coordinator | Student Directory CSV |
| GET | `/api/exports/batches` | Secretary, Coordinator | Batch Report CSV |
| GET | `/api/exports/public-profiles` | Secretary, Coordinator | Public Placement Dataset CSV |
| GET | `/api/exports/recruiters` | Secretary only | Recruiter Directory CSV (no batch dimension to scope a Coordinator by) |

All four return `Content-Type: text/csv; charset=utf-8` with a `Content-Disposition: attachment; filename="..."` header.

## Audit

| Method | Path | Roles | Description |
|---|---|---|---|
| GET | `/api/audit/recent` | Secretary, Coordinator | Most recent 50 audit entries (Secretary: system-wide; Coordinator: own actions only). Read-only — there is no write/update/delete audit endpoint anywhere in the API. |

## Authorization model summary

Every endpoint above is enforced server-side by `withAuth` (`src/modules/auth/presentation/with-auth.ts`) in four steps — Authentication → JWT validation → Role validation → Batch-scope validation (Coordinators only) — before any handler runs, plus a second, independent check inside the use case itself (defense in depth). No endpoint trusts a client-supplied role or ID without re-verifying it server-side. Full matrix: `docs/security/09_User_Roles_and_Permissions.md`; verification detail: `docs/SECURITY_AUDIT.md`.

## Rate limiting

`POST /api/auth/login` is rate-limited independently per account **and** per IP (FR-AUTH-05/NFR-SEC-07) — exceeding either returns `429` with a `Retry-After` header.
