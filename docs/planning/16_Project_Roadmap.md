# 16 — Project Roadmap

## Purpose

Lays out the sequencing of work across all four phases, anchored to the brief's 2-week MVP plan, so progress can be tracked against a concrete schedule rather than an open-ended feature list.

## Scope

Covers Phase 1 (day-by-day, as specified in the brief) through Phase 4 (feature-level sequencing only, since exact dates depend on Phase 1–3 outcomes and are not yet knowable).

## Phase 1 — MVP: 2-Week Plan

This schedule is taken directly from the project brief and is treated as fixed unless the Secretary explicitly approves a change — no scope is added to this list mid-sprint (directly enforcing Day 1's "freeze data model and roles, no scope changes afterward").

| Day(s) | Work | Depends on |
|---|---|---|
| 1 | Freeze data model and roles. No scope changes afterward. | `08_Database_Design.md`, `09_User_Roles_and_Permissions.md` finalized |
| 2–3 | Authentication, role-based access | Day 1 freeze |
| 3–4 | Student Database: batch-wise CRUD, CGPA, skills, software, resume, portfolio | Auth in place |
| 5–6 | Two-profile workflow: Private profile, Public profile, approval queue | Student Database in place |
| 7 | Admin Dashboard: student management, batch management, profile approvals | Profile workflow in place |
| 8–9 | Recruiter Portal: browse, search, filter, view approved profiles, download resumes | Public profile + approval workflow live |
| 10 | Excel/CSV export | Student + profile data model stable |
| 11 | Email notifications: profile approval, drive announcements | Notification module, email provider decision (`18_Open_Questions.md`) |
| 12 | Testing with real student data; bug fixing | All above features functionally complete |
| 13 | Security pass: bcrypt, route guards, environment variables, HTTPS | Deployment target likely needed for HTTPS verification |
| 14 | Deployment, project handoff | Hosting decision confirmed (`15_Deployment_Strategy.md`) |

**Deferred beyond MVP** (explicit, per the brief): application tracking, Brochure Builder, alumni network, studio project import, interview feedback bank, WhatsApp integration, mobile PWA.

## Phase 2 — Placement Operations

Sequenced after MVP stabilizes in real use (at least through one round of real Coordinator/Recruiter usage), not immediately following Day 14:

1. Company and Placement Drive data model + eligibility rules.
2. Application tracking pipeline (Applied → Shortlisted → Interview → Offer → Rejected) with status history.
3. Multi-round drive support.
4. Recruiter self-service within their own drive.
5. Excel/CSV bulk import (student onboarding, legacy data migration).
6. Analytics: placement percentage, package statistics, sector breakdown.

## Phase 3 — Differentiating Features

Sequenced by dependency and standalone value, so each can ship independently rather than as one large release:

1. Placement Brochure Builder (highest standalone value — directly removes the brief's most time-consuming annual manual task).
2. Studio Project Import (extends the Public Profile model already in place since MVP).
3. Interview Feedback Bank (independent of the above; can be built in parallel).
4. Alumni Mentor Matching (depends on a first cohort of graduated batches existing in the system — practically gated by real elapsed time, not just engineering effort).
5. WhatsApp Notifications (additive channel on top of the existing Notification module from Phase 1).

## Phase 4 — Production Polish

1. Security hardening beyond the MVP baseline (MFA, access reviews — see `14_Security_Architecture.md` Future Considerations).
2. Mobile PWA.
3. Activity logs surfaced in-product.
4. Profile completeness scoring.
5. NAAC/NBA report generation.

## Milestones & Review Points

- **End of Day 1**: data model and roles frozen — no further changes without an explicit Secretary-approved exception.
- **End of Day 12**: functional testing against real student data complete; any P0 bug found here blocks Day 13–14.
- **End of Day 14**: MVP live at `tnparch.in`, handoff complete.
- **Post-MVP checkpoint**: after one real placement-season cycle using Phase 1 features, review before committing to Phase 2 scope/sequencing — real usage may reorder Phase 2/3 priorities.

## Assumptions

- The 2-week MVP schedule assumes the data model and role freeze (Day 1) actually holds; any mid-sprint scope change directly extends the schedule, and this document treats such changes as requiring explicit renegotiation rather than silent absorption.
- Phase 2–4 have no fixed calendar dates because their start depends on MVP outcomes and the Secretary's priorities after seeing it in real use — this roadmap defines sequencing and dependency, not a committed calendar beyond Phase 1.

## Future Considerations

- Once Phase 1 ships, this document should be updated with actual Phase 2 start dates and re-validated sequencing based on real feedback, rather than left as a static plan.
