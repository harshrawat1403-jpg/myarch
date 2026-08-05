# 08 — Database Design

## Purpose

Defines the data model that enforces the platform's most important guarantee: the architectural separation between a student's Private Profile and Public Profile, plus the entities needed for batches, placement drives, applications, and audit history.

## Scope

Covers logical entity design, relationships, and the approval-workflow data shape for Phase 1–3. Physical migration files and exact Prisma syntax are implementation artifacts (built in Claude Code), not reproduced here — this document is the schema's source of truth in prose/diagram form that implementation must match.

## Design Principle: Private/Public Separation Is Structural, Not a Flag

The most common mistake in a system like this is a single `Student` table with a `is_public` boolean or per-field visibility flags. TNPArch deliberately rejects that shape (directly implementing `NFR-DATA-01`):

- `StudentPrivateProfile` and `StudentPublicProfile` (published) are **separate tables**, with separate access-control paths in the API layer.
- A recruiter-facing query can only ever join against `StudentPublicProfile` — there is no query path, permission check, or ORM relation that lets a recruiter-scoped request reach `StudentPrivateProfile`, even accidentally.
- A student's in-progress edits live in a third table, `StudentPublicProfileDraft`, distinct from the published `StudentPublicProfile` — so an edit in progress can never leak to a recruiter mid-edit.

## Entity Overview

```
User ──┬── SecretaryProfile (1:1, optional)
       ├── CoordinatorProfile (1:1, optional) ── CoordinatorBatchScope (1:N) ── Batch
       ├── StudentProfile (1:1, optional) ─┬── StudentPrivateProfile (1:1)
       │                                    ├── StudentPublicProfile (1:1, nullable until first approval)
       │                                    └── StudentPublicProfileDraft (1:1, nullable)
       └── RecruiterProfile (1:1, optional) ── Company (N:1)

Batch ──1:N── StudentProfile

Company ──1:N── PlacementDrive ──1:N── Application ──N:1── StudentProfile
Application ──1:N── ApplicationStatusEvent

AuditLog (references any actor + entity, append-only)
Notification (references recipient User + template + status)
Job (background task queue: email sends, exports, brochure renders)
```

## Core Entities

### User

The authentication identity, shared by all four roles.

| Field | Type | Notes |
|---|---|---|
| id | UUID (PK) | |
| email | string, unique | Login identifier |
| passwordHash | string | bcrypt, cost 12+ |
| role | enum: SECRETARY, COORDINATOR, STUDENT, RECRUITER | Immutable after creation except by Secretary action |
| isActive | boolean | Deactivation instead of deletion (see Retention section) |
| createdAt / updatedAt | timestamp | |

A `User` has exactly one role and, correspondingly, exactly one of the role-specific profile records below.

### Batch

| Field | Type | Notes |
|---|---|---|
| id | UUID (PK) | |
| name | string | e.g. "B.Arch 2022–27" |
| year | integer | Admission or graduation year, per department convention |
| status | enum: ACTIVE, GRADUATED, ARCHIVED | Drives default visibility/retention behavior |

### CoordinatorBatchScope

Join table enforcing that a Coordinator's authority is explicitly scoped, never global by default.

| Field | Type | Notes |
|---|---|---|
| coordinatorProfileId | UUID (FK) | |
| batchId | UUID (FK) | |

A Coordinator with zero rows here has zero batch access — scope is additive and explicit, never inferred.

### StudentProfile

The student's identity record — batch membership and linkage only, not the sensitive data itself.

| Field | Type | Notes |
|---|---|---|
| id | UUID (PK) | |
| userId | UUID (FK, unique) | |
| batchId | UUID (FK) | |
| rollNumber | string, unique | |
| fullName | string | Duplicated intentionally in both Private and this record for basic identification without touching Private data; see Assumptions |

### StudentPrivateProfile

Accessible only to: the student themself, Secretary, and Coordinators scoped to the student's batch.

| Field | Type | Notes |
|---|---|---|
| id | UUID (PK) | |
| studentProfileId | UUID (FK, unique) | |
| phone | string | |
| personalEmail | string | Distinct from login email if different |
| cgpa | decimal | Department-entered, not student-editable (FR-STUD-04) |
| hasActiveBacklog | boolean | Department-entered |
| backlogDetails | text, nullable | Department-entered |
| internalRemarks | text, nullable | Coordinator/Secretary-entered notes |
| confidentialDocuments | FileAsset[] | e.g. internal verification documents |
| updatedAt | timestamp | |
| updatedByUserId | UUID (FK) | Who last touched this record — feeds audit trail |

### StudentPublicProfile (Published)

The only table a Recruiter query is permitted to read from.

| Field | Type | Notes |
|---|---|---|
| id | UUID (PK) | |
| studentProfileId | UUID (FK, unique) | |
| bio | text | |
| skills | string[] | |
| software | string[] | e.g. AutoCAD, Rhino, Revit, SketchUp |
| selectedProjects | ProjectEntry[] | Structured: title, description, images, semester/studio |
| portfolioLinks | string[] | External portfolio URLs |
| resumeFileId | UUID (FK → FileAsset) | |
| certifications | CertificationEntry[] | |
| internships | InternshipEntry[] | |
| publishedFromDraftId | UUID (FK → StudentPublicProfileDraft) | Traceability to the approved draft |
| publishedAt | timestamp | |
| publishedByUserId | UUID (FK) | Secretary/Coordinator who approved |

### StudentPublicProfileDraft

Where a student's in-progress edits live. Never read by any Recruiter-facing code path.

| Field | Type | Notes |
|---|---|---|
| id | UUID (PK) | |
| studentProfileId | UUID (FK) | |
| *(same content fields as StudentPublicProfile)* | | The draft's shape mirrors the published shape exactly, so approval is a straight copy |
| status | enum: DRAFT, PENDING_REVIEW, APPROVED, REJECTED | |
| submittedAt | timestamp, nullable | |
| reviewedByUserId | UUID (FK), nullable | |
| reviewedAt | timestamp, nullable | |
| rejectionReason | text, nullable | Shown to the student on REJECTED |

### FileAsset

Metadata for any uploaded binary (resume, portfolio image, brochure export, confidential document), with the actual bytes in object storage (see `06_Technology_Stack.md`).

| Field | Type | Notes |
|---|---|---|
| id | UUID (PK) | |
| ownerUserId | UUID (FK) | |
| storageKey | string | Path/key in the S3-compatible bucket |
| mimeType | string | Validated against an allow-list at upload time |
| sizeBytes | integer | Validated against a max at upload time |
| classification | enum: PRIVATE, PUBLIC | Determines which access-control path applies to signed URL issuance |
| createdAt | timestamp | |

### Company (Phase 2)

| Field | Type | Notes |
|---|---|---|
| id | UUID (PK) | |
| name | string | |
| sector | string | Feeds analytics/brochure sector breakdown |
| logoFileId | UUID (FK → FileAsset), nullable | |

### PlacementDrive (Phase 2)

| Field | Type | Notes |
|---|---|---|
| id | UUID (PK) | |
| companyId | UUID (FK) | |
| title | string | |
| eligibility | JSON | Structured rule: min CGPA, backlog allowance, eligible batch(es) |
| packageOffered | decimal, nullable | For analytics/brochure |
| status | enum: DRAFT, ANNOUNCED, IN_PROGRESS, CLOSED | |
| createdByUserId | UUID (FK) | |

### Application (Phase 2)

| Field | Type | Notes |
|---|---|---|
| id | UUID (PK) | |
| studentProfileId | UUID (FK) | |
| placementDriveId | UUID (FK) | |
| currentStatus | enum: APPLIED, SHORTLISTED, INTERVIEW, OFFER, REJECTED | |
| currentRound | integer, nullable | For multi-round drives |

### ApplicationStatusEvent (Phase 2)

Append-only history — never mutated, only inserted — so the full pipeline history is always reconstructable.

| Field | Type | Notes |
|---|---|---|
| id | UUID (PK) | |
| applicationId | UUID (FK) | |
| fromStatus | enum, nullable | |
| toStatus | enum | |
| actorUserId | UUID (FK) | |
| occurredAt | timestamp | |
| note | text, nullable | |

### AuditLog (Cross-cutting)

| Field | Type | Notes |
|---|---|---|
| id | UUID (PK) | |
| actorUserId | UUID (FK) | |
| action | string | e.g. `PROFILE_APPROVED`, `PRIVATE_DATA_VIEWED`, `COORDINATOR_CREATED` |
| targetEntityType | string | |
| targetEntityId | UUID | |
| metadata | JSON | Contextual detail, never includes the sensitive payload itself |
| occurredAt | timestamp | |

Append-only; no update or delete path exists in the application layer for this table (enforced at the database role/permission level as defense in depth — see `14_Security_Architecture.md`).

### Notification

| Field | Type | Notes |
|---|---|---|
| id | UUID (PK) | |
| recipientUserId | UUID (FK) | |
| channel | enum: EMAIL, WHATSAPP (Phase 3) | |
| template | string | |
| status | enum: PENDING, SENT, FAILED | |
| payload | JSON | |

### Job (Background Queue, MVP)

| Field | Type | Notes |
|---|---|---|
| id | UUID (PK) | |
| type | string | e.g. `SEND_NOTIFICATION`, `GENERATE_BROCHURE` |
| payload | JSON | |
| status | enum: PENDING, RUNNING, COMPLETE, FAILED | |
| attempts | integer | |
| runAt | timestamp | |

## Entity-Relationship Diagram (Simplified)

```
 Batch 1───N StudentProfile 1───1 StudentPrivateProfile
                    │
                    ├───1 StudentPublicProfile (published)
                    │
                    └───1 StudentPublicProfileDraft

 Company 1───N PlacementDrive 1───N Application N───1 StudentProfile
                                        │
                                        └───N ApplicationStatusEvent

 User 1───1 {SecretaryProfile | CoordinatorProfile | StudentProfile-linked | RecruiterProfile}
 CoordinatorProfile N───N Batch (via CoordinatorBatchScope)
```

## Retention & Lifecycle (Graduated Batches)

The brief flags this as an open decision (`18_Open_Questions.md`). The schema is designed to support whichever policy is chosen without a redesign:

- `Batch.status = GRADUATED` triggers a **visibility** change (e.g., excluded from active recruiter search by default) independent of any **deletion** decision.
- `Batch.status = ARCHIVED` is modeled as a distinct state from deletion, so "archive" (retain but hide) and "delete" (remove) remain separable policies once confirmed.
- No hard-delete cascade is implemented by default; deactivation (`User.isActive = false`) is the default lifecycle action pending the retention policy decision.

## Assumptions

- `fullName` is intentionally duplicated on `StudentProfile` (non-sensitive identification) so that batch rosters, coordinator assignment UIs, and approval queues can display a name without joining into `StudentPrivateProfile` — this is a deliberate minimal exception to "no duplication," justified because a name alone is not sensitive placement data in the way CGPA/backlogs/remarks are.
- CGPA and backlog fields are department-entered and treated as point-in-time placement-eligibility data, not a live sync from an academic records system (no such integration exists per `01_Product_Vision.md` assumptions).
- `PlacementDrive.eligibility` is stored as JSON rather than fully normalized because eligibility rules vary per drive and normalizing prematurely would over-constrain Phase 2 design before real eligibility patterns are observed.
- Soft-delete (`isActive` / status enums) is preferred over hard delete everywhere except where a retention policy explicitly calls for purging (to be confirmed).

## Future Considerations

- Once the retention policy (`18_Open_Questions.md`) is confirmed, add a scheduled job that transitions `Batch.status` and applies whatever archive/delete action is decided, plus an audit trail entry for that transition.
- `ProjectEntry`/`CertificationEntry`/`InternshipEntry` are shown as structured sub-objects; if they need independent querying (e.g., "find all students with a Revit-tagged project") at scale, they may be promoted to their own tables rather than JSON/embedded structures.
- NAAC/NBA reporting (Phase 4) will likely require additional derived/materialized views over `Application` and `PlacementDrive` history rather than schema changes to the core tables.
