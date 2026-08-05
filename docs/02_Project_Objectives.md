# 02 — Project Objectives

## Purpose

This document translates the product vision into concrete, evaluable objectives for the build. It defines what "done" means for each phase and gives the Secretary a checklist to hold the implementation accountable to.

## Scope

Covers objectives for MVP (Phase 1) through Phase 4, as defined in the project brief's Feature Roadmap and 2-Week MVP Plan. Does not define *how* objectives are implemented (see architecture, database, and API documents) or *when* beyond the phase-level sequencing already set (see `16_Project_Roadmap.md`).

## Primary Objectives

1. **Eliminate manual placement workflows.** Replace WhatsApp, Excel, email, and shared-folder-based coordination with a single system of record for student data, drive management, and recruiter interaction.
2. **Enforce a hard boundary between private and public student data.** Private (academic/administrative) and Public (recruiter-facing) profiles must be architecturally separate, with an explicit human-approved publishing step — never an automatic sync.
3. **Present students portfolio-first.** The public profile and recruiter portal must treat visual/project work as a primary artifact, not a resume attachment.
4. **Give the Secretary and Coordinators real operational control** over batches, students, drives, and approvals, with permission boundaries enforced by the system rather than by social convention.
5. **Generate the department's placement brochure from live data**, removing the annual manual rebuild in Canva/InDesign (Phase 3).
6. **Meet the mandatory security bar** (bcrypt, JWT + refresh tokens, RBAC, input validation, upload restrictions, rate limiting, HTTPS, backups, audit logs) before any production deployment — see `14_Security_Architecture.md`.
7. **Ship a working MVP within the 2-week plan** defined in the project brief, without scope creep into Phase 2–4 features.

## Phase-Level Objectives

### Phase 1 — MVP (must ship in 2 weeks)

- Authentication and role-based access control operational for all four roles (Secretary, Coordinator, Student, Recruiter).
- Batch-wise student database with CRUD for CGPA, skills, software, resume, and portfolio fields.
- Private and Public profile data models fully separated, with a draft → approval → publish workflow.
- Admin dashboard: student management, batch management, profile approval queue.
- Recruiter portal: browse, search, filter, view approved profiles, download resumes.
- Excel/CSV export of student and placement data.
- Email notifications for profile approval and drive announcements.
- Security pass complete: bcrypt (cost 12+), route guards, environment-variable secrets, HTTPS.

### Phase 2 — Placement Operations

- Application tracking pipeline (Applied → Shortlisted → Interview → Offer → Rejected).
- Multi-round placement process support per drive.
- Recruiter self-service (recruiters can manage their own drive's shortlist/status without Secretary involvement for routine actions).
- Excel import (bulk student onboarding, legacy data migration).
- Analytics (placement percentage, package statistics, sector breakdowns).

### Phase 3 — Differentiating Features

- Placement Brochure Builder: generate brochures from live data, exportable as PDF, editable PPTX, and Canva-compatible structure.
- Studio Project Import: bring architecture studio work into a student's public portfolio with minimal re-entry.
- Interview Feedback Bank: structured, reusable interview feedback tied to companies/drives.
- Alumni Mentor Matching.
- WhatsApp notifications (as a channel, not a replacement for the system of record).

### Phase 4 — Production Polish

- Mobile PWA.
- Security hardening pass beyond MVP baseline (see `14_Security_Architecture.md` for the distinction between MVP-mandatory and Phase 4 hardening).
- Activity logs surfaced in-product (not just backend audit tables).
- Profile completeness scoring to nudge students toward finishing their public profile.
- NAAC/NBA report generation from accumulated placement data.

## Non-Objectives

These are explicitly out of scope unless a future decision revisits them:

- Multi-department or multi-institution support.
- Public, unauthenticated recruiter self-signup.
- Treating this system as the institution's academic record of truth for CGPA/backlogs.
- Real-time chat or messaging between students and recruiters (notifications and status updates only).
- Payment processing of any kind.

## Objective-to-Document Traceability

| Objective | Primary supporting document(s) |
|---|---|
| Two-profile separation | `08_Database_Design.md`, `09_User_Roles_and_Permissions.md` |
| RBAC enforcement | `09_User_Roles_and_Permissions.md`, `14_Security_Architecture.md` |
| Portfolio-first presentation | `11_UI_Architecture.md`, `12_Design_System.md`, `13_Component_Library.md` |
| Brochure generation | `03_Functional_Requirements.md` (Brochure Builder section), `16_Project_Roadmap.md` |
| MVP security bar | `14_Security_Architecture.md` |
| 2-week MVP delivery | `16_Project_Roadmap.md` |

## Assumptions

- "Done" for MVP is defined strictly by the Phase 1 feature list above; anything not listed there is deliberately deferred, not forgotten.
- The Secretary (Harsh Rawat) is the final approver of scope changes; Coordinators and future maintainers do not have authority to expand MVP scope.
- Objectives are evaluated against real student data during the Day 12 testing window described in the brief, not synthetic data alone.

## Future Considerations

- As Phase 2+ objectives are reached, this document should be revisited to confirm whether original phase boundaries still make sense given real usage feedback from a full placement season.
- Objectives around NAAC/NBA reporting (Phase 4) may need refinement once the department clarifies exact accreditation report formats required.
