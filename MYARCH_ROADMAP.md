\# MYARCH — MASTER IMPLEMENTATION ROADMAP



> This file is the master product specification, implementation roadmap,

> execution contract, testing checklist and project state for MYARCH.

>

> Claude Code MUST read this file before making changes.

>

> MYARCH is an existing production-oriented application.

> Do not rebuild working systems unnecessarily.

>

> ================================================================

> PROJECT STATE

> ================================================================



CURRENT\_PHASE: 2

STATUS: IN\_PROGRESS

LAST\_COMPLETED\_PHASE: 1

BLOCKED: FALSE

BLOCK\_REASON: none. Phase 2 (\# 3, "MAINTENANCE & REQUESTS") is partially complete: at the Technical Secretary's explicit direction, \#3.8's Task/Follow-up Engine was extracted and built FIRST, as standalone reusable infrastructure, deliberately BEFORE Maintenance (\#3.1–3.6), the Generic Request System (\#3.7), or the Maintenance Dashboard (\#3.9) — none of those have been started. See the Phase 2 report under "\# 3. PHASE 2 — MAINTENANCE & REQUESTS" below for exactly what is and isn't done. \*\*Phase 3 must not begin\*\* until the remainder of Phase 2 (\#3.1–3.7, \#3.9) is implemented and this section reads COMPLETE.



\---



\# 0. MASTER EXECUTION RULES



\## 0.1 ROLE



Act as the senior:

\- product architect

\- full-stack engineer

\- database architect

\- security engineer

\- UX engineer

\- QA engineer

\- DevOps engineer



for the existing MYARCH codebase.



The objective is to evolve the existing application into a complete department-wide digital governance and technical operations platform.



MYARCH IS NOT A TnP PORTAL.



The product identity, terminology, navigation and workflows must reflect MYARCH and the Technical Secretary's responsibilities.



\---



\# 0.2 EXISTING CODEBASE FIRST



The existing repository is the source of truth for what already exists.



This roadmap is the source of truth for what MYARCH should become.



Reconcile both.



DO NOT:

\- blindly rebuild existing functionality

\- replace working architecture unnecessarily

\- create duplicate systems

\- assume something is missing without checking

\- assume something works without testing



\---



\# 0.3 FIRST ACTION — AUDIT ONLY



On the FIRST execution of this roadmap:



DO NOT:

\- modify source files

\- create application files

\- modify Prisma schema

\- create migrations

\- install packages

\- change environment variables

\- change deployment configuration

\- modify database data

\- seed production data

\- commit

\- push



Only inspect and understand the repository.



After the audit, create/update the implementation plan inside this roadmap.



Do not implement product features until the audit is complete.



\---



\# 0.4 NEVER GUESS



Inspect the actual repository before making architectural decisions.



Inspect at minimum:



\- package.json

\- lockfile

\- Prisma schema

\- migrations

\- authentication

\- authorization

\- middleware

\- API routes

\- services

\- use cases

\- components

\- layouts

\- dashboards

\- navigation

\- forms

\- storage

\- email

\- notifications

\- tests

\- deployment configuration

\- environment variable usage



Search the repository before creating anything.



\---



\# 0.5 REUSE BEFORE CREATE



Before creating any:



\- model

\- enum

\- API

\- route

\- service

\- use case

\- component

\- hook

\- utility

\- notification system

\- task system

\- file system

\- permission

\- search system

\- audit system



search the existing repository first.



If an existing implementation can safely be extended, extend it.



DO NOT create duplicate:

\- user systems

\- role systems

\- notification systems

\- task systems

\- upload systems

\- audit systems

\- search systems

\- form systems

\- workflow systems



\---



\# 0.6 DO NOT BREAK WORKING FEATURES



Do not unnecessarily:

\- rewrite authentication

\- replace Prisma

\- replace the database

\- replace the frontend framework

\- replace the existing API architecture

\- rename working models

\- delete working routes

\- delete migrations

\- remove working features



If a change is genuinely necessary, document why.



\---



\# 0.7 DATABASE SAFETY



NEVER run destructive commands against production.



NEVER:

\- run `prisma migrate reset`

\- reset production database

\- delete production records

\- run destructive production SQL

\- delete historical migrations

\- drop tables casually



Use safe additive migrations.



Before schema changes:

1\. inspect existing schema

2\. inspect migrations

3\. inspect affected relations

4\. identify data risks

5\. implement migration

6\. verify migration

7\. test affected workflows



\---



\# 0.8 SECRETS



Never hard-code:

\- passwords

\- database credentials

\- API keys

\- JWT secrets

\- email credentials

\- storage credentials

\- encryption keys



Never expose server-side secrets to clients.



Never commit secrets.



\---



\# 0.9 SERVER-SIDE SECURITY



Frontend permission checks are NOT security.



Every protected API/action must independently verify:

\- authentication

\- role

\- permission

\- ownership where applicable

\- entity state

\- academic year

\- confidentiality

\- administrative authority



Never trust:

\- client-submitted role

\- client-submitted user ID

\- client-submitted permission

\- client-submitted status

\- hidden UI controls



\---



\# 0.10 TERMINOLOGY



Use these exact terms:



MYARCH

Technical Secretary

Coordinator

Coordinators

Student

Alumni

Student Council

Core Committee

Committee

Election

Application

Maintenance Issue

Request

Project

Event

Resource

Asset

Facility



NEVER call the role:



"Technical Coordinator"



There are maximum 2 ACTIVE Coordinators.



\---



\# 0.11 IMPLEMENTATION METHOD



Always follow:



AUDIT

→ PLAN

→ IMPLEMENT

→ TEST

→ VERIFY

→ UPDATE ROADMAP

→ NEXT PHASE



Only one phase at a time.



Never work on multiple phases simultaneously unless the dependency genuinely requires it and is documented.



\---



\# 0.12 NO FAKE FEATURES



Every visible button/action must perform a real operation.



Do not create fake:

\- counters

\- charts

\- notifications

\- search

\- status changes

\- CRUD

\- workflows

\- database records



If something is not implemented, show an honest empty/unavailable state.



\---



\# 0.13 PHASE COMPLETION



A phase can only be marked COMPLETE when:



\- implementation works

\- database works

\- APIs work

\- authorization works

\- UI works

\- relevant tests pass

\- build passes

\- typecheck passes

\- lint passes

\- acceptance criteria pass

\- no known critical regression exists



\---



\# 0.14 BLOCKING RULE



If a serious problem occurs, STOP.



Examples:

\- production-data risk

\- destructive migration risk

\- security vulnerability

\- architectural conflict

\- unresolved build failure

\- unresolved test failure

\- missing information required for a safe decision

\- incompatible existing architecture



Set:



BLOCKED: TRUE



and document:

\- problem

\- affected files

\- cause

\- attempted solution

\- recommended solution

\- required decision



Do not silently invent a solution.



Do not continue to the next phase while BLOCKED.



\---



\# 0.15 PHASE REPORT



After every phase report:



PHASE:

STATUS:



IMPLEMENTED:

\- ...



FILES CHANGED:

\- ...



DATABASE:

\- ...



APIS:

\- ...



PERMISSIONS:

\- ...



TESTS:

\- ...



BUILD:

\- ...



SECURITY:

\- ...



KNOWN ISSUES:

\- ...



NEXT PHASE:

\- ...



Then update this roadmap.



\---



\# 1. COMPLETE REPOSITORY AUDIT



STATUS: COMPLETE



\## OBJECTIVE



Understand exactly what already exists before modifying anything.



\## AUDIT



Inspect:



1\. repository architecture

2\. package configuration

3\. Next.js structure

4\. Prisma schema

5\. migrations

6\. authentication

7\. authorization

8\. roles

9\. permissions

10\. middleware

11\. API routes

12\. services/use-cases

13\. dashboards

14\. student profiles

15\. student cards

16\. Edit Mode

17\. notifications

18\. email

19\. storage

20\. maintenance

21\. requests

22\. tasks

23\. calendar

24\. events

25\. meetings

26\. council

27\. committees

28\. forms

29\. applications

30\. interviews

31\. elections

32\. projects

33\. assets

34\. facilities

35\. inventory

36\. resources

37\. alumni

38\. mentorship

39\. search

40\. reports

41\. analytics

42\. activity feed

43\. audit logs

44\. archive

45\. deployment

46\. tests



\## CLASSIFICATION



Classify every major requirement as:



DONE

PARTIAL

MISSING

BROKEN

SECURITY RISK

ARCHITECTURAL CONFLICT



Reference actual:

\- files

\- routes

\- models

\- services

\- components



where possible.



\## OUTPUT



Produce:

\- architecture summary

\- existing functionality map

\- missing functionality

\- broken functionality

\- duplicate systems

\- security risks

\- database changes

\- recommended implementation order



DO NOT implement features during this phase.



\## AUDIT RESULTS (completed 2026-08-14)



\### ARCHITECTURE SUMMARY



Next.js 16 App Router, React 19, TypeScript strict, Prisma 6 + PostgreSQL (Neon in production), Tailwind v4, Vitest (184 test files / 1415 tests, all passing), Playwright installed but no committed e2e suite. Feature-first Clean Architecture under \`src/modules/\<name\>/{domain,application,infrastructure,presentation}\`, enforced by an ESLint \`no-restricted-imports\` module-boundary rule — outside code may only import a module's \`index.ts\` barrel. JWT access token (short-lived, kept in React memory only) + httpOnly rotating refresh-token cookie. A single \`withAuth\` higher-order function (not Next middleware.ts) wraps every API route: Authentication → JWT Validation → mustChangePassword gate → Role Validation → Batch Scope Validation → optional rate limit → handler. No dead code, no duplicate systems, no broken build found — the existing application is production-deployed (Vercel + Neon) and in good health.

Existing modules: \`auth\`, \`students\`, \`batches\`, \`coordinators\`, \`recruiters\`, \`companies\`, \`placements\`, \`registration\`, \`profiles\`, \`alumni\`, \`publications\`, \`notifications\`, \`jobs\`, \`academic-year\`, \`administration\`, \`exports\`, \`reports\`, \`search\`, \`public-directory\`.



\### EXISTING FUNCTIONALITY MAP (DONE)



\- Authentication: login, logout, refresh (rotating), self-service password change, self-service email change, avatar upload — \`src/modules/auth/\*\`, routes under \`src/app/api/auth/\*\`. Bcrypt cost \>= 12 enforced (\`src/modules/auth/infrastructure/bcrypt-password-hasher.ts\`). Password policy (\>=10 chars, \>=3 of 4 classes) enforced server-side.

\- Roles: SECRETARY, COORDINATOR, STUDENT, RECRUITER (\`prisma/schema.prisma\` \`enum Role\`). Secretary = unscoped "Super Admin" per \`docs/security/09\_User\_Roles\_and\_Permissions.md\`. Coordinator = batch-scoped via \`CoordinatorBatchScope\` join table ("zero rows = zero access").

\- Authorization: centrally in \`src/modules/auth/domain/permissions.ts\` — one hand-written boolean function per capability (e.g. \`canManageCoordinatorAccounts\`, \`canManageAlumni\`), never a generic delegated/granular permission-string system.

\- Student domain: \`StudentProfile\` + \`StudentPrivateProfile\` (CGPA, backlog, phone, confidential remarks) + \`StudentPublicProfile\`/\`StudentPublicProfileDraft\` (bio, skills, software, portfolioLinks, selectedProjects/certifications/internships as JSON, resume file, visibility flags \`isPubliclyDiscoverable\`/\`showCgpa\`) + draft/approve/publish workflow with Secretary-only final approval.

\- Recruiter domain: directory browsing, save/shortlist, interest requests, admin-managed accounts.

\- Placement domain: \`Company\`, \`PlacementDrive\` (PLACEMENT/INTERNSHIP type), \`Application\` lifecycle with append-only \`ApplicationStatusEvent\` audit trail, interview scheduling, internship outcomes.

\- Registration: public self-registration REQUEST (not an account) → Coordinator review/mark → Secretary approve/reject → account provisioned with a system-generated temp password.

\- Publications: a report/newsletter authoring studio (\`PublicationTemplate\`/\`Publication\`/\`PublicationVersion\`/\`PublicationExport\`) with PPTX/PDF export — 10 template kinds, versioning.

\- Alumni: \`AlumniProfile\` with a static \`mentorshipAvailable\` boolean flag only.

\- Notifications: in-app + email, read/unread, a template registry (\`src/modules/notifications/application/templates/\*\`) covering 11 placement/registration-domain events, backed by a generic background \`Job\` queue/worker (\`scripts/run-worker.ts\`).

\- Audit: \`AuditLog\` model + \`AuditRecorder\` port, recording actor/action/entity/entityId/metadata for admin actions across every existing module.

\- Academic year: an "Academic Year Transition Wizard" (\`src/modules/academic-year\`) that transitions \`Batch.status\` (ACTIVE→GRADUATED→ARCHIVED) and creates the next intake batch from a Secretary-reviewed plan — not a first-class \`AcademicYear\` entity with its own activate/close/archive lifecycle.

\- Search: \`src/modules/search\` — global search across Students/Companies/Drives/Publications only (permission-aware, role-appropriate field whitelisting).

\- Reports: \`src/modules/reports\` — placement funnel, my-placement-activity (student), my-recruiting-activity (recruiter), alumni, publications-usage. PPTX export.

\- File storage: local-disk (\`src/lib/file-storage.ts\`), path-traversal-safe, behind authenticated routes only — no object storage configured yet (env vars reserved, unused).

\- Rate limiting: login, refresh, recruiter-discovery, public-registration, public-directory (\`src/lib/rate-limiters.ts\`, Postgres token-bucket).

\- Deployment: Vercel + Neon Postgres, 17 migrations applied to production, \`next.config.ts\` clean (no \`output: standalone\`), \`DATABASE\_URL\`/\`JWT\_\*\` env vars validated via Zod in \`src/config/env.ts\` (lazy, first-use).



\### MISSING FUNCTIONALITY (roadmap-required, does not exist at any layer)



Confirmed by the complete Prisma model list (\`enum Role/BatchStatus/ProfileDraftStatus/FileClassification/NotificationChannel/NotificationStatus/JobStatus/RecruiterApprovalStatus/RegistrationRequestStatus/CoordinatorPosition/BulkRunStatus/AcademicYearTransitionStatus/PlacementDriveType/PlacementDriveStatus/ApplicationStatus/InterviewMode/RecruiterInterestStatus/PublicationType/PublicationTemplateStatus/PublicationStatus/PublicationPageSize/PublicationExportFormat/PublicationExportStatus\` and \`model User/RefreshToken/SecretaryProfile/CoordinatorProfile/CoordinatorBatchScope/RecruiterProfile/RecruiterStudentInteraction/RecruiterInterestRequest/Batch/StudentProfile/StudentPrivateProfile/StudentPublicProfile/StudentPublicProfileDraft/RegistrationRequest/FileAsset/Company/PlacementDrive/Application/InternshipOutcome/AlumniProfile/ApplicationStatusEvent/AuditLog/Notification/Job/BulkImportRun/AcademicYearTransitionRun/RateLimitBucket/PublicationTemplate/Publication/PublicationVersion/PublicationExport\` — this is the entire schema, 46 models/enums, all inspected) — none of the following exist as data, service, route, or UI layers:



\- Self-service signup + email verification + resend verification (MISSING — accounts today are only admin-provisioned or created via the RegistrationRequest approval flow; there is no public "create your own account and verify by email" path).

\- Forgot password / password-reset-by-email (MISSING — only an authenticated self-service change, and an admin-triggered temp-password reset, exist; no unauthenticated "email me a reset link" flow).

\- Granular delegated Coordinator permissions (\`maintenance.view\`, \`events.create\`, etc.) (MISSING — permissions are hardcoded per-capability functions, not a stored, delegable permission set).

\- Maximum-2-active-Coordinators enforcement (MISSING — \`CreateCoordinatorUseCase\` has no count check of any kind).

\- Maintenance issue tracking (category/priority/lifecycle/SLA/escalation) (MISSING — no model).

\- Generic Request system (MISSING — no model; \`RegistrationRequest\` is registration-specific, not generic).

\- Generic Task/follow-up engine (MISSING — no model; nothing to attach maintenance/events/meetings/elections/projects to).

\- Calendar, Events, Meetings, Announcements (MISSING — no models).

\- Council, Committees (incl. Core Committee), historical membership (MISSING — no models).

\- Generic Form builder + Application pipeline + Scrutiny + Interview management (MISSING — no models; the existing \`Application\`/interview-scheduling is placement-domain-specific, not reusable for council/committee/election applications).

\- Elections: lifecycle, ballots, voting, secret-ballot separation, counting, results (MISSING — no models; this is also the single highest-risk domain in the whole roadmap and needs its own dedicated security design pass before any schema work begins).

\- Projects (technical-ops), Assets/Equipment, Facilities/Bookings, Inventory (MISSING — no models).

\- Generic Resource Repository (forms/regulations/manuals/archives with versioning) (MISSING — \`FileAsset\` only backs avatars + private student documents + resumes + publication exports today, not a browsable document library).

\- Mentorship workflow (request/acceptance/session/history/feedback) (PARTIAL — only \`AlumniProfile.mentorshipAvailable: Boolean\` exists; no request/session model).

\- Direct messaging / discussion threads (MISSING — no model).

\- Activity feed distinct from the audit log (MISSING).

\- Archive-by-academic-year across the new domains (MISSING — depends on the domains above existing first).

\- "Technical Secretary" / "MYARCH" terminology in the UI (PARTIAL — backend/DB already say "MYARCH" per prior work; the Secretary role is not labeled "Technical Secretary" anywhere in the UI copy today).

\- Student profile fields the roadmap names but the schema doesn't have: preferred name, program (single-program department today), semester, SGPA, specialization, coursework, structured achievements (only a \`certifications\` JSON blob), activities (council/committee/clubs — blocked on those domains existing), interests, structured professional links (LinkedIn/GitHub/Behance — today one generic \`portfolioLinks\` string array), profile-completion percentage, a general document wallet (today: one resume + a confidential-documents relation, not a typed multi-document wallet with visibility/replace), student activity timeline, per-category notification preferences (PARTIAL/MISSING).

\- Image optimization pipeline: resizing, compression, thumbnail generation, dimension caps, WebP/AVIF (MISSING — \`UploadAvatarUseCase\` validates declared MIME type and a 2MB size ceiling only; no resize/compress/thumbnail step, no dimension check, no file-signature/magic-byte verification).

\- Opportunity Hub, Student/Coordinator/Technical-Secretary dashboards as specified in \# 18 (PARTIAL — role-specific dashboards exist today but surface only placement/profile/registration data; none of the new-domain widgets can exist until their data models do).

\- Dashboard Edit Mode / widget configuration (MISSING).

\- Demo Mode (REMOVED — a public demo-login feature existed and was deliberately and fully removed in a prior session at explicit user request; re-adding it would require a new decision, not a revival of old code).



\### BROKEN FUNCTIONALITY



None found. Full verification this session: \`npm run typecheck\` clean, \`npm run lint\` clean, \`npm test\` 184/184 files passing (1415/1415 tests), \`npm run build\` succeeds, \`git status\` clean.



\### DUPLICATE SYSTEMS



None found. No parallel user/role/notification/task/upload/audit/search/form systems exist to consolidate — because the systems this roadmap wants (task engine, form builder, etc.) do not exist yet at all, "reuse before create" applies going forward, not retroactively.



\### SECURITY RISKS / ARCHITECTURAL CONFLICTS (none are current vulnerabilities — flagged because Phase 1 cannot safely start without resolving them)



\- ARCHITECTURAL CONFLICT — hierarchy ambiguity: \# 2.1's diagram shows \`Technical Secretary → Super Admin → Coordinators\` (three tiers), but \# 2.2 immediately describes the Technical Secretary directly performing every Super Admin action ("creates Coordinators," "delegates permissions"), with no separate mention of who "Super Admin" is if not the Technical Secretary. The existing codebase already treats \`SECRETARY\` as the "Super Admin" title (\`docs/security/09\_User\_Roles\_and\_Permissions.md\`, "Secretary (Super Admin)") — i.e. today, Technical Secretary and Super Admin are the SAME role, not two tiers. Implementing \# 2.1 literally (as a real fourth role/tier) versus implementing it as a rename (Secretary becomes "Technical Secretary," "Super Admin" stays a title, not a tier) produces two structurally different Role models, migrations, and permission systems. This cannot be guessed — see \# 0.4 "NEVER GUESS" and \# 0.14's "missing information required for a safe decision."

\- SECURITY-SENSITIVE, NOT YET A VULNERABILITY — \# 2.4 requires signup, email verification, resend verification, and forgot-password to be "implemented/verified." None exist today. Adding them means adding brand-new, unauthenticated, public attack surface (account creation, email-based token verification/reset) to a production system that currently has none. \# 28's "AUTOMATED EXECUTION RULE" explicitly requires stopping for human approval before "changing authentication architecture" — this qualifies.

\- LOW-SEVERITY HARDENING GAP — \`UploadAvatarUseCase\` trusts the client-declared MIME type (Content-Type header) with no file-signature/magic-byte check. Not a new risk (pre-existing, already in production), but \# 21/\# 9.6 explicitly ask for this to be verified/hardened — noted for the Storage/Hardening phases (\# 14, \# 15), not Phase 1.

\- ELECTION DOMAIN FLAGGED EARLY — \# 7 (Election Management) has the strictest security requirements in the entire roadmap (secret ballot, one-person-one-vote, immutable finalized votes, election-lock). No election infrastructure exists today. When Phase 6 is reached, this needs its own dedicated design/threat-model pass before schema work, not an incidental extension of the existing \`Application\`/\`RegistrationRequest\` patterns.



\### DATABASE CHANGES REQUIRED (by future phase — none made during this audit)



\- Phase 1: possibly a Role/hierarchy change (pending the conflict above), a delegated-permission table for Coordinators, a max-2-active-Coordinators constraint, email-verification-token + password-reset-token tables.

\- Phase 2: MaintenanceIssue, generic Request, generic Task (reused by every later phase per \# 3.8 — build it once, correctly, here).

\- Phase 3: CalendarEvent/Event, Meeting, Announcement.

\- Phase 4: Council/Committee + historical membership.

\- Phase 5: Form/FormField/FormSubmission, generic Application pipeline, Scrutiny, Interview (generic, not placement-specific).

\- Phase 6: Election, Position, Candidate, Ballot/Vote (with the secret-ballot separation \# 7.6 requires — voter-eligibility/audit records must be structurally incapable of joining to an individual's ballot choice).

\- Phase 7: Project (technical-ops), Asset, Facility, Booking, InventoryItem, Resource/Document (generic, versioned).

\- Phase 8: StudentDocument (wallet), StudentActivityTimeline entry, NotificationPreference; new StudentPrivateProfile/StudentPublicProfile fields (preferred name, program, semester, SGPA, structured professional links, profile-completion tracking).

\- Phase 10: MentorshipRequest, MentorshipSession.

\- Phase 12: ActivityFeed entry (distinct from AuditLog).



Every addition above is additive (new tables/columns), consistent with \# 0.7's "safe additive migrations" — nothing inspected during this audit requires altering or dropping an existing table.



\### RECOMMENDED IMPLEMENTATION ORDER



Follow the roadmap's own phase order (0 → 16) — it is already correctly sequenced: foundation/auth/permissions first, then the reusable Task engine (Phase 2, explicitly designed for reuse by Phases 3–7 per \# 3.8), then the domains that build on it, then cross-cutting concerns (search/reports, archive, security hardening, performance, backup, final verification) last. No reordering is recommended. The one deviation to flag now: Phase 1 as written cannot be started without two decisions from the Technical Secretary/product owner first (see BLOCKED note on Phase 1 below) — everything from Phase 2 onward is unaffected by those two decisions and could in principle proceed once Phase 1's foundation work is unblocked and complete.



\## ACCEPTANCE



\- repository understood

\- existing systems mapped

\- duplicate systems identified

\- risks identified

\- implementation order established



\---



\# 2. PHASE 1 — MYARCH FOUNDATION



STATUS: COMPLETE



\## BLOCKED (2026-08-14)



PROBLEM:

Phase 1 cannot be implemented without guessing on two points that \# 0.4 ("NEVER GUESS") and \# 0.14 ("missing information required for a safe decision") both forbid guessing on.



1\. Hierarchy ambiguity (\# 2.1 vs \# 2.2): \# 2.1's diagram shows three tiers — \`Technical Secretary → Super Admin → Coordinators\`. \# 2.2 then describes the Technical Secretary performing every Super Admin action directly, with no separate description of a distinct "Super Admin" actor. The existing codebase already uses "Super Admin" as a TITLE for the Secretary role, not a separate tier (\`docs/security/09\_User\_Roles\_and\_Permissions.md\`: "Secretary (Super Admin)"). Two genuinely different implementations follow from the two readings: (a) Technical Secretary = Super Admin, one role, renamed — a straightforward relabel; or (b) a real new fourth role/tier sits between them — a new Role enum value, new permission model, new hierarchy logic, and a materially different Phase 1. These are not reconcilable without a decision from you.



2\. \# 2.4 requires signup, email verification, resend verification, and forgot-password to be "implemented/verified." The audit (\# 1) confirmed none of these exist today — accounts are only admin-provisioned or created via the existing RegistrationRequest-then-Secretary-approval flow. Adding self-service signup with email verification and an unauthenticated forgot-password flow means adding brand-new public, unauthenticated attack surface to a live production system. \# 28's "AUTOMATED EXECUTION RULE" explicitly lists "changing authentication architecture" as a condition requiring a stop for human approval before proceeding — this qualifies squarely, not marginally.



AFFECTED FILES (would be, once unblocked):

\`prisma/schema.prisma\` (Role enum and/or a new hierarchy table; new email-verification-token and password-reset-token tables), \`src/modules/auth/\*\` (new use cases: signup, verify-email, resend-verification, forgot-password, reset-password), new public API routes under \`src/app/api/auth/\*\`, \`src/modules/coordinators/\*\` (max-2-active-coordinator enforcement, granular permission storage), UI copy referencing "Secretary" (would become "Technical Secretary" if reading (a) above is confirmed).



CAUSE:

The roadmap document itself is internally ambiguous on point 1, and point 2 is a roadmap requirement that structurally requires expanding authentication's public attack surface — both are pre-conditions the roadmap's own rules (\# 0.4, \# 0.14, \# 28) require a human decision on before writing code, not an implementation difficulty.



ATTEMPTED SOLUTION:

None attempted — per \# 0.3 and \# 0.4, no source files, schema, or migrations were touched. This audit was read-only, as instructed.



RECOMMENDED SOLUTION:

Resolve point 1 first, in isolation (it is the cheaper, lower-risk decision and affects how point 2's tables are scoped). Once resolved: implement \# 2.4's authentication additions as net-new, isolated use cases that do not modify \`LoginUseCase\`, \`RefreshAccessTokenUseCase\`, or \`withAuth\` — matching the pattern already used for every other auth extension in this codebase (e.g. self-service password/email change were added as new use cases alongside the original login/refresh, not by rewriting them). Enforce max-2-active-Coordinators and build the granular Coordinator-permission model in the same pass, since both live in \`src/modules/coordinators\`/\`src/modules/auth\` alongside the hierarchy decision.



REQUIRED DECISION (from you):

1\. Is "Super Admin" in \# 2.1 the same role as "Technical Secretary" (a rename/relabel of the existing SECRETARY role), or a genuinely separate role/tier that does not exist today?

2\. Confirm you want self-service signup + email verification + forgot-password added now, in Phase 1, as new public authentication surface — or whether that should be deferred/scoped differently (e.g. admin-provisioned accounts only, no public signup, matching how the system works today).



Phase 1 will resume immediately once these are answered — no further audit work is needed first.



\## RESOLVED (2026-08-14)



Both required decisions were answered by the Technical Secretary in a single message:



1\. HIERARCHY: "Super Admin" is NOT a separate role — Technical Secretary IS the Super Admin authority. The existing SECRETARY role is used as-is (reading (a) from the BLOCKED note above). No SUPER\_ADMIN role was created. Maximum 2 active Coordinators, enforced server-side. Coordinators receive granular permissions delegated by the Technical Secretary.



2\. AUTHENTICATION: Self-service signup, email verification, resend-verification, forgot-password and reset-password ARE to be implemented now, with explicit per-role rules — STUDENT/ALUMNI/RECRUITER self-signup allowed (email verification required; RECRUITER and ALUMNI additionally require admin approval before functional access); COORDINATOR and TECHNICAL SECRETARY accounts remain admin-provisioned only, never self-registrable. The client can never select an administrative role on any public signup form — the account type is fixed per-endpoint server-side.



Implementation proceeded exactly as scoped in RECOMMENDED SOLUTION above: net-new, isolated use cases layered onto the existing LoginUseCase/RefreshAccessTokenUseCase/withAuth without modifying their internals, plus the coordinators changes in the same pass.



\---



\## PHASE REPORT



PHASE: 1 — MYARCH Foundation



STATUS: COMPLETE



IMPLEMENTED:

\- Technical Secretary display label (SECRETARY role identifier unchanged) — "Super Admin" is a description of the Secretary's authority, not a separate role.

\- Coordinator hierarchy: max 2 ACTIVE Coordinators enforced server-side (\`MaxActiveCoordinatorsError\`, checked in \`CreateCoordinatorUseCase\` and on the reactivation branch of \`SetCoordinatorActiveUseCase\`).

\- Granular Coordinator permission delegation: a fixed, forward-declared catalog of capability keys (\`COORDINATOR\_PERMISSION\_KEYS\`), stored as \`CoordinatorProfile.permissions String[]\`, Secretary-editable via a dedicated endpoint and admin UI, threaded through JWT claims → \`AuthenticatedActor.permissions\` → \`hasCoordinatorPermission()\` for future phases to gate on.

\- \`Role.ALUMNI\` added (purely additive enum value); \`AlumniProfile\` gained an optional \`userId\`/\`user\` relation and an \`approvalStatus\` (reusing the existing PENDING/APPROVED/REJECTED enum) so an Alumni row can optionally back a real login account.

\- Email verification: opaque, HMAC-hashed, single-use tokens (24h TTL) covering three signup shapes (Student registration request, Recruiter self-signup, Alumni self-signup) via one shared \`EmailVerificationToken\` table with nullable \`userId\`/\`registrationRequestId\`. Issue/verify/resend use cases, rate-limited public routes.

\- Forgot-password / reset-password: opaque HMAC-hashed tokens (1h TTL), anti-enumeration (identical response whether or not the account exists), all existing refresh tokens revoked on a successful reset, audited as \`PASSWORD\_CHANGED\` with \`metadata: { via: "email\_reset" }\`.

\- Student registration: \`RegistrationRequest.emailVerifiedAt\` gate — \`DecideRegistrationRequestUseCase\` now refuses to APPROVE an unverified request (\`RegistrationEmailNotVerifiedError\`); REJECT is unaffected.

\- Recruiter self-signup: public, rate-limited endpoint creates an inactive User + PENDING RecruiterProfile, reuses the pre-existing (previously dormant) \`ApproveRecruiterUseCase\`/\`RejectRecruiterUseCase\`, extended to flip \`User.isActive\` on approval and notify the applicant.

\- Alumni self-signup: same shape as Recruiter, built from scratch (the module previously had only directory CRUD, no account lifecycle) — new \`SignupAlumniUseCase\`, \`ApproveAlumniUseCase\`, \`RejectAlumniUseCase\`, \`AlumniUserProvisioner\` port.

\- Public UI: \`/verify-email\`, \`/forgot-password\`, \`/reset-password\`, \`/recruiters/signup\`, \`/alumni/signup\`; an honest "Coming Soon" Alumni holding dashboard at \`/alumni\` (no fabricated features, per \# 0.12); a Coordinator permission editor on the admin Coordinator detail page; inline Approve/Reject affordances added to the admin Alumni page for PENDING self-signups (mirroring the existing Recruiters admin page).

\- All administrative roles (COORDINATOR, SECRETARY) remain fully admin-provisioned — no public endpoint accepts a client-supplied role.



FILES CHANGED:

\- \`prisma/schema.prisma\`: \`Role.ALUMNI\`; \`EmailVerificationToken\`, \`PasswordResetToken\` (new tables); \`User.emailVerifiedAt\`; \`CoordinatorProfile.permissions\`; \`RegistrationRequest.emailVerifiedAt\`; \`AlumniProfile.userId\`/\`approvalStatus\`.

\- \`src/modules/auth/\*\`: new use cases (issue/verify/resend email verification, forgot-password, reset-password), new token-repository ports + Prisma implementations, \`permissions\` threaded through JWT claims and \`AuthenticatedActor\`, \`hashPassword\` exported for reuse by recruiters/alumni signup.

\- \`src/modules/coordinators/\*\`: \`domain/permissions.ts\` (new), max-active-coordinator checks, \`updateCoordinatorPermissionsUseCase\`, permissions route + validation.

\- \`src/modules/registration/\*\`: email-verification gate on approval, \`markRegistrationRequestEmailVerified\`.

\- \`src/modules/recruiters/\*\`: \`SignupRecruiterUseCase\`, self-signup provisioner, \`approveAndActivate\`, notification wiring on approve/reject.

\- \`src/modules/alumni/\*\`: full account-lifecycle vertical added (signup, approve, reject, provisioner, new ports/errors) alongside the existing directory CRUD.

\- \`src/modules/notifications/\*\`: 4 new template IDs (\`EMAIL\_VERIFICATION\`, \`PASSWORD\_RESET\_REQUESTED\`, \`ACCOUNT\_SIGNUP\_PENDING\_REVIEW\`, \`ACCOUNT\_SIGNUP\_DECIDED\`).

\- \`src/lib/rate-limiters.ts\`: \`signupRateLimiter\`, \`tokenConsumptionRateLimiter\`, \`emailTriggerRateLimiter\`.

\- \`src/lib/coordinator-permissions.ts\` (new): client-safe mirror of the permission-key catalog — a client component importing a runtime value from a module's barrel (\`@/modules/coordinators\`) pulls in that module's Prisma/Node-only route handlers and breaks the browser bundle; this file exists specifically to avoid that (matches the pre-existing \`coordinator-position.ts\` precedent).

\- New app routes: \`/api/auth/{verify-email,resend-verification,forgot-password,reset-password}\`, \`/api/recruiters/signup\`, \`/api/alumni/{signup,[id]/approve,[id]/reject}\`, and public pages listed above.



DATABASE:

\- Migration \`20260814130715\_myarch\_phase1\_auth\_roles\_signup\`, generated via \`prisma migrate diff\` against the pre-Phase-1 schema.

\- Rehearsed against a local Docker Postgres container (18 migrations applied cleanly, \`prisma migrate status\` confirmed up to date) before being applied to production.

\- Applied to the production Neon database via \`prisma migrate deploy\` — 18/18 migrations, up to date, zero errors.

\- The raw \`prisma migrate diff\` output included 4 spurious \`DROP INDEX\`/\`ALTER COLUMN ... DROP DEFAULT\` statements against the \`searchVector\` GIN-indexed generated columns (companies/placement\_drives/publications/student\_profiles) — a known Prisma limitation diffing \`Unsupported("tsvector")\` \`GENERATED ALWAYS AS ... STORED\` columns, unrelated to any Phase 1 change. These were manually excluded from the applied migration file; re-running the diff after applying confirms only that same pre-existing, harmless drift remains (full-text search is unaffected).

\- Every schema change is additive (new tables, new nullable/defaulted columns, one new enum value) — no data loss, no destructive operation, no backfill required.



APIS:

\- \`POST /api/auth/verify-email\`, \`POST /api/auth/resend-verification\`, \`POST /api/auth/forgot-password\`, \`POST /api/auth/reset-password\` — all public, rate-limited.

\- \`POST /api/recruiters/signup\`, \`POST /api/alumni/signup\` — public, rate-limited, server-fixed role (client cannot select an administrative account type).

\- \`POST /api/alumni/[id]/approve\`, \`POST /api/alumni/[id]/reject\` — Secretary-only (mirrors the existing recruiter admin routes).

\- \`PATCH /api/coordinators/[id]/permissions\` — Secretary-only.



PERMISSIONS:

\- COORDINATOR and TECHNICAL SECRETARY (SECRETARY role) accounts remain 100% admin-provisioned; no code path allows a public request to create either.

\- Every new self-signup use case hard-codes its own target role/account type server-side — the request schemas never accept a role field.

\- Coordinator granular permissions default to empty (zero rows = zero access, matching the existing \`batchScope\` convention) and are visible/editable only by SECRETARY.



TESTS:

\- 194 test files / 1483 tests passing (full suite, \`vitest run\`), zero live-DB dependency (in-memory fakes throughout).

\- New coverage: email verification, forgot/reset-password, registration email-gate, recruiter signup + extended approve/reject, alumni signup + approve/reject (30 new alumni tests alone).

\- One pre-existing, unrelated flaky test (\`jwt-token-service.test.ts\` "rejects a tampered token") observed once across many full-suite runs — a base64url single-character-mutation edge case, reproducibility not confirmed, not caused by this phase's changes (traced and documented, not modified).



BUILD:

\- \`npx tsc --noEmit\`: clean.

\- \`npm run lint\`: clean.

\- \`npx next build\` (Turbopack): clean — first attempt failed (\`TurbopackInternalError\`: a client component pulling \`node:fs/promises\` into the browser bundle via a runtime import from \`@/modules/coordinators\`'s barrel); fixed by moving the permission-key catalog to a client-safe \`src/lib\` file (see FILES CHANGED) and re-verified clean.



SECURITY:

\- Tokens: opaque, cryptographically random, HMAC-SHA256 hashed at rest (never stored raw), single-use, expiring (24h email verification, 1h password reset).

\- Anti-enumeration: forgot-password and resend-verification return an identical response regardless of whether the target account/email exists.

\- Rate limiting on every new public endpoint (signup, token consumption, email-triggering actions).

\- A successful password reset revokes every existing refresh token for that user.

\- No administrative role is ever self-registrable; server-side validation enforces the requested account type on every signup endpoint.



KNOWN ISSUES:

\- None blocking. UI for the new public flows is minimal/utility-styled (consistent with the existing \`/login\`, \`/change-password\` pages) rather than a full editorial treatment — acceptable for a Phase 1 foundation pass.

\- The Alumni Portal itself is an honest "Coming Soon" holding page — no alumni-specific features exist yet; later phases will build on the account/auth foundation laid here.



NEXT PHASE: 2 — see \# 3 below. Not yet started.



\---



\## OBJECTIVE



Establish the core MYARCH hierarchy, authentication, permissions and administration foundation.



\---



\## 2.1 HIERARCHY



Technical Secretary

└── Super Admin

&#x20;   ├── Coordinator 1

&#x20;   └── Coordinator 2



Maximum ACTIVE Coordinators = 2.



The limit must be enforced server-side and at database/business-logic level where appropriate.



\---



\## 2.2 TECHNICAL SECRETARY



Technical Secretary can:



\- manage MYARCH

\- create Coordinators

\- activate/deactivate Coordinators

\- delegate permissions

\- revoke permissions

\- assign work

\- reassign work

\- view Coordinator workload

\- view Coordinator activity

\- manage department workflows

\- manage elections

\- manage committees

\- manage events

\- manage maintenance

\- manage projects

\- manage resources

\- manage assets/facilities where authorized

\- manage reports

\- access audit information



\---



\## 2.3 COORDINATORS



Coordinator permissions must be granular.



Examples:



maintenance.view

maintenance.create

maintenance.assign

maintenance.manage



events.view

events.create

events.manage



applications.view

applications.review

applications.shortlist



interviews.manage



projects.manage



resources.manage



facilities.manage



assets.manage



inventory.manage



announcements.manage



A Coordinator must NOT automatically receive unrestricted Super Admin privileges.



\---



\## 2.4 AUTHENTICATION



Implement/verify:



\- signup

\- email verification

\- resend verification

\- login

\- logout

\- forgot password

\- password reset

\- password change

\- secure session/token handling

\- account activation/deactivation

\- rate limiting



Verification and reset URLs must use production APP\_BASE\_URL.



Never generate production links using localhost.



\---



\## 2.5 NOTIFICATIONS FOUNDATION



Create/reuse notification infrastructure.



Support:

\- in-app notifications

\- read/unread

\- notification history

\- relevant email notification hooks



\---



\## 2.6 AUDIT FOUNDATION



Create/reuse audit infrastructure.



Record important administrative actions.



\---



\## 2.7 ACADEMIC YEAR FOUNDATION



Support:

\- create academic year

\- activate

\- close

\- archive

\- current academic year

\- historical records



\---



\## ACCEPTANCE CRITERIA



\- Technical Secretary is Super Admin

\- maximum 2 active Coordinators

\- Coordinator permissions are granular

\- unauthorized API actions fail

\- signup works

\- email verification works

\- password reset works

\- notification foundation works

\- audit foundation works

\- academic year foundation works

\- existing authentication remains functional

\- build passes

\- typecheck passes

\- lint passes

\- relevant tests pass



\---



\# 3. PHASE 2 — MAINTENANCE \& REQUESTS



STATUS: IN\_PROGRESS — \#3.8 (Task/Follow-up Engine) COMPLETE; \#3.1–\#3.7 and \#3.9 NOT\_STARTED. See the Phase Report under \#3.8 below for full detail. Built out of the section's own internal order at the Technical Secretary's explicit instruction: the reusable engine \#3.7's Generic Request System and every later Maintenance workflow are expected to build on (per \#3.8's own "Use this system for... Do not create separate task systems") had to exist first.



\## OBJECTIVE



Create a complete, trackable department maintenance and request system.



\---



\## 3.1 MAINTENANCE CATEGORIES



\- electrical

\- plumbing

\- furniture

\- HVAC

\- network/internet

\- classroom/studio

\- lab

\- equipment

\- cleaning

\- safety

\- civil/building

\- other



\---



\## 3.2 REPORT



A maintenance issue can contain:



\- category

\- location

\- description

\- priority

\- photos

\- attachments

\- requester

\- created date



\---



\## 3.3 LIFECYCLE



SUBMITTED

→ ACKNOWLEDGED

→ ASSIGNED

→ IN\_PROGRESS

→ RESOLVED

→ VERIFIED

→ CLOSED



Support REOPENED.



\---



\## 3.4 COMPLAINANT TRACKING



Complainant must be able to see:



\- complaint ID

\- status

\- assigned person

\- timeline

\- updates

\- expected resolution

\- resolution details



When resolved:



\- notify complainant

\- show resolution

\- allow Confirm Resolved

\- allow Reopen



\---



\## 3.5 ASSIGNMENT



Technical Secretary/authorized Coordinator can:



\- assign

\- reassign

\- change priority

\- set deadline

\- add updates

\- resolve

\- reopen



All changes must be audited.



\---



\## 3.6 SLA / ESCALATION



Support:



\- priority

\- SLA

\- deadline

\- overdue

\- reminders

\- escalation



Reusable escalation engine should support future workflows.



Example:



Issue submitted

→ no action

→ Coordinator reminder

→ overdue

→ Technical Secretary alert

→ escalation



\---



\## 3.7 GENERIC REQUEST SYSTEM



Reusable request workflow:



SUBMITTED

→ REVIEW

→ ASSIGNED

→ IN\_PROGRESS

→ COMPLETED

→ CLOSED



Request contains:



\- requester

\- type

\- description

\- attachments

\- priority

\- owner

\- deadline

\- approval/rejection

\- comments

\- history



\---



\## 3.8 TASK / FOLLOW-UP ENGINE



Reusable tasks:



\- title

\- owner

\- deadline

\- priority

\- status

\- reminder

\- escalation

\- related entity



Statuses:



TODO

→ IN\_PROGRESS

→ BLOCKED

→ DONE

→ CANCELLED



Use this system for:

\- maintenance

\- requests

\- events

\- meetings

\- applications

\- interviews

\- elections

\- projects



Do not create separate task systems.



\---



\## 3.8 PHASE REPORT (2026-08-14)



STATUS: COMPLETE (this sub-section only — \#3.1–\#3.7 and \#3.9 are separate, NOT\_STARTED work covered by the rest of \# 3)



IMPLEMENTED:

\- A new, standalone \`tasks\` module (\`src/modules/tasks\`) — the full Task/Follow-up Engine: title, description, owner, creator, priority (LOW/MEDIUM/HIGH/URGENT), status (TODO/IN\_PROGRESS/BLOCKED/DONE/CANCELLED), deadline, reminder, escalation (escalatedAt/escalatedToId), a polymorphic relatedEntityType/relatedEntityId link for future domains, comments, createdAt/updatedAt/completedAt/cancelledAt, and full audit/history via the existing AuditLog/AuditRecorder.

\- Use cases: create, update, reassign, set-status (handles IN\_PROGRESS/BLOCKED/DONE/CANCELLED — "complete" and "cancel" are simply targeting DONE/CANCELLED), reopen (the one action that escapes a terminal DONE/CANCELLED state), escalate, add-comment, get, search (filter/sort/paginate).

\- Reminder and overdue detection ride the EXISTING Background Job Processing System (\`src/modules/jobs\`) via one-shot jobs scheduled at Task.reminderAt/Task.deadline — no second scheduler was built. This is also the "reusable escalation engine" \#3.6 calls for: the overdue-check job handler auto-escalates to the Technical Secretary and is generic across every future domain that creates a Task, not maintenance-specific.

\- Each scheduled job handler re-reads the task's CURRENT state at fire time and no-ops if it's since been completed/cancelled or its deadline/reminderAt has moved — a later edit doesn't need to cancel the now-stale job, it simply schedules a fresh one and lets the old one self-correct.

\- 6 new notification templates (TASK\_ASSIGNED, TASK\_REASSIGNED, TASK\_DEADLINE\_APPROACHING, TASK\_OVERDUE, TASK\_COMPLETED, TASK\_ESCALATED) added to the EXISTING notification system (templates/registry, IN\_APP + EMAIL channels per the existing time-sensitive-vs-routine convention) — no second notification system was built.

\- Minimal UI at \`/tasks\` (list: filter by status/overdue, paginated, create) and \`/tasks/[id]\` (detail: status actions, reassign, reopen, escalate, comments) — its own thin route group (not nested inside (admin)/(student)) since Secretary, Coordinator, and Student all use the same two pages, each scoped server-side. Loading/empty/error/unauthorized/success states all present; no fake data.

\- Owner picker in the Create Task UI reuses the EXISTING User Directory search endpoint rather than a new lookup.



FILES CHANGED (full list intentionally not duplicated here — see \`git diff\`/\`git log\` for this phase's commit): \`prisma/schema.prisma\` (Task, TaskComment, TaskStatus, TaskPriority — fully additive); \`src/modules/tasks/\*\*\` (new module: domain, application, infrastructure, presentation); \`src/modules/notifications/\*\` (6 new template definitions + registry/destinations/entities wiring); \`src/lib/audit-actions.ts\` (7 new TASK\_\* actions); \`src/lib/api-client.ts\` (added \`getWithMeta\` — the one existing shared file touched, additive, every other call site unaffected); \`scripts/run-worker.ts\` (registers the tasks module's job handlers, the one place adding a background job type touches outside its own module, per that file's own documented convention); \`src/app/(tasks)/tasks/\*\*\` and \`src/app/api/tasks/\*\*\` (new).



DATABASE:

\- Migration \`20260814143408\_myarch\_phase2\_task\_engine\` — 2 new enums, 2 new tables (\`tasks\`, \`task\_comments\`), 5 indexes, 5 foreign keys. Fully additive — no existing table, column, or constraint touched.

\- Rehearsed against local Docker Postgres first (19 migrations applied cleanly, verified up to date), then applied to production Neon — 19/19 migrations, zero errors.

\- As with Phase 1's migration, \`prisma migrate diff\`'s raw output included the same 4 spurious \`DROP INDEX\`/\`ALTER COLUMN ... DROP DEFAULT\` statements against the pre-existing \`searchVector\` generated columns (the known Prisma limitation with \`Unsupported("tsvector")\` columns, documented in the Phase 1 migration file) — manually excluded again; re-diffing after applying confirms only that same harmless, pre-existing drift remains.



APIS: \`POST /api/tasks\`, \`GET /api/tasks\` (search/filter/sort/paginate), \`GET/PATCH /api/tasks/[id]\`, \`POST /api/tasks/[id]/reassign\`, \`PATCH /api/tasks/[id]/status\`, \`POST /api/tasks/[id]/reopen\`, \`POST /api/tasks/[id]/escalate\`, \`POST /api/tasks/[id]/comments\`. Every route follows Route → withAuth (Authentication) → domain permission function (Authorization) → Zod schema (Validation) → use case (Service) → Prisma repository (Database) → NextResponse (Response); no business logic lives in a route handler.



PERMISSIONS:

\- Technical Secretary: unscoped full administration of every task (matches "full task administration").

\- Coordinator: \`canManageTask\` restricts full management (update/reassign/status/reopen/escalate) to tasks they own or created — never an arbitrary task between two other people ("only tasks they are authorized to manage... can manage assigned/delegated tasks").

\- "Coordinator... cannot escalate privileges": \`canAssignTaskTo\` lets a Coordinator assign/reassign only to a Student or to THEMSELVES (an identity check on userId, not a role check — comparing roles alone would be trivially true for any two Coordinators, since both hold role "COORDINATOR"; this exact bug was caught by the test suite before being fixed) — never to the Secretary or to a different Coordinator. Escalation always targets the Secretary, resolved server-side, never client-chosen.

\- Student: \`canViewTask\`/\`canUpdateOwnTaskStatus\` restrict a Student to their own tasks (owner only, never creator — Students cannot create tasks), and only to moving it forward through TODO/IN\_PROGRESS/BLOCKED/DONE — never CANCELLED, never reassignment, never escalation.

\- Every check happens server-side inside a use case; the UI hides actions it expects to fail, but the real enforcement never depends on that.



TESTS: 13 new test files, 112 tests — domain (state machine, permissions, isTaskOverdue), every use case (create, update-implicit-via-reassign, reassign, set-status, reopen, escalate, comment, get, search), both job handlers (reminder + overdue/auto-escalation, including their self-correction-against-stale-state behavior), and Zod validation schemas (invalid input). Explicitly covers: creation, assignment, reassignment, authorization (including the Coordinator/Student permission boundaries), status transitions, completion, cancellation, deadline scheduling, overdue detection, filtering, pagination, and invalid input. Full repo suite: 206 test files / 1576 tests passing.



BUILD: \`npx tsc --noEmit\` clean; \`npm run lint\` clean; \`npx next build\` (Turbopack) clean.



SECURITY: Every write use case re-derives authorization from the loaded task record, never trusts a client-supplied role/ownership claim. The privilege-escalation guard above was verified by a failing test before the fix, not merely asserted. Every task mutation is audited (\`AUDIT\_ACTIONS.TASK\_\*\`) via the existing AuditLog, including automated overdue escalation (attributed to the task's creator, mirroring the existing precedent for automated-completion audit entries with no human actor in the loop).



KNOWN ISSUES / DEFERRED (by design, not oversight):

\- \`/tasks\` is not yet linked from the (admin) or (student) sidebar navigation — reachable today only by direct URL or a notification's destination link. Skipped to avoid touching those two already-tested, carefully-ordered nav files for a phase whose explicit scope was infrastructure, not integration; wiring it in is a natural, low-risk follow-up once a real caller (e.g. Maintenance) exists.

\- The overdue auto-escalation job's "already escalated" guard is a best-effort idempotency check, not a hard lock — two overlapping fires are a low-probability, low-consequence edge case (an extra notification), not something this phase builds dedicated locking infrastructure to fully rule out.

\- \#3.1–\#3.7 (Maintenance categories/report/lifecycle/complainant-tracking/assignment/SLA, the Generic Request System) and \#3.9 (Maintenance Dashboard) are NOT implemented. This report covers \#3.8 only.



NEXT: Implement \#3.1–\#3.7 and \#3.9 (Maintenance & Requests) on top of this Task Engine — per \#3.8's own instruction, as Task rows with \`relatedEntityType: "MaintenanceIssue"\` / \`"Request"\`, not a second parallel system. Only once that full Phase 2 section is complete should \# 4 (PHASE 3 — CALENDAR, EVENTS \& MEETINGS) begin.



\---



\## 3.9 MAINTENANCE DASHBOARD



Show:



\- open

\- critical

\- overdue

\- assigned

\- in progress

\- resolved

\- average response time

\- average resolution time

\- category analytics

\- location analytics

\- recurring issues

\- escalation

\- Coordinator workload



\---



\## ACCEPTANCE



\- students can submit issues

\- issues persist correctly

\- assignment works

\- tracking works

\- resolution works

\- reopening works

\- notifications work

\- SLA works

\- escalation works

\- audit works

\- dashboard works

\- authorization works

\- mobile workflow works



\---



\# 4. PHASE 3 — CALENDAR, EVENTS \& MEETINGS



STATUS: NOT\_STARTED



\## 4.1 CENTRAL ACTIVITY CALENDAR



Include:



\- events

\- meetings

\- elections

\- interviews

\- application deadlines

\- workshops

\- competitions

\- reviews

\- submissions

\- maintenance shutdowns

\- council activities

\- technical activities

\- project milestones



Views:

\- month

\- week

\- day

\- agenda



Filters:

\- activity type

\- owner

\- academic year

\- committee

\- status



\---



\## 4.2 EVENT PLANNER



Event:



\- title

\- description

\- date/time

\- venue

\- organizer

\- Coordinators

\- volunteers

\- tasks

\- checklist

\- budget

\- documents

\- registration

\- attendance

\- announcements

\- media

\- post-event report



\---



\## 4.3 EVENT TASKS



Task:

\- owner

\- deadline

\- status

\- priority



Statuses:



TODO

→ IN\_PROGRESS

→ DONE



\---



\## 4.4 MEETING MANAGEMENT



Meeting:



\- title

\- date/time

\- venue/link

\- participants

\- agenda

\- attendance

\- notes

\- decisions

\- action items



Action items must use the shared task/follow-up system.



\---



\## 4.5 ANNOUNCEMENTS



Announcement:



\- title

\- content

\- audience

\- priority

\- publish date

\- expiry

\- attachments

\- author



Audience can include:

\- everyone

\- specific year

\- program

\- committee

\- council

\- Coordinators

\- selected groups



\---



\# 5. PHASE 4 — COUNCIL \& COMMITTEES



STATUS: NOT\_STARTED



\## OBJECTIVE



Create a structured governance system.



Support:



\- Student Council

\- Core Committee

\- Event Committees

\- Technical committees

\- project teams

\- temporary committees



Each organization/group can contain:



\- academic year

\- position

\- members

\- responsibilities

\- start date

\- end date

\- projects

\- meetings

\- documents

\- activity history



Preserve historical membership.



Do not destroy previous-year records.



\---



\# 6. PHASE 5 — FORMS, APPLICATIONS, SCRUTINY \& INTERVIEWS



STATUS: NOT\_STARTED



\## 6.1 FORM BUILDER



Reusable form builder.



Field types:



\- text

\- long text

\- number

\- email

\- dropdown

\- radio

\- multi-select

\- checkbox

\- date

\- rating

\- file upload

\- conditional fields



Lifecycle:



DRAFT

→ PUBLISHED

→ CLOSED

→ ARCHIVED



Support:



\- eligibility

\- deadlines

\- required fields

\- attachments

\- confirmation

\- notifications

\- preview

\- duplicate form



Use for:

\- council

\- core committee

\- committees

\- volunteering

\- events

\- technical initiatives

\- department applications



\---



\## 6.2 APPLICATION PIPELINE



SUBMITTED

→ UNDER\_REVIEW

→ SHORTLISTED

→ INTERVIEW\_SCHEDULED

→ INTERVIEWED

→ SELECTED / REJECTED



Admin capabilities:



\- search

\- filter

\- sort

\- compare

\- score

\- shortlist

\- reject

\- bulk actions

\- assign reviewers

\- notes

\- history



Applicants only see information they are authorized to see.



\---



\## 6.3 SCRUTINY



For elections and competitive applications:



SUBMITTED

→ ELIGIBILITY\_CHECK

→ DOCUMENT\_VERIFICATION

→ SCRUTINY

→ ELIGIBLE / INELIGIBLE

→ OBJECTION\_PERIOD

→ FINAL\_CANDIDATE



Store:

\- reviewer

\- decision

\- reason

\- timestamp

\- evidence

\- correction requests



Confidential reviewer notes must remain private.



\---



\## 6.4 INTERVIEW MANAGEMENT



Interview:



\- candidate

\- position

\- date/time

\- venue

\- online link

\- panel

\- interviewer

\- status



Support:

\- schedule

\- reschedule

\- cancel

\- reminders

\- completion



Notifications:

\- confirmation

\- change

\- cancellation

\- 24-hour reminder

\- 1-hour reminder



Evaluation:



\- technical understanding

\- leadership

\- communication

\- problem solving

\- vision

\- contribution

\- overall score

\- recommendation

\- confidential comments



Candidates cannot see confidential evaluator comments.



\---



\# 7. PHASE 6 — ELECTION MANAGEMENT



STATUS: NOT\_STARTED



\## 7.1 ELECTION LIFECYCLE



DRAFT

→ APPLICATION\_OPEN

→ APPLICATION\_CLOSED

→ SCRUTINY

→ SHORTLIST

→ INTERVIEWS

→ FINAL\_CANDIDATES

→ CAMPAIGN

→ VOTING

→ RESULTS

→ ARCHIVED



\---



\## 7.2 ELECTION CONFIGURATION



Election:



\- name

\- academic year

\- positions

\- eligibility

\- application dates

\- scrutiny dates

\- objection period

\- shortlist date

\- interview dates

\- campaign dates

\- voting dates

\- result date



Position:



\- title

\- responsibilities

\- eligibility

\- required documents

\- selection method

\- questions



\---



\## 7.3 ELECTION APPLICATION



Support:

\- application

\- documents

\- eligibility

\- scrutiny

\- correction

\- objection

\- shortlist

\- final candidate list



\---



\## 7.4 VOTER ELIGIBILITY



Only eligible authenticated users can vote.



Eligibility must be verified server-side.



Voting period must be enforced server-side.



\---



\## 7.5 ONE PERSON — ONE VOTE



Prevent:

\- duplicate votes

\- repeated submissions

\- client-side bypass

\- replay attacks where applicable



Use database constraints/idempotency where appropriate.



\---



\## 7.6 SECRET BALLOT



Individual voter choices must not be exposed to ordinary administrators.



Keep voter eligibility/audit information separate from ballot choice where architecture permits.



Do not create audit records that reveal individual voter choices.



\---



\## 7.7 BALLOT



Support:



\- position

\- candidates

\- candidate selection

\- confirmation

\- optional NOTA only if configured



\---



\## 7.8 VOTING SECURITY



Implement:



\- authenticated voter

\- server-side eligibility

\- election state validation

\- candidate validation

\- rate limiting

\- CSRF protection where applicable

\- duplicate submission protection

\- immutable finalized votes

\- election lock after closing



\---



\## 7.9 ADMINISTRATION



Technical Secretary manages election configuration.



Election administrators cannot silently edit submitted votes.



Important actions are audited.



Audit:

\- election creation

\- configuration changes

\- candidate changes

\- voting opened

\- voting closed

\- result finalization



Do not expose ballot secrecy through audit logs.



\---



\## 7.10 COUNTING



Count votes server-side.



Validate:

\- totals

\- eligible voters

\- submitted ballots

\- duplicate prevention



Handle ties according to configured election rules.



Record result finalization timestamp.



\---



\## 7.11 RESULTS



Support:



\- calculation

\- verification

\- finalization

\- selected candidate

\- position assignment

\- publication

\- candidate notification

\- announcement

\- PDF export

\- historical archive



Finalized results cannot be casually edited.



\---



\# 8. PHASE 7 — TECHNICAL OPERATIONS



STATUS: NOT\_STARTED



\## 8.1 PROJECT MANAGEMENT



Project:



\- title

\- description

\- owner

\- Coordinator

\- members

\- start date

\- end date

\- status

\- tasks

\- milestones

\- files

\- updates

\- activity



Statuses:



PLANNED

→ ACTIVE

→ BLOCKED

→ COMPLETED

→ ARCHIVED



\---



\## 8.2 ASSETS / EQUIPMENT



Track:



\- asset

\- category

\- serial number

\- location

\- condition

\- assigned person

\- purchase date

\- warranty

\- maintenance history

\- replacement status

\- documents



Statuses:



ACTIVE

MAINTENANCE

DAMAGED

RETIRED



\---



\## 8.3 FACILITIES



Manage:



\- rooms

\- studios

\- labs

\- capacity

\- equipment

\- availability

\- bookings

\- maintenance



Prevent conflicting bookings.



Integrate:



FACILITY

↔ BOOKING

↔ MAINTENANCE

↔ ASSET



\---



\## 8.4 INVENTORY



Track:



\- item

\- category

\- quantity

\- minimum stock

\- issue

\- return

\- responsible person

\- history



Support:

\- low-stock alerts

\- transaction history

\- permissions



\---



\## 8.5 RESOURCE REPOSITORY



Categories:



\- forms

\- regulations

\- council documents

\- election documents

\- technical documents

\- manuals

\- event documents

\- reports

\- archives



Support:



\- upload

\- download

\- preview

\- search

\- tags

\- categories

\- permissions

\- versioning

\- archive



\---



\# 9. PHASE 8 — STUDENT EXPERIENCE



STATUS: NOT\_STARTED



\## 9.1 STUDENT PROFILE



Identity:

\- profile photo

\- full name

\- preferred name

\- roll number

\- program

\- department

\- year

\- batch

\- academic status



Academic:

\- semester

\- CGPA/SGPA where appropriate

\- interests

\- specialization

\- coursework

\- achievements



Skills:

\- architecture/design

\- technical

\- software

\- programming

\- BIM/CAD

\- visualization

\- proficiency



Portfolio:

\- projects

\- title

\- description

\- category

\- year

\- role

\- tools/software

\- images

\- documents

\- external links



Achievements:

\- competitions

\- awards

\- certifications

\- workshops

\- publications

\- conferences

\- internships

\- positions



Activities:

\- council

\- committees

\- clubs

\- volunteering

\- events

\- technical activities

\- leadership



Interests:

\- academic

\- technical

\- design

\- career

\- hobbies



Professional links:

\- portfolio

\- LinkedIn

\- GitHub

\- Behance

\- other links



\---



\## 9.2 PROFILE VISIBILITY



Levels:



PUBLIC

DEPARTMENT\_ONLY

PRIVATE

CONFIDENTIAL where required



Server-side enforcement mandatory.



Private documents must remain private unless explicitly shared.



\---



\## 9.3 STUDENT CARDS



Compact cards should show:



\- profile photo

\- name

\- year

\- program

\- key skills

\- short bio

\- selected achievements

\- status

\- profile completion



Actions:

\- View

\- Edit if authorized

\- Share if permitted

\- Save/Shortlist where applicable

\- Export where permitted



\---



\## 9.4 EDIT MODE



Support explicit:



NORMAL MODE

→ view/use



EDIT MODE

→ edit content

→ reorder cards

→ change visibility

→ edit metadata

→ upload/change images

→ archive where authorized



Edit Mode MUST NOT bypass server authorization.



Student cards must support permission-controlled:

\- View

\- Edit

\- Visibility

\- Archive



\---



\## 9.5 PROFILE COMPLETION



Show completion percentage.



Example:



82% COMPLETE



Missing:

\- photo

\- skills

\- project



Do not require sensitive/private information merely to reach 100%.



\---



\## 9.6 IMAGE OPTIMIZATION



Profile image input:

\- maximum approximately 1 MB



Target stored profile image:

\- preferably 50–250 KB



Maximum profile dimensions:

\- approximately 800×800



Card thumbnail:

\- approximately 30–150 KB



Use:

\- resizing

\- compression

\- WebP/AVIF where appropriate

\- thumbnail generation

\- responsive variants

\- metadata stripping where appropriate



Do not store unnecessary duplicate large originals.



Portfolio/project images may have larger limits.



Validate:

\- MIME

\- extension

\- file signature where appropriate

\- dimensions

\- file size



Never trust extension alone.



\---



\## 9.7 STUDENT DASHBOARD



Show:



\- profile completion

\- upcoming events

\- pending requests

\- maintenance complaints

\- applications

\- interviews

\- notifications

\- announcements

\- deadlines

\- opportunities

\- projects

\- achievements

\- elections

\- resources



Quick actions:



\- Raise Maintenance Issue

\- Submit Request

\- Update Profile

\- Add Project

\- View Events

\- Apply

\- View Resources



\---



\## 9.8 OPPORTUNITY HUB



Include:



\- council positions

\- committees

\- events

\- workshops

\- competitions

\- volunteering

\- technical projects

\- mentorship

\- department initiatives



Each:

\- title

\- organizer

\- deadline

\- eligibility

\- seats

\- status

\- application action



\---



\## 9.9 STUDENT ACTIVITY TIMELINE



Support:

\- joined MYARCH

\- project added

\- committee joined

\- application submitted

\- event attended

\- achievement

\- project completed

\- certificate

\- position



Privacy must be respected.



\---



\## 9.10 DOCUMENT WALLET



Private documents:

\- resume

\- certificates

\- portfolio PDFs

\- proof documents

\- application documents



Each:

\- name

\- type

\- size

\- upload date

\- visibility

\- replace

\- download

\- delete



Never expose private files through predictable public URLs.



\---



\## 9.11 PROFILE SHARING



Support controlled sharing:



\- public profile

\- department profile

\- application/recruiter profile



Private documents remain private unless explicitly shared.



\---



\## 9.12 NOTIFICATION PREFERENCES



Allow preferences for:

\- email

\- event reminders

\- application updates

\- maintenance updates

\- announcements

\- opportunities



Critical:

\- security

\- password

\- account

\- verification



notifications cannot be disabled.



\---



\# 10. PHASE 9 — COMMUNICATION



STATUS: NOT\_STARTED



\## NOTIFICATIONS



Support:

\- in-app

\- email

\- read/unread

\- notification history

\- templates



Trigger notifications for:



\- complaint assigned

\- complaint updated

\- complaint resolved

\- request updated

\- application submitted

\- shortlisted

\- interview scheduled

\- interview changed

\- interview reminder

\- election opened

\- election result

\- event reminder

\- project assignment

\- task deadline

\- announcement



\---



\## EMAIL



Support:

\- verification

\- password reset

\- application confirmation

\- application updates

\- shortlist

\- interview

\- interview changes

\- reminders

\- election notifications

\- results

\- maintenance updates

\- requests

\- events

\- tasks



Use reusable templates.



Production URLs MUST use APP\_BASE\_URL.



Never use localhost for production email links.



\---



\## MESSAGING



Support where compatible with existing architecture:



\- direct messages

\- discussion threads

\- project discussions

\- request comments

\- event discussions



Respect permissions and privacy.



\---



\# 11. PHASE 10 — ALUMNI \& MENTORSHIP



STATUS: NOT\_STARTED



\## ALUMNI



Support:

\- profile

\- directory

\- graduation year

\- professional information

\- expertise

\- availability



\## MENTORSHIP



Support:

\- alumni mentor registration

\- student request

\- acceptance

\- session

\- communication

\- history

\- feedback



Integrate with:

\- student dashboard

\- notifications

\- calendar where appropriate



\---



\# 12. PHASE 11 — SEARCH, ANALYTICS \& REPORTS



STATUS: NOT\_STARTED



\## 12.1 GLOBAL SEARCH



Permission-aware search across:



\- students

\- alumni

\- Coordinators

\- events

\- complaints

\- requests

\- applications

\- projects

\- resources

\- assets

\- facilities

\- committees

\- elections

\- documents



Never return unauthorized data.



\---



\## 12.2 ACTIVITY FEED



Separate from audit log.



Human-readable examples:



\- complaint assigned

\- event created

\- application opened

\- interview scheduled

\- election opened

\- task completed

\- project updated



\---



\## 12.3 AUDIT LOG



Audit:



\- account creation

\- activation/deactivation

\- permission changes

\- Coordinator delegation

\- complaint assignment/status

\- request decisions

\- application decisions

\- shortlisting

\- interview evaluation

\- election configuration

\- voting open/close

\- result finalization

\- resource changes

\- project changes

\- administrative actions



Store:

\- actor

\- action

\- entity

\- entity ID

\- timestamp

\- relevant old/new state

\- metadata



Protect audit logs from ordinary modification/deletion.



\---



\## 12.4 REPORTS



Maintenance:

\- response time

\- resolution time

\- overdue

\- category

\- location

\- recurring issues



Governance:

\- applications

\- shortlist

\- interviews

\- results

\- participation



Events:

\- registrations

\- attendance

\- participation



Projects:

\- progress

\- tasks

\- deadlines



Operations:

\- Coordinator workload

\- unresolved items

\- overdue tasks

\- response performance



\---



\# 13. PHASE 12 — ANNUAL ARCHIVE



STATUS: NOT\_STARTED



Archive by academic year:



YEAR

├── Council

├── Elections

├── Committees

├── Events

├── Projects

├── Maintenance

├── Applications

├── Reports

└── Resources



Historical records must remain searchable according to permissions.



Archived records should not be casually modified.



Support:

\- archive

\- view

\- search

\- reports

\- historical comparison where useful



\---



\# 14. PHASE 13 — SECURITY, PRIVACY \& HARDENING



STATUS: NOT\_STARTED



\## AUTHENTICATION



Verify:

\- secure password hashing

\- secure sessions

\- secure cookies/tokens

\- email verification

\- password reset

\- account status



\## AUTHORIZATION



Test:

\- student attempting admin action

\- Coordinator without permission

\- Coordinator with permission

\- Technical Secretary

\- inactive Coordinator

\- inactive account

\- cross-user access

\- cross-year access



\## PRIVACY



Classify data:



PUBLIC

DEPARTMENT\_ONLY

PRIVATE

CONFIDENTIAL

ADMIN



Confidential examples:

\- interview evaluations

\- internal notes

\- election administration

\- administrative decisions



\## FILE SECURITY



Verify:

\- MIME validation

\- size limits

\- secure names

\- access control

\- private storage

\- no predictable private URLs

\- deletion handling



\## API SECURITY



Verify:

\- validation

\- authentication

\- authorization

\- rate limiting

\- safe errors

\- no secret leakage

\- SQL/ORM safety

\- XSS protection

\- CSRF protection where applicable



\---



\# 15. PHASE 14 — PERFORMANCE \& ACCESSIBILITY



STATUS: NOT\_STARTED



\## PERFORMANCE



Use:

\- pagination

\- indexed queries

\- server-side filtering

\- efficient fetching

\- caching where appropriate

\- lazy loading

\- optimized images

\- responsive images

\- minimal client JS



Avoid:

\- N+1 queries

\- loading huge datasets

\- unnecessary polling

\- duplicate files

\- duplicate API logic



\---



\## ACCESSIBILITY



Support:

\- semantic HTML

\- keyboard navigation

\- focus states

\- labels

\- accessible dialogs

\- accessible forms

\- readable contrast

\- responsive layouts



Maintenance reporting must work well on mobile.



\---



\# 16. PHASE 15 — BACKUP \& RECOVERY



STATUS: NOT\_STARTED



Verify backup/recovery strategy for:



\- database

\- file/object storage

\- critical configuration



Document:

\- backup frequency

\- retention

\- recovery procedure

\- migration safety

\- restoration verification



Do not claim backups are solved without verifying the actual architecture.



\---



\# 17. PHASE 16 — FINAL PRODUCTION VERIFICATION



STATUS: NOT\_STARTED



Perform a complete production-readiness audit.



Verify:



\## BUILD

\- production build

\- typecheck

\- lint

\- tests



\## DATABASE

\- connection

\- migrations

\- indexes

\- relations

\- backup



\## AUTHENTICATION

\- signup

\- email verification

\- login

\- logout

\- password reset

\- password change



\## AUTHORIZATION

\- roles

\- Coordinator permissions

\- max 2 Coordinators

\- API authorization

\- private data



\## STORAGE

\- profile images

\- card images

\- documents

\- private files

\- compression

\- limits



\## WORKFLOWS

\- maintenance

\- requests

\- tasks

\- calendar

\- events

\- meetings

\- committees

\- applications

\- interviews

\- elections

\- voting

\- results

\- projects

\- resources

\- mentorship



\## NOTIFICATIONS

\- in-app

\- email

\- reminders



\## SECURITY

\- secrets

\- rate limiting

\- validation

\- authorization

\- privacy

\- file security

\- election security



\## DEPLOYMENT

\- production environment variables

\- APP\_BASE\_URL

\- database

\- storage

\- email

\- HTTPS

\- domain



\---



\# 18. DASHBOARD REQUIREMENTS



\## TECHNICAL SECRETARY DASHBOARD



Show:



\- critical maintenance

\- overdue maintenance

\- pending requests

\- Coordinator workload

\- overdue tasks

\- applications

\- interviews

\- elections

\- upcoming events

\- projects

\- approvals

\- recent activity

\- notifications

\- announcements



Quick actions:



\- Raise Request

\- Create Event

\- Create Application

\- Create Election

\- Create Announcement

\- Assign Coordinator

\- Add Resource

\- Create Project



\---



\## COORDINATOR DASHBOARD



Show ONLY delegated/authorized modules.



Show:

\- assigned work

\- complaints

\- requests

\- projects

\- events

\- tasks

\- deadlines

\- workload

\- notifications



\---



\## STUDENT DASHBOARD



Show:

\- profile completion

\- complaints

\- requests

\- applications

\- interviews

\- events

\- deadlines

\- announcements

\- opportunities

\- projects

\- achievements

\- elections

\- resources

\- notifications



\---



\# 19. DASHBOARD EDIT MODE



Authorized administrators can configure dashboard widgets.



Support:

\- show/hide

\- reorder

\- configure

\- reset layout



Do not allow:

\- arbitrary code

\- unsafe HTML

\- permission bypass



Student dashboard must remain functional.



\---



\# 20. DEMO MODE



If compatible with existing architecture, provide safe demo mode.



Demo mode:

\- clearly marked DEMO

\- demo data only

\- no production data

\- no real emails

\- destructive operations disabled

\- allows exploration of major workflows



\---



\# 21. STORAGE RULES



All file uploads must support:



\- file-size limits

\- MIME validation

\- secure filename handling

\- authorization

\- lifecycle management

\- deletion handling



Track storage usage where practical.



Support:

\- replacement

\- archival

\- orphan cleanup



Do not expose private files through public URLs.



\---



\# 22. API ARCHITECTURE



Preferred:



ROUTE

→ AUTHENTICATION

→ AUTHORIZATION

→ VALIDATION

→ SERVICE / USE CASE

→ DATABASE

→ RESPONSE



Complex business logic should not live entirely in route handlers.



Use reusable services/use cases.



Use consistent API error responses.



\---



\# 23. DATABASE ARCHITECTURE



Before adding models:

\- inspect Prisma schema

\- inspect enums

\- inspect migrations

\- inspect relations

\- search for equivalent concepts



Prefer normalized relational design.



Important entities should have appropriate:

\- IDs

\- createdAt

\- updatedAt

\- owner/actor

\- status

\- academic year

\- history/audit where needed



Add indexes for:

\- status

\- academic year

\- foreign keys

\- ownership

\- frequent search/filter fields



\---



\# 24. ERROR / EMPTY / LOADING STATES



Every major workflow/page must support:



\- loading

\- empty

\- error

\- unauthorized

\- success



Production errors must not expose:

\- stack traces

\- secrets

\- database internals

\- sensitive information



\---



\# 25. RESPONSIVE DESIGN



MYARCH must work on:



\- desktop

\- laptop

\- tablet

\- mobile



Especially optimize:

\- student dashboard

\- maintenance reporting

\- applications

\- event registration

\- interview schedules

\- notifications



\---



\# 26. TESTING REQUIREMENTS



For every phase, run appropriate:



\- unit tests

\- integration tests

\- API tests

\- authorization tests

\- workflow tests

\- UI tests where appropriate



Critical tests include:



\### AUTH

\- signup

\- verification

\- login

\- logout

\- password reset



\### RBAC

\- unauthorized student

\- Coordinator without permission

\- Coordinator with permission

\- Technical Secretary

\- inactive account



\### MAINTENANCE

\- create

\- assign

\- update

\- resolve

\- verify

\- close

\- reopen

\- escalation



\### APPLICATION

\- submit

\- review

\- shortlist

\- interview

\- select/reject



\### ELECTION

\- eligibility

\- duplicate vote prevention

\- voting period

\- ballot security

\- counting

\- results



\### FILES

\- upload

\- validation

\- private access

\- unauthorized access



\---



\# 27. PHASE STATE MANAGEMENT



After successfully completing a phase:



Update:



STATUS: COMPLETE



and update:



LAST\_COMPLETED\_PHASE: \[phase number]



CURRENT\_PHASE: \[next phase]



BLOCKED: FALSE



If currently working:



STATUS: IN\_PROGRESS



If blocked:



STATUS: BLOCKED

BLOCKED: TRUE

BLOCK\_REASON: \[specific reason]



Never mark a phase COMPLETE before verification.



\---



\# 28. AUTOMATED EXECUTION RULE



Claude should process phases sequentially.



Algorithm:



1\. Read entire roadmap.

2\. Read PROJECT STATE.

3\. Find first incomplete phase.

4\. Read that phase completely.

5\. Inspect relevant existing code.

6\. Plan implementation.

7\. Implement only that phase.

8\. Test.

9\. Verify.

10\. Inspect git diff.

11\. Update roadmap state.

12\. If successful, continue to next phase.

13\. If blocked, STOP.

14\. Never skip phases.

15\. Never silently mark incomplete work as complete.



When the current phase is complete and safe to continue, automatically continue to the next phase.



Do not ask for confirmation between normal low-risk phases.



However, STOP and request human approval before:

\- destructive database changes

\- production database operations

\- deleting production data

\- changing production secrets

\- changing authentication architecture

\- changing election security architecture

\- irreversible migrations

\- potentially destructive storage operations



\---



\# 29. DEFINITION OF DONE



MYARCH is considered complete only when:



\- all roadmap phases are COMPLETE

\- all acceptance criteria pass

\- production build passes

\- typecheck passes

\- lint passes

\- tests pass

\- authentication works

\- authorization works

\- student privacy works

\- maintenance workflow works

\- calendar works

\- events work

\- applications work

\- interviews work

\- elections work

\- voting security works

\- results work

\- projects work

\- resources work

\- assets/facilities work

\- student profiles work

\- Edit Mode works

\- image optimization works

\- notifications work

\- email verification works

\- alumni/mentorship works

\- search works

\- analytics/reports work

\- archive works

\- audit works

\- production environment is verified

\- backup/recovery is documented

\- no critical security issue remains



\---



\# 30. FINAL RULE



DO NOT blindly follow the roadmap at the expense of the existing application.



DO NOT blindly follow the existing application at the expense of the roadmap.



Inspect.

Reconcile.

Implement safely.

Test.

Verify.

Document.

Continue.



Never guess.

Never silently break.

Never use destructive shortcuts.



===============================================================

END OF MYARCH MASTER ROADMAP

===============================================================

