# 09 — User Roles & Permissions

## Purpose

Defines the four roles in MYARCH, exactly what each can and cannot do, and how scope (e.g., a Coordinator's batch assignment) constrains that access. This is the authoritative permissions matrix that authorization code must match exactly.

## Scope

Covers role definitions and the permissions matrix for Phase 1–3 features. Enforcement mechanics (how these rules are technically implemented — middleware, guards) are covered in `14_Security_Architecture.md`; this document defines *what* is allowed, not *how* it's checked in code.

## Roles

### Secretary (Super Admin)

The T&P Secretary — one person per department term, full operational authority. In the brief's terms, "Super Admin."

- Full access to all Batches, Students (Private + Public data), Companies, Drives, Applications.
- Creates and manages Coordinator accounts, including their batch scope.
- Sole authority to change a Batch's status (ACTIVE → GRADUATED → ARCHIVED) pending confirmation of retention policy.
- Sole authority to generate and publish the department Brochure (Phase 3), though drafting may be delegated.
- Full audit log visibility.

### Coordinator (Sub Admin)

A Student Coordinator — one or more per department term, assigned to specific Batch(es) by the Secretary. In the brief's terms, "Sub Admin."

- Access to Student records (Private + Public data) **only** for Batches explicitly assigned via `CoordinatorBatchScope`.
- Can review and approve/reject Public Profile drafts for students in their scoped Batch(es) only.
- Can create Placement Drives and manage Applications (Phase 2) for their scoped Batch(es).
- **Cannot** view Private data, internal remarks, or approval queues for a Batch they are not assigned to — this is a hard boundary, not a UI-level hide (`FR` cross-ref: this directly implements the brief's stated example, "Coordinator cannot view confidential notes belonging to another batch").
- Cannot create or manage other Coordinator accounts (Secretary-only).
- Cannot change Batch lifecycle status.

### Student

- Full read/write access to their own `StudentPublicProfileDraft`.
- Read-only access to their own `StudentPrivateProfile`, **except** contact information (phone, personal email), which they may edit themselves.
- Cannot edit CGPA, backlog status, or internal remarks — these are department-entered fields (FR-STUD-04).
- Can view their own application/pipeline status (Phase 2) but cannot alter it.
- Cannot view any other student's Private data, and cannot view another student's Public Profile through any privileged path beyond what a Recruiter would see (i.e., only approved Public Profiles are visible to students the same way they are to recruiters, if such peer-browsing is enabled — see Assumptions).

### Recruiter

- Created/invited by Secretary or Coordinator — never self-registered (FR-RECRUIT-01).
- Read-only access to **approved** `StudentPublicProfile` records only, filterable by search/skills/software/batch.
- Can download a student's resume file from an approved profile.
- **Cannot** access `StudentPrivateProfile`, `StudentPublicProfileDraft`, internal remarks, or any confidential document under any circumstance — enforced at the database-query and API-authorization layer, not just hidden in the UI (brief's stated example: "Recruiter cannot access private student information").
- In Phase 2, a Recruiter tied to a specific Drive may update Application status for candidates within that Drive only (self-service), never outside their own company's Drive(s).

## Permissions Matrix

| Capability | Secretary | Coordinator (in-scope batch) | Coordinator (out-of-scope batch) | Student (own data) | Student (other students) | Recruiter |
|---|:---:|:---:|:---:|:---:|:---:|:---:|
| View Private Profile | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ |
| Edit CGPA / backlog / remarks | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Edit own contact info | ✅ (any) | ✅ (in scope) | ❌ | ✅ | ❌ | n/a |
| Edit Public Profile Draft | ✅ (any) | ✅ (in scope) | ❌ | ✅ | ❌ | ❌ |
| Approve/Reject Public Profile Draft | ✅ | ✅ (in scope) | ❌ | ❌ | ❌ | ❌ |
| View approved Public Profile | ✅ | ✅ | ✅ | ✅ (own) | per Assumptions | ✅ |
| Create/manage Batches | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Create/manage Coordinator accounts | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Create Placement Drives (Phase 2) | ✅ | ✅ (in scope) | ❌ | ❌ | ❌ | ❌ |
| Update Application status (Phase 2) | ✅ | ✅ (in scope) | ❌ | ❌ (view only) | ❌ | ✅ (own drive only) |
| Export data | ✅ (any) | ✅ (in scope) | ❌ | ❌ | ❌ | ❌ |
| Generate/publish Brochure (Phase 3) | ✅ | draft only | ❌ | ❌ | ❌ | ❌ |
| View audit logs | ✅ (all) | ✅ (own actions + in-scope) | ❌ | ❌ | ❌ | ❌ |
| Create/manage Recruiter accounts | ✅ | ✅ (in scope) | ❌ | ❌ | ❌ | ❌ |

## Enforcement Principle: Deny by Default

Every permission check answers "is this specific action, on this specific record, allowed for this specific actor" — there is no implicit role-level allow. A Coordinator's session carries their batch scope explicitly, and every query touching Student data (Private or Public) is filtered by that scope at the data-access layer, not only checked at the route level (see `14_Security_Architecture.md` for defense-in-depth detail).

## Assumptions

- Students do not browse each other's profiles by default in Phase 1 (no peer directory) — if a peer-visible directory is wanted later, it would reuse the same approved-`StudentPublicProfile` read path recruiters use, not a new privileged path.
- "Recruiter" accounts are scoped to a single Company; a recruiter cannot browse or act on another company's Drive/Applications.
- A Coordinator's batch scope is set exclusively by the Secretary; Coordinators cannot self-assign additional batches.
- The maximum number of Coordinators and who specifically receives the role are open operational decisions for the Secretary, not architectural constraints — see `18_Open_Questions.md`. The system itself places no hard limit on Coordinator count.

## Future Considerations

- If Recruiter self-service (Phase 2, FR-PIPE-05) expands, consider a distinct "Recruiter Admin" vs. "Recruiter Viewer" split within a company if companies request multiple named users with different authority — not needed for MVP.
- If alumni mentor matching (Phase 3) introduces a fifth role ("Alumni"), it should be modeled as a distinct role rather than overloading the Student role after graduation, since alumni have a materially different permission set (e.g., opt-in mentor visibility, no active application pipeline).
