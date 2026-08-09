# TNPArch V4.0 — Product Requirements & Architecture Plan

**Status:** APPROVED WITH DECISIONS. All open questions in §24 are resolved (either by explicit user decision or by default-approval of this document's own recommendation, each marked accordingly). Implementation has **not** started — per the approving instruction, work stops after this document and the finalized milestone plan (§17) until explicit approval to begin milestone A0.

**Decision record:** approved by the user on the date of this revision, covering Q1 (profile approval authority), Q3 (Save/Shortlist model), Q9 (Publication Studio scope), plus explicit direction on Canva/Photoshop claims, Internships, and Security (rate limiting scope + Student Account Settings). All other recommendations in the original draft are approved as written, per the user's "general approval unless conflicting" instruction — see §24 for the full resolution log.

**Author context:** Written after a full research pass over the current codebase (post-V3.0, tag `v3.0.0`, commit `c4f810e`). Every claim about "what exists today" below was verified by reading the actual source, not assumed from memory of earlier versions.

---

## 0. Executive Summary

V4.0 turns TNPArch from an internal administration platform into the full public-facing placement product: a public student directory, a recruiter engagement workflow (save/shortlist/express interest), a real placement/internship/alumni pipeline, a Publication Studio, notifications, global search, and reporting — all wired into one integrated data model rather than duplicated per feature.

Three research findings materially change the shape of this plan versus what a spec-only reading would suggest:

1. **The public marketing pages are 100% static.** `src/app/(marketing)/students`, `/recruiters`, `/placements` etc. render hardcoded copy from `src/lib/*-content.ts` files — zero database access. The "Public Student Directory" is not an extension of these pages; it is a new, separate route tree with a new anonymous-safe data-access path. The marketing pages stay as marketing pages.
2. **`Company`, `PlacementDrive`, `Application`, and `ApplicationStatusEvent` are already fully designed** in `docs/database/08_Database_Design.md` (field-level) but never implemented — the schema's own header comment calls them out as intentionally deferred "Phase 2" entities. This significantly de-risks the Placement Pipeline work: the ER design doesn't need to be invented, only implemented, migrated, and validated against V4.0's actual requirements (which mostly confirm the old design, with one deviation noted in §5).
3. **Coordinators can currently fully approve or reject student profile drafts** (`canApproveOrRejectDraft` grants Secretary and scoped-Coordinator identical power — this is live, frozen V2.0 behavior, not a bug). **DECIDED (Q1):** Secretary is now the sole final approval authority platform-wide, for both registration requests and profile-draft approval. This is an explicitly-authorized change to existing V2.0 behavior (not a "modify without cause" violation — the user's approval explicitly requires it) and is now a scheduled milestone, not an open question. See §5.2, §9, §10, §24.

Where the request describes something as its own large subsystem but the platform's own "don't duplicate data" principle argues for folding it into something else, the recommendation was approved as written. The two instances: **Internships** (a `type` field on `PlacementDrive`, not a parallel entity tree — **approved**) and **Publication Studio's editor** (template-driven for V4.0, not a freeform drag-drop canvas — **approved**, see §0.1).

### 0.1 Publication Studio scope — DECIDED

**Approved: template-driven Publication Studio for V4.0, not a freeform canvas.** The Secretary or either Coordinator picks a professional template, the system auto-populates it from real data (selected batch's approved students, recruiter logos, stats), and the editor allows content selection, reordering, and block-level editing — not freeform canvas placement. This satisfies "select batch → auto-generate profile pages → edit → export" directly. A true freeform canvas (layers, shapes, arbitrary drag-drop, Canva/Figma-style tooling) is confirmed as a **V5.0 candidate**, explicitly out of scope for V4.0. Elaborated in §13.

---

## 1. Complete Version 4.0 PRD

### 1.1 Goals
- Give the public (unauthenticated) the ability to discover approved students through a professional directory, without ever exposing private contact information.
- Give recruiters a lightweight, fast way to save, organize, and formally express interest in students — with students controlling the response.
- Replace direct Secretary/Coordinator-initiated student account creation (for public applicants) with a reviewable registration-request pipeline where only the Secretary can approve or reject.
- Give the Secretary and both Coordinators (T&P, Alumni — titles only, identical permissions) real operational dashboards backed by live data.
- Build a real placement lifecycle (Company → Drive → Application → status history) reusing the schema design already written for it.
- Build internship tracking as a variant of the placement lifecycle, not a parallel system.
- Build alumni records that connect to the real student data that produced them.
- Build a template-driven Publication Studio that pulls from the same data these other features already produce.
- Extend the existing generic notification, search, and export infrastructure rather than building parallel systems for each.

### 1.2 Non-goals (V4.0)
- A freeform drag-drop publication canvas — **confirmed V5.0 candidate** (§0.1).
- Native `.psd` export (technically impractical — see §13.3).
- Real-time collaboration (websockets) on publications — polling/refresh-on-navigation approved as sufficient at this scale (§24, Q6).
- A generalized "analytics" subsystem with trend charts beyond real, non-fabricated numbers in the dashboards/reports already specified — resolved to the conservative reading by default approval (§24, Q4).
- Company self-service accounts — `Company` is a directory record referenced by `RecruiterProfile`, not a login-capable entity (§24, Q5).
- Named, multi-list recruiter shortlist collections — **decided against for V4.0** (Q3); a real `RecruiterShortlist`/`RecruiterShortlistItem` pair is a V5.0 candidate only if a hard dependency later requires it.

---

## 2. Information Architecture

```
PUBLIC (unauthenticated)
├── / (marketing home — unchanged)
├── /about, /contact, /placements, /students, /recruiters (marketing — unchanged)
├── /directory                      [NEW] Public Student Directory (card grid, filters)
├── /directory/[studentId]          [NEW] Public Student Profile (read-only, privacy-respecting)
└── /login

STUDENT (authenticated)
├── /student                        [REWORK] Career hub (was: profile editor only)
├── /student/profile                [NEW, split out] Profile draft editor (existing content, own route)
├── /student/applications           [NEW] My applications (placement + internship)
├── /student/interests               [NEW] Recruiter interest inbox (accept/decline)
├── /student/notifications          [NEW] Notification history
└── /student/account                [NEW] Account Settings (parity gap — Secretary/Coordinator already have this)

RECRUITER (authenticated)
├── /recruiter                      [REWORK] Becomes the dashboard (Saved / Shortlisted / Interests / Drives overview) — decided, §24 Q2
├── /recruiter/directory            [MOVED from /recruiter] The existing search/filter card grid, unchanged in content
├── /recruiter/students/[id]        [EXISTING] Profile detail — gains Save + Express Interest actions
├── /recruiter/saved                [NEW] Saved students (includes the shortlisted subset — see §8, §23; no separate shortlist route)
├── /recruiter/interests            [NEW] Sent interests (active/accepted/completed)
├── /recruiter/drives                [NEW] Placement drives open to this recruiter's company
└── /recruiter/company               [NEW] Company profile (read/edit own)

COORDINATOR & SECRETARY (authenticated, shared admin shell)
├── /dashboard                      [ENRICH, incremental] Operational overview
├── /dashboard/registrations        [NEW] Registration request review queue
├── /dashboard/registrations/[id]   [NEW] Request detail — Coordinator: comment/mark; Secretary: approve/reject
├── /dashboard/students, /batches, /approvals, /audit, /exports   [EXISTING, unchanged]
├── /dashboard/companies             [NEW] Company directory (Secretary manages; Coordinators view)
├── /dashboard/placement-drives      [NEW] Drive management + applications/shortlisting/interviews
├── /dashboard/internships          [NEW] Internship tracking (drive type = INTERNSHIP, plus post-offer states)
├── /dashboard/alumni                [NEW] Alumni records
├── /dashboard/publications          [NEW] Publication Studio (list + editor)
├── /dashboard/reports               [RENAME/EXTEND of /exports] Reports with more formats/types
├── /dashboard/admin/*               [EXISTING V3.0, unchanged] Coordinators, Recruiters, Directory, Academic Year
└── /dashboard/account               [EXISTING, unchanged]
```

**Deliberate decisions embedded above:**
- The Student portal splits from one page into a real multi-route app (`/student`, `/student/profile`, `/student/applications`, …) because it's about to hold genuinely different concerns (dashboard vs. editor vs. applications vs. inbox) — cramming all of it into one page (as today) won't scale past this release.
- The Recruiter portal keeps `/recruiter` as the directory (preserving the existing bookmark/muscle-memory) and adds `/recruiter/dashboard` as the new landing experience. **Resolved (§24, Q2, default-approved):** `/recruiter` becomes the dashboard on login, with the directory moving to `/recruiter/directory`, for consistency with the Student/Admin pattern (both land on an overview, not a working list). The route tree in this section reflects that decision — `/recruiter` below now refers to the dashboard's data, and the directory is `/recruiter/directory`.
- `/dashboard/exports` becoming `/dashboard/reports` is a rename-and-extend, not a new parallel system — the existing CSV export use cases and `toCsv` infra are the foundation, not a competing implementation.

---

## 3. Updated Navigation Structure

| Role | New/changed nav items (grouped, matching existing `SheetLayout` convention) |
|---|---|
| Secretary & Coordinator (shared) | **Workflow**: + Registrations. **Placement**: + Companies, Placement Drives, Internships (Secretary + scoped Coordinator visibility identical). **People**: + Alumni. **Studio**: + Publications (new group). **Resources**: Exports → renamed Reports. Existing Students/Batches/Approvals/Audit unchanged. Administration group (Coordinators/Recruiters/Directory/Academic Year) unchanged, Secretary-only items unchanged. |
| Student | Overview (was the only item) stays as `/student`; + Applications, + Recruiter Interests, + Notifications, + Account Settings. |
| Recruiter | Dashboard (new default landing, replaces Directory as the entry point); + Directory (existing search/filter grid, now a secondary nav item), + Saved (includes shortlisted subset), + Interests, + Placement Drives, + Company Profile. |
| Public (no nav — marketing `PublicNav`) | + "Student Directory" link added to `PublicNav`, pointing at `/directory`. |

All of this reuses `SheetLayout`'s existing grouped-nav-item array pattern (`{ href, label, icon, group? }`) — no new nav primitive needed.

---

## 4. Role / Permission Matrix

Legend: **Full** = unrestricted, **Scoped** = batch-scoped or own-record-only, **Final** = exclusive final-decision authority, **View** = read-only, **—** = no access.

| Capability | Public | Student | Recruiter | Coordinator | Secretary |
|---|---|---|---|---|---|
| View public directory / public profile (privacy-respecting) | View | View | View | View | View |
| Edit own profile draft | — | Full (own) | — | — | — |
| Submit profile for review | — | Full (own) | — | — | — |
| **Approve/reject profile draft** | — | — | — | — (request changes only) | Final |
| Save a student (includes shortlist flag) | — | — | Full (own saves) | — | — |
| Express interest in a student | — | — | Full | — | — |
| Accept/decline recruiter interest | — | Full (own) | — | — | — |
| Submit registration request | Full | — | — | — | — |
| Mark registration Reviewed / Needs Attention | — | — | — | Scoped | Scoped |
| **Approve/reject registration request** | — | — | — | — | **Final** |
| Create accounts (any role) | — | — | — | — | Final |
| View students | — | Own | Scoped (approved public only) | Scoped | Full |
| View recruiters | — | — | Own company | View | Full |
| Manage recruiter accounts | — | — | — | — | Final |
| View recruiter interests | — | Own (received) | Own (sent) | Scoped | Full |
| Manage companies | — | — | View/edit own | View | Full |
| Manage placement drives | — | Apply (own) | View (own company's) | Scoped, no publish | Full |
| Manage internships | — | Apply (own) | View (own company's) | Scoped, no publish | Full |
| Manage alumni records | — | — | — | Full (operational) | Full |
| Publication Studio | — | — | — | Full | Full |
| Reports | — | Own data only | Own data only | Scoped | Full |
| Global search | Directory only | Role-scoped | Role-scoped | Scoped | Full |
| Academic Year Transition, Coordinator/Recruiter admin CRUD, Bulk Import | — | — | — | — | Final (unchanged from V3.0) |

**Coordinator "position" (T&P / Alumni) is a display label only** — it does not appear as a column distinction above because, per your explicit requirement, both positions have byte-for-byte identical permissions. It's a `CoordinatorProfile.position` field for UI/reporting/rotation purposes, never read by any permission function.

---

## 5. Database Impact Analysis

### 5.1 New models

```
Company                 — id, name, sector, logoFileId → FileAsset?, website?, createdAt
                           (lifted from docs/database/08_Database_Design.md's Phase-2 design)

PlacementDrive          — id, companyId → Company, title, type: PLACEMENT | INTERNSHIP,
                           eligibility (JSON: minCgpa, backlogAllowance, eligibleBatchIds),
                           packageOrStipend, description, status: DRAFT|ANNOUNCED|IN_PROGRESS|CLOSED,
                           applicationDeadline, createdByUserId, createdAt
                           ⚠ deviation from the old doc design: adds `type` so Internships reuse this
                           table instead of a parallel entity (see §0, §23).

Application              — id, studentProfileId, placementDriveId,
                           currentStatus: APPLIED|SHORTLISTED|INTERVIEW|OFFER|REJECTED|
                                          ACCEPTED|ACTIVE|COMPLETED|WITHDRAWN
                           (extends the old doc's 5-state enum with 4 post-offer states so
                           Internship's "Active/Completion" lifecycle lives on the same model —
                           see §0, §11.)
                           currentRound: int?, appliedAt

ApplicationStatusEvent  — id, applicationId, fromStatus, toStatus, note?, changedByUserId, occurredAt
                           (append-only history — exactly as originally designed)

InternshipOutcome        — id, applicationId (1:1, only when drive.type == INTERNSHIP and status
                           reaches ACTIVE+), certificateFileId → FileAsset?, companyFeedback?,
                           studentFeedback?, completedAt?
                           (the internship-specific tail end of the lifecycle, kept OFF Application
                           itself so a placement Application never carries irrelevant certificate/
                           feedback columns)

AlumniProfile             — id, studentProfileId → StudentProfile (nullable, for rare pre-platform
                           alumni with no student record), fullName, graduationYear, currentCompany?,
                           designation?, location?, portfolioUrl?, linkedInUrl?,
                           mentorshipAvailable: boolean, createdAt

RegistrationRequest       — id, email, fullName, rollNumber, batchId → Batch, submittedData (JSON —
                           whatever self-reported fields you want at signup, kept separate from
                           StudentPrivateProfile until approved), status:
                           SUBMITTED|REVIEWED|NEEDS_ATTENTION|APPROVED|REJECTED,
                           coordinatorComment?, reviewedByUserId?, reviewedAt?,
                           decidedByUserId?, decidedAt?, rejectionReason?,
                           resultingStudentProfileId? → StudentProfile (set on approval)

RecruiterStudentInteraction — id, recruiterProfileId, studentProfileId, savedAt?: DateTime,
                           isShortlisted: boolean, @@unique([recruiterProfileId, studentProfileId])
                           (collapses "Save" and "Shortlist" into one row with two flags — approved
                           per Q3, §23, over separate named-collection tables)

RecruiterInterestRequest — id, recruiterProfileId, studentProfileId, message?: String,
                           status: SENT|ACCEPTED|DECLINED|COMPLETED,
                           sentAt, respondedAt?, completedAt?,
                           @@unique([recruiterProfileId, studentProfileId]) — the mechanism that
                           satisfies "prevent duplicate submissions."

Publication               — id, title, type: enum (BROCHURE|BOOKLET|PORTFOLIO_BOOK|ANNUAL_REPORT|
                           NEWSLETTER|MAGAZINE|CUSTOM), templateId → PublicationTemplate?,
                           status: DRAFT|PUBLISHED|ARCHIVED, contentJson (block tree — see §13),
                           pageSize: A4_PORTRAIT|A4_LANDSCAPE|A3|CUSTOM, customDimensions?,
                           createdByUserId, lastEditedByUserId, lastEditedAt, createdAt

PublicationVersion         — id, publicationId, versionNumber, contentJsonSnapshot, createdByUserId,
                           createdAt, label? (append-only — the "version history / restore"
                           requirement, mirrors the AcademicYearTransitionRun "frozen snapshot"
                           pattern already established in this codebase)

PublicationTemplate        — id, name, type (matches Publication.type), thumbnailFileId?,
                           structureJson (the block-tree skeleton + data-binding slots),
                           status: DRAFT|ACTIVE|ARCHIVED, createdByUserId, createdAt

PublicationExport           — id, publicationId, format: PDF|PPTX|PNG|JPEG, storageKey → FileAsset,
                           generatedAt, generatedByUserId
                           (each export is a FileAsset-backed artifact, generated by a background job
                           — never inline in a request; see §13.4, §19)
```

### 5.2 Modified existing models and permissions

- **`src/modules/auth/domain/permissions.ts` — `canApproveOrRejectDraft` split (DECIDED, Q1).** No schema change; a permission-function change. Today this single function grants Secretary and scoped-Coordinator identical approve/reject power over profile drafts. It is split into: `canRequestProfileChanges(actor, targetBatchId)` (Secretary any, Coordinator scoped — same logic as today, used only by `RequestChangesUseCase`) and a new `canApprovePublicProfile(actor)` (Secretary-only, used only by `ApproveDraftUseCase`). This is a real behavior change to existing, frozen V2.0 functionality, explicitly authorized by the Q1 decision — not an incidental change. Existing tests in `tests/unit/profiles/` that assert a Coordinator can approve a draft must be updated to assert `NotAuthorizedError` instead; a new test confirms Coordinators can still request changes. Scheduled as milestone A0 (§17) since every other Coordinator-facing permission in this plan is designed around the same "review, never decide" boundary, and this makes the codebase consistent with it from the start rather than retrofitting later.
- `CoordinatorProfile` — add `position: CoordinatorPosition? (T_AND_P | ALUMNI)`. Display/reporting only, per §4.
- `RecruiterProfile` — add `companyId → Company` (replacing free-text `companyName`, with a migration that creates/matches `Company` rows from existing distinct `companyName` values — see §20). Keep `companyName` as a short deprecation window read-through, then drop.
- `StudentPublicProfile` — add `isPubliclyDiscoverable: boolean @default(true)` and `showCgpa: boolean @default(false)` (the concrete implementation of "students control visibility of sensitive information," §7). Reuse `User.avatarFileId` for the profile photo — **no new photo field needed** (see §22).
- `Notification` — extend `NotificationChannel` enum with `IN_APP` (additive; existing `EMAIL` untouched) — the concrete backing for the notification bell that's already stubbed as a placeholder in `SheetLayout`'s header.
- `AuditLog` — no schema change; new action constants added to `AUDIT_ACTIONS` per new module, following the existing convention.

### 5.3 Migration sequencing

One migration per milestone (the pattern already established across V0–V3), never one giant schema change. Order: registration request → coordinator position → recruiter interactions/interest → company/drive/application → internship outcome → alumni → publication (3 models, likely 2 migrations since templates can precede publications) → notification channel.

### 5.4 Indexing

Every new foreign key gets an explicit `@@index` (the V3.0 review caught one omission — `BulkImportRun.batchId` — that shouldn't recur here). `RecruiterStudentInteraction` and `RecruiterInterestRequest` both need their `@@unique([recruiterProfileId, studentProfileId])` for the duplicate-prevention requirement, which Postgres will also use as an index. `Application` needs `@@index([studentProfileId])` and `@@index([placementDriveId])`. Search-relevant text columns (`Company.name`, `PlacementDrive.title`, `Publication.title`) are candidates for Postgres `tsvector` generated columns — see §15.

---

## 6. API Impact Analysis

New route groups (each following the existing `withAuth(handler, { roles })` + Clean Architecture module pattern):

- `/api/public/directory`, `/api/public/directory/[studentId]` — **new, deliberately unauthenticated**, following the exact precedent `/api/files/[fileId]` already set (unauthenticated, but the repository itself structurally guarantees only safe rows are ever reachable — see §7, §18).
- `/api/registration` (POST, public), `/api/registration/[id]` (GET/PATCH, Coordinator+Secretary), `/api/registration/[id]/decide` (POST, Secretary-only).
- `/api/recruiters/saved` (query supports an `isShortlisted` filter — no separate `/shortlist` route, per Q3), `/api/recruiters/interests` (+ `[id]/respond` for the student-facing accept/decline, which lives under `/api/students/interests/[id]/respond` instead, since it's a student action on their own inbox).
- `/api/companies`, `/api/companies/[id]`.
- `/api/placement-drives`, `/api/placement-drives/[id]`, `/api/placement-drives/[id]/applications`, `/api/applications/[id]/status`.
- `/api/internships/[applicationId]/outcome`.
- `/api/alumni`, `/api/alumni/[id]`.
- `/api/publications`, `/api/publications/[id]`, `/api/publications/[id]/versions`, `/api/publications/[id]/export`, `/api/publication-templates`.
- `/api/reports/*` — extends the existing `/api/exports/*` route family rather than replacing it.
- `/api/search` — extends `CommandPalette`'s existing (currently client-embedded) search logic into a real server endpoint covering the new entity types.
- `/api/notifications` (GET, for the in-app notification center) `/api/notifications/[id]/read`.

**Existing routes that change behavior, not shape:** `/api/students` (create) stays admin-only exactly as today — registration approval calls the *same* `CreateStudentUseCase` internally, it doesn't get a new public variant. `/api/recruiters/students/[id]` (detail) gains response fields for interaction state (saved/shortlisted/interest-sent) when called by an authenticated recruiter.

---

## 7. Student Workflow

1. **Discovery (public):** anonymous visitor browses `/directory`, filters by batch/skills, opens a card → `/directory/[id]`. Only students with `isPubliclyDiscoverable: true` on an `APPROVED`, active-batch profile ever appear — enforced at the repository query level (same structural-guarantee pattern as the existing recruiter directory), never a post-fetch filter.
2. **Registration:** prospective/incoming student submits a `RegistrationRequest` (public form, rate-limited — §18). No account exists yet.
3. **Review:** Coordinator (either position) opens the queue, adds comments, marks `REVIEWED` or `NEEDS_ATTENTION`. Cannot decide.
4. **Decision:** Secretary reviews (sees Coordinator's comments), approves or rejects. Approval triggers `CreateStudentUseCase` (unchanged) + `AdminResetPasswordUseCase`'s temp-credential mechanism (unchanged) — reveal-once temp password, forced change on first login. Rejection notifies the applicant with a reason.
5. **Onboarding:** student logs in, forced password change (existing gate), lands on `/student` (career hub).
6. **Profile:** existing draft → submit → Coordinator may request changes (not approve) → Secretary approves/publishes (per Q1) → publish flow, otherwise unchanged in mechanics, now surfaced from the career hub rather than being the whole app.
7. **Recruiter interest:** student sees interest requests in `/student/interests`, accepts or declines. Acceptance notifies the Secretary to facilitate the connection per department policy (no direct contact info exchange — the platform never hands the recruiter the student's email/phone; the Secretary is the intermediary, matching your explicit "Recruiters should NOT directly receive student contact information" requirement).
8. **Placement:** student applies to open `PlacementDrive`s from the career hub, tracks status through the same lifecycle Coordinators/Secretary see.

## 8. Recruiter Workflow

**Simplified per Q3: Save + Express Interest only for V4.0** — no separate named-shortlist system. "Shortlisted" is a boolean promotion on an already-saved student, surfaced as a filtered view of Saved, not a separate feature.

1. Authenticated recruiter browses the directory (`/recruiter/directory`), now with Save / Express Interest actions on every card and detail page.
2. **Save** — one tap, private, toggles `RecruiterStudentInteraction.savedAt`. No form.
3. **Shortlist** — one tap (promotes an already-saved student), toggles `isShortlisted`. Also private, still lives on the same saved record — `/recruiter/saved` filters to it, no separate route/table.
4. **Express Interest** — one tap opens a lightweight inline panel (not a modal wizard) with only an optional short message field, submits immediately. Recruiter identity/company are already known from the session — nothing else is asked. Duplicate prevented by the unique constraint (attempting again just shows the existing "Interest Sent" state, not an error). Confirmation is inline ("✓ Interest Sent"), not a redirect.
5. Recruiter tracks sent interests in `/recruiter/interests`, sees Accepted ones move toward "Secretary will facilitate contact" messaging (never a raw contact-info reveal).
6. Recruiter browses open `PlacementDrive`s scoped to their company, views applicants once shortlisting begins (Secretary/Coordinator-managed).

## 9. Coordinator Workflow

Identical for both positions (T&P / Alumni are labels only, §4) — this identity is enforced by never branching any permission function on `position`, only ever on `role === "COORDINATOR"`. Coordinators can: registration review (comment/mark, no decision), profile draft review (comment/request-changes, no approve — Q1), student/recruiter/placement/internship/alumni *viewing and operational task management*, Publication Studio (full access, same as Secretary), report generation. No account creation, no role changes, no approve/reject/override authority anywhere in the platform — this is already exactly how V3.0 built Coordinator scope for every existing capability, so V4.0 is consistent, not novel, here.

## 10. Secretary Workflow

Everything Coordinators can do, plus: final decision authority on registration requests and profile drafts (Q1), full company/recruiter/coordinator account management (unchanged from V3.0), full placement drive publishing authority, alumni record management, and the operational dashboard's complete (unscoped) view.

## 11. Placement Lifecycle

```
Profile Created → Profile Reviewed → Placement Ready → Applied → Shortlisted → Interview → Offer → Placed
```

Implemented as: `StudentProfile` creation → `StudentPublicProfileDraft` → `APPROVED`/published (existing) → a student-facing "placement ready" is simply *has a published profile + is in an active batch*, no new field needed → `Application` rows against `PlacementDrive`s, `currentStatus` walking `APPLIED → SHORTLISTED → INTERVIEW → OFFER → ACCEPTED`, each transition appended to `ApplicationStatusEvent` (audit trail, never mutated in place — directly mirrors the existing `AuditLog`/`ApplicationStatusEvent`-as-designed pattern). "Placed" = `ACCEPTED`. All pipeline counts on dashboards/reports are `COUNT(*) ... GROUP BY currentStatus` against real rows — never a separately-maintained summary number that can drift from reality.

For `PlacementDrive.type === INTERNSHIP`, the same status walk applies through `OFFER → ACCEPTED`, then continues `→ ACTIVE → COMPLETED` (the two extra states referenced in §5.1), with `InternshipOutcome` attached once `ACTIVE` is reached.

## 12. Notification Architecture

Extends the existing generic pipeline (`notificationService.notify()` → job dispatch → `NotificationJobHandler` → provider) — no new plumbing, only new templates and one new channel:

- New `NotificationChannel.IN_APP` (additive to the existing `EMAIL`-only enum) — persisted `Notification` rows render in a new notification-center dropdown wired to the bell icon `SheetLayout`'s header already reserves (currently a literal "not yet available" placeholder).
- New templates (each a new `NotificationTemplateId` + a definition file, exactly the existing "purely additive" pattern documented in the notifications module): `REGISTRATION_SUBMITTED`, `REGISTRATION_REVIEWED`, `REGISTRATION_DECIDED`, `RECRUITER_INTEREST_RECEIVED`, `RECRUITER_INTEREST_RESPONDED`, `PLACEMENT_DRIVE_ANNOUNCED`, `APPLICATION_STATUS_CHANGED`, `DEADLINE_REMINDER`, `PUBLICATION_PUBLISHED`, `ANNOUNCEMENT_POSTED`.
- Delivery stays dual-channel per template (email for anything time-sensitive/off-platform-relevant like deadlines and decisions; in-app for everything, since the bell is now real).
- No websockets — the notification center polls on navigation/interval (§24, Q6) via the same `apiClient` pattern every other page already uses.

## 13. Publication Studio (Approved V4.0 Scope — Q9)

Both T&P Coordinator and Alumni Coordinator have **full** access, identical to the Secretary (§4, §9) — this is a platform-wide capability, not a Secretary-only tool with Coordinator viewing rights.

### 13.1 What ships in V4.0
A **template-driven** studio, not a freeform canvas, implementing exactly the approved flow:

**Choose Template → Select Real Platform Data → Auto-populate → Edit Text/Images/Content Blocks → Reorder Blocks → Preview → Save Draft → Version → Publish → Export**

1. Secretary or either Coordinator picks a `PublicationTemplate` (a pre-built structure with named data-binding slots, e.g. "cover → intro → per-student profile page × N → recruiter logos page → back cover") for one of: Placement Brochures, Department Brochures, Recruiter Booklets, Student Portfolio Books, Internship Publications, Alumni Publications, Annual Reports, Event Booklets, Newsletters, Custom Publications.
2. For data-bound templates (e.g. Placement Brochure): select batch → select approved students (multi-select, reusing the `useRowSelection` pattern already built) → system auto-populates one content block per selected student, sourced live from `StudentPublicProfile` (never copy-pasted/retyped — this is the direct implementation of "do not duplicate student information manually"). Recruiter Booklets bind to `Company`/`RecruiterProfile` data the same way; Alumni Publications bind to `AlumniProfile`; Annual Reports bind to real placement-cycle counts (§11).
3. Editing is block-level: reorder blocks (drag-to-reorder a list, not a freeform canvas), toggle block visibility, edit static text/heading blocks, swap images, adjust a small set of per-template style choices (accent color, font pairing from a curated set — not arbitrary typography).
4. **Preview** renders the current draft state exactly as it will export, before any Save/Publish commitment.
5. **Save Draft** persists `Publication.contentJson` (status `DRAFT`); **Version** — every Publish action appends a `PublicationVersion` snapshot (§13.4); **Publish** flips status to `PUBLISHED` and makes the publication's latest export available to its intended audience (e.g., a Recruiter Booklet becomes visible on the Recruiter Dashboard).
6. **Export** triggers a background job (never inline — see §19) producing a `PublicationExport` artifact.

### 13.2 What's explicitly deferred (V5.0 candidate)
Freeform drag-drop canvas placement, arbitrary shapes, layer stacking/z-order, custom QR code placement anywhere on the page, pixel-level positioning. All of these require building an actual canvas-editing engine (hit-testing, undo/redo stack, snapping/alignment guides, serialization format robust enough to survive re-opening) — this is a different, much larger class of engineering problem than the rest of this PRD.

### 13.3 Export formats — honest capability statement

Per the approval's explicit instruction, every format is classified against three distinct capability tiers, and the in-product copy states the tier plainly rather than a blanket "compatible" claim:

- **Layered/native** — the format preserves the original tool's real internal object model (true layers, editable vector shapes, re-openable as a native project). **Nothing this system produces qualifies for Photoshop or Canva at this tier** — neither has a practical, honestly-implementable native writer available to this stack (`.psd` is a proprietary binary format with no viable open-source writer; Canva has no public project-file import format at all).
- **Editable** — the format's content (text, shapes, images) can be manipulated as real objects in the destination tool, not just moved/cropped as a flat picture. **PPTX qualifies**: generated via a real library (e.g. `pptxgenjs`), it genuinely opens and edits as native slides in PowerPoint, Keynote, and Google Slides. This is the strongest honest claim this system makes for any third-party tool.
- **Importable** — the format can be brought into another tool only as a flat image/asset (background layer, placed image), with no internal structure preserved. **PNG, JPEG, and PDF-as-image qualify for Canva and Photoshop.** Documented in-product as "Import into Canva/Photoshop as an image" — never as "Canva-compatible" or "Photoshop-compatible."

Concrete per-format support:
- **PDF** — full support, first-class, generated server-side (headless rendering of the block tree). Layered/native for PDF viewers/editors that understand PDF's own object model (e.g. Acrobat); Importable-only for Canva/Photoshop.
- **PPTX** — full support via a real generation library. **Editable** in PowerPoint/Keynote/Slides — the one format where "you can actually edit this" is a true statement.
- **PNG / JPEG** — full support, one raster image per page. Importable-only anywhere.
- **Canva / Photoshop workflow** — no native round-trip. Practical, documented workflow: export high-resolution PNG or PDF per page, import as a background/reference image. Never advertised as more than that.

This directly satisfies the instruction not to overclaim: the product will say exactly which tier applies to each destination, every time an export format is offered.

### 13.4 Collaboration & versioning
`PublicationVersion` is an append-only snapshot table (mirrors the `AcademicYearTransitionRun` frozen-plan pattern already in this codebase) written on every Publish action, giving real version history/restore. `lastEditedByUserId`/`lastEditedAt` on `Publication` itself covers "last edited by/when." Simultaneous-edit conflicts are avoided with a simple optimistic lock (a `version` integer bumped on every save, compared on write, "someone else edited this — reload" on mismatch) rather than operational-transform/CRDT machinery, which would be substantial infrastructure for a two-coordinator-plus-secretary editing group.

## 14. Placement Drive / Internship detail

Covered structurally in §5.1/§11. UI-wise: a drive creation form (Company picker, title, type toggle, eligibility criteria, deadline), an application board per drive (grouped by `currentStatus`, reusing the existing `Badge`/`Table` primitives — a kanban-style board is a nice-to-have, not required for V4.0; a grouped table is sufficient and far cheaper to build), and an interview-scheduling sub-panel (date/time/mode fields on the `Application`, no calendar-sync integration in scope).

## 15. Search Architecture

Extend the existing `CommandPalette` (already role-aware, already searches students+batches for Secretary/Coordinator) rather than building a new UI. Backend: add a real `/api/search` endpoint backed by Postgres `tsvector` generated columns on the new searchable text fields (`Company.name`, `PlacementDrive.title`, `Publication.title`, plus the existing `StudentProfile.fullName`/`rollNumber`) — full-text search, not `ILIKE '%term%'` scans, given the entity-count growth. Results are role-filtered server-side using the same permission functions every other endpoint uses (a Recruiter's search never returns a Student's private data, a Student's search never returns other students' applications, etc.).

## 16. Reporting Architecture

Extend, don't replace, the existing `/dashboard/exports` module (rename to Reports in nav — §2, §3). New report types (Placements, Internships, Alumni, Publications usage) are new `ExportColumn<T>` definitions against the new repositories, reusing `toCsv`. New format support: XLSX (new dependency, e.g. `exceljs`) and PPTX (shared with Publication Studio's export engine — one PPTX-writing capability serving two features, not two).

## 17. Final Implementation Milestones

Grouped into 5 phases. Each milestone gets its own migration (where schema changes), its own full validation gate (tsc/eslint/vitest/build), its own unit+integration tests, and its own Playwright verification — the exact discipline used throughout V0–V3. This supersedes the draft's "Recommended" table — all open questions that shaped sequencing are now resolved (§24), so this is the plan to execute against once you approve starting A0.

| # | Milestone | Depends on |
|---|---|---|
| **Phase A — Foundations for everything else** |
| A0 | **Restrict `canApproveOrRejectDraft` to Secretary-only** (Q1 decision) — split into `canRequestProfileChanges` (Coordinator-scoped, unchanged) + `canApprovePublicProfile` (Secretary-only, new). Update `ApproveDraftUseCase`, existing `tests/unit/profiles/` tests. Done first, standalone, so every later Coordinator-facing milestone is built against the final permission model from day one rather than retrofitted. | — |
| A1 | Coordinator `position` field (trivial, standalone) | — |
| A2 | Rate-limiting/abuse-prevention infrastructure — now scoped explicitly to public registration, public directory, public profile access, authenticated recruiter discovery/search, **and existing authentication endpoints (login/refresh)** (§18, expanded per approval) | — |
| A3 | Student-facing Account Settings page (parity gap, direct prerequisite for A5) | Reuses V3.0 Account Settings work |
| A4 | `Company` model + admin CRUD (Secretary-managed, Coordinator-viewable) | — |
| A5 | Reuse `User.avatarFileId` for public directory photo — no schema work, just student-facing upload UI | A3 |
| **Phase B — Registration & Public Discovery** |
| B1 | `RegistrationRequest` model + public submission form + rate limiting | A2 |
| B2 | Coordinator review queue (comment/mark, no decision) | B1 |
| B3 | Secretary decision + account creation integration (reuses `CreateStudentUseCase`/`AdminResetPasswordUseCase`) | B2, A0 |
| B4 | `StudentPublicProfile.isPubliclyDiscoverable`/`showCgpa` + public directory repository (privacy-safe query path) | A0 |
| B5 | Public Directory UI (`/directory`, `/directory/[id]`) | B4, A5, A2 (rate limiting on the public read path) |
| **Phase C — Recruiter Engagement (Save + Express Interest only, per Q3)** |
| C1 | `RecruiterStudentInteraction` (save, with an `isShortlisted` flag — no separate shortlist table/UI) + UI on existing directory/detail pages | — |
| C2 | `RecruiterInterestRequest` + Express Interest UI + duplicate prevention | C1 |
| C3 | Student interest inbox (`/student/interests`, accept/decline) + Secretary facilitation notification | C2 |
| C4 | Recruiter dashboard (`/recruiter` becomes the dashboard; directory moves to `/recruiter/directory` — Q2) consolidating C1–C3 data | C3 |
| **Phase D — Placement Pipeline, Internships, Alumni** |
| D1 | `PlacementDrive` + `Application` + `ApplicationStatusEvent` (implements the pre-designed ER model, with the `type` field deviation — Internships confirmed as a drive-type variant, not a parallel entity, per approval) | A4 |
| D2 | Drive management UI (Secretary/Coordinator, both positions identical) + student application UI | D1 |
| D3 | Application status board + interview sub-panel | D2 |
| D4 | `InternshipOutcome` + post-offer lifecycle UI | D1 |
| D5 | `AlumniProfile` + alumni CRUD/UI | — (independent, can run parallel to D1–D4) |
| D6 | Student Career Dashboard v2 — enrich `/student` with real applications/interviews/offers now that D1–D3 exist | D3 |
| **Phase E — Studio, Search, Notifications, Reports (the integration wave)** |
| E1 | `IN_APP` notification channel + notification center UI (bell) | — |
| E2 | New notification templates, wired into B/C/D milestones retroactively where missed | E1, B1-D5 |
| E3 | `PublicationTemplate` + `Publication` + `PublicationVersion` models | — |
| E4 | Publication Studio editor (block-level, template-driven per §13, full access for Secretary + both Coordinator positions) | E3, D1 (for data-bound templates), A4, D5 (for Recruiter Booklet / Alumni Publication data binding) |
| E5 | Publication export pipeline — **PDF + PNG/JPEG first**, PPTX as a fast-follow within the same milestone group once the render pipeline is proven (§23) | E4 |
| E6 | Global search expansion (`/api/search`, Postgres FTS, CommandPalette wiring) | A4, D1, E3 |
| E7 | Reports expansion (rename Exports → Reports, new report types, XLSX; PPTX report export reuses E5's engine) | D1, D4, D5, E3, E5 |
| E8 | Secretary/Coordinator dashboard final enrichment pass (registration/interest/drive/publication stat panels) | All of B–E |

**Cross-phase note:** dashboards are *not* saved entirely for E8 — each of B–D adds its own StatPanel/section to the relevant dashboard as it ships (e.g., B3 adds "Pending Registrations" to the Secretary dashboard immediately), matching the "one platform, continuous integration" principle rather than one large risky dashboard milestone at the very end. E8 is the final polish/consistency pass, not the only pass.

**Next action after your approval to proceed:** begin A0. A0 is intentionally the very first thing implemented — it's the smallest, most self-contained milestone in the entire plan (one permission function split + test updates, no new schema, no new UI), and every later Coordinator-facing milestone (B2, C-phase Coordinator views, D2, E4) is designed assuming it's already in place.

## 18. Security Risks

1. **No rate-limiting infrastructure exists anywhere in this codebase today** (verified — every existing surface is authenticated). **Approved (expanded scope, per approval): rate limiting is required on five surfaces, not just the new public ones:**
   - Public student registration (`/api/registration`) — abuse could create junk registration requests at volume.
   - Public student directory (`/api/public/directory`) — anti-scraping.
   - Public profile access (`/api/public/directory/[studentId]`) — anti-scraping, and slows any attempt to enumerate the full student list.
   - Authenticated recruiter discovery/search (`/api/recruiters/students`, `/api/recruiters/dashboard`) — even though authenticated, an abusive or compromised recruiter account should not be able to bulk-scrape the entire directory.
   - **Existing authentication endpoints** (`/api/auth/login`, `/api/auth/refresh`) — this retrofits a real, pre-existing gap (no brute-force protection has ever existed on login), explicitly authorized as part of this approval rather than an unrequested change to frozen functionality.
   
   Implementation: a Postgres-backed token-bucket limiter (per-IP for public routes, per-account for authenticated ones), consistent with "avoid new infrastructure at this scale" — the same reasoning that justified the DB-backed job queue over a message broker. This is milestone A2, built first, before any of the surfaces it protects go live.
2. **CGPA opt-in leakage risk.** `showCgpa` must be enforced server-side in the public repository's query/projection, never trusted from a client-supplied parameter, and must never expose the rest of `StudentPrivateProfile` even when true — only the single CGPA value, joined narrowly.
3. **Public directory must never leak email/phone.** Directly extend the existing DTO-whitelist pattern (`RecruiterStudentProfileDTO` + its dedicated `dto-whitelist.test.ts` regression test) to the new public DTO — same discipline, same kind of test, for the new surface.
4. **Publication export (PDF/PPTX rendering) is a resource-exhaustion / potential SSRF vector** if implemented via a headless-browser renderer that can fetch arbitrary URLs. Must run as a sandboxed background job with no outbound network access beyond the app's own asset storage, with a hard timeout and memory ceiling.
5. **File uploads (student avatar via the reused mechanism) already have an established size/MIME allowlist** (2MB, JPEG/PNG/WebP) — no new risk, just reuse.
6. **Registration submission is the first public form that creates a durable record** (not just an email, like the existing marketing contact form) — needs the same validation rigor as any authenticated create-use-case (Zod schema, no trust of client-supplied `batchId` without existence/status validation, exactly like `CreateStudentUseCase` already does).

## 19. Performance Risks

1. **Public directory needs real server-side pagination.** Every existing admin list page fetches-everything-client-side (fine at department scale, ~dozens to low hundreds of rows, always authenticated). A public, unauthenticated, potentially-larger, no-login-required directory should not follow that pattern — implement actual offset/cursor pagination in the repository and API from the start, not the client-side `Pagination` component's current "paginate an already-fetched array" model.
2. **Global search must use Postgres full-text search**, not `ILIKE` scans, once the entity count grows past students+batches — see §15.
3. **Publication export is CPU/memory-intensive** and must never run inline in a request handler — background job queue only (already the established pattern for anything heavier than a simple CRUD write).
4. **N+1 risk in "auto-generate student profile pages from selected students"** — must batch-fetch selected students' public profiles in one query (`findMany({ where: { id: { in: [...] } } })`), not one query per student. This is a direct lesson from the V3.0 review's own N+1 findings — the plan calls it out explicitly so it isn't repeated at larger scale.
5. **Dashboard aggregation queries** (registration counts, interest counts, drive counts) should be simple `COUNT`/`GROUP BY` queries against real tables, not cached/materialized summary tables — correct at this data scale, and consistent with "no fabricated statistics."

## 20. Data Migration Requirements

- `RecruiterProfile.companyName` (string) → `companyId` (FK): backfill script creates/matches `Company` rows from every distinct existing `companyName` value, then points each `RecruiterProfile` at the matched row. Given today's data volume (a handful of seeded/real recruiters), this is a low-risk, easily-reviewable one-time script, not a live-traffic migration concern.
- `StudentPublicProfile.isPubliclyDiscoverable` defaults `true`, `showCgpa` defaults `false` — additive, no backfill logic needed beyond the column default.
- No destructive migrations anywhere in this plan — every new field is additive, every new model is a new table. Existing V3.0 functionality is untouched at the schema level except the two additive columns and the one FK migration above.

## 21. Testing Strategy

Continue the established pattern exactly: one unit test file per use case (happy path + permission-denial + domain-error branches) against in-memory fakes, integration tests for every job-queue flow (mirroring the existing `tests/integration/*` real-JobWorker pattern), Playwright verification for every new page against a real login.

**Two changes based directly on the V3.0 review's findings:**
1. **Frontend test coverage is budgeted per-milestone, not deferred.** The V3.0 review found 8 admin pages with zero automated coverage, caught only in a final pass. V4.0 has far more UI surface (public directory, student career hub, recruiter dashboard, publication editor) — each milestone's Definition of Done includes at least one committed RTL test per new page, not just a one-off Playwright script.
2. **New standing requirement: every public-facing (unauthenticated) query gets a dedicated privacy-regression test**, mirroring the existing `dto-whitelist.test.ts` precedent — asserting private fields are structurally absent from the response type/DTO, not just "usually not populated."

## 22. Features Added (Approved)

1. **Rate-limiting/abuse-prevention infrastructure** (§18) — approved, scope expanded to include existing auth endpoints.
2. **Student-facing Account Settings page** — approved, explicitly called out in the approval.
3. **`IN_APP` notification channel + real notification center** — approved by default (general approval clause); the bell icon is already reserved in the header, V4.0 is the natural point to make it real.
4. **Postgres full-text search indexes** — approved by default; a performance necessity once Global Search covers more than 2 entity types.
5. **Reuse `User.avatarFileId` for the directory photo requirement** instead of a new field — approved by default; smaller surface, already-built and tested upload path.

## 23. Features Removed or Simplified (Approved)

1. **Publication Studio's editor: freeform canvas → template-driven** (§0.1, §13) — **approved (Q9).** Freeform canvas confirmed as a V5.0 candidate.
2. **"Save" + "Shortlist" as two separate named-collection systems → one `RecruiterStudentInteraction` row with two flags.** **Approved (Q3).** No named/multiple shortlist collections in V4.0; a real `RecruiterShortlist`/`RecruiterShortlistItem` pair is a V5.0 candidate only if a hard dependency later requires it — none has been identified in this PRD.
3. **Internships as a `PlacementDrive.type` variant, not a parallel entity tree** (§0, §5.1, §11) — **approved**, explicitly per "data entered once, reused everywhere."
4. **PPTX export sequenced as a fast-follow after PDF/PNG** within milestone E5, not a separate later milestone — approved by default (general approval clause).
5. **No Photoshop-native, no Canva-native export** (§13.3) — approved, with the three-tier Importable/Editable/Layered framework now the explicit documentation standard for every export format.

## 24. Decision Log — All Questions Resolved

Every question from the draft is resolved below. Items marked **EXPLICIT** were decided directly by name in the approval message. Items marked **DEFAULT-APPROVED** were not named individually but fall under "all other recommendations in the V4.0 PRD are approved unless they conflict with the decisions above" — this distinction is kept visible rather than blurred, since a default approval is a lower-confidence signal than a named decision and is worth re-confirming quickly if any implementer's reading of it seems off during a milestone.

1. **Profile-draft approval scope — EXPLICIT (Q1).** Secretary is the sole final approval authority platform-wide, for both registration requests and profile-draft approval. Coordinators may review, comment, mark Reviewed/Needs Attention, and request changes — never approve, reject, or override. Implemented as milestone A0 (§5.2, §17); this is a real, approval-authorized change to existing V2.0 behavior.
2. **Recruiter portal landing route — DEFAULT-APPROVED (this document's own recommendation).** `/recruiter` becomes the dashboard; the directory moves to `/recruiter/directory`. Reflected in §2, §3, §17 (C4).
3. **Shortlist semantics — EXPLICIT (Q3).** Save + Express Interest only. No named/multiple shortlist collections in V4.0. "Shortlisted" is a boolean flag on a saved-student record, not a separate feature. A named-collection system is explicitly deferred to V5.0 and only if a hard dependency later emerges — none has been identified in this document.
4. **"Real-data analytics" scope — DEFAULT-APPROVED (conservative reading, per "keep V4.0 focused on actual department workflows" and "do not add speculative features simply because they are technically possible").** Resolved as: dashboards and reports show real, non-fabricated numbers (already the design throughout this plan) — no separate Analytics subsystem with trend/comparison charts is in scope for V4.0.
5. **Company as a login-capable entity — DEFAULT-APPROVED.** `Company` is a pure directory record referenced by `RecruiterProfile`; recruiters continue to authenticate as individuals. No company-account concept in V4.0.
6. **Notification delivery cadence — DEFAULT-APPROVED.** Polling/refresh-on-navigation for the in-app notification center. No websockets/real-time push infrastructure in V4.0.
7. **Rate-limiting implementation — DEFAULT-APPROVED, scope EXPLICITLY EXPANDED.** Postgres-backed token bucket (no new infra dependency), consistent with the codebase's established "avoid additional infrastructure at this scale" philosophy. Scope explicitly expanded by the approval to cover authentication endpoints in addition to the new public surfaces and recruiter discovery — see §18.
8. **Interview scheduling depth — DEFAULT-APPROVED.** Simple date/time/mode fields on `Application`. No calendar integration (Google Calendar/Outlook sync) in V4.0.
9. **Publication Studio scope — EXPLICIT (Q9).** Template-driven for V4.0. Freeform canvas, layers, arbitrary shapes, and advanced design tooling are a confirmed V5.0 candidate, explicitly excluded from V4.0.
10. **Canva/Photoshop compatibility claims — EXPLICIT.** No native/layered compatibility claimed for either tool. Every export format is documented against the three-tier Importable/Editable/Layered framework (§13.3); only PPTX earns "Editable," nothing earns "Layered/native" for Canva or Photoshop.
11. **Internships as a `PlacementDrive.type` variant — EXPLICIT.** Approved exactly as recommended; no parallel Internship entity tree.
12. **Rate limiting overall — EXPLICIT.** Approved, with the five-surface scope in §18.
13. **Student Account Settings — EXPLICIT.** Approved, confirmed in scope for V4.0 (milestone A3).

---

*End of V4.0 PRD. Status: approved with the decisions recorded above. Per the approval's explicit instruction, implementation has not started — work stops after this document and §17's finalized milestone plan, pending explicit approval to begin milestone A0.*
