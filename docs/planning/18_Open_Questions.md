# 18 — Open Questions

## Purpose

Tracks every decision the project brief explicitly leaves open, plus additional questions raised while writing this documentation set, so nothing unresolved is silently forgotten or silently decided without the Secretary's input. Each entry states the question, why it matters, the current default/recommendation (if any), and what happens if it stays unanswered past a given point.

## Scope

Living document — updated as questions are resolved (move them to `19_Decision_Log.md` with the outcome) or as new ones surface during implementation.

## From the Project Brief

### Q1 — Deployment Target

**Question:** Railway, Render, VPS, or the department's own server?

**Why it matters:** Blocks Day 13–14 of the MVP schedule (security pass and deployment); affects ongoing operational burden for years, not just at launch.

**Current default:** Railway or Render recommended for MVP, given the single-developer/rotating-Secretary operating model — see `15_Deployment_Strategy.md` for full tradeoff analysis.

**If unresolved by Day 12:** Proceed with the Railway default so Day 13–14 isn't blocked; migrating later remains possible without an application rewrite.

### Q2 — Email Provider

**Question:** College mail server, SendGrid, Resend, or Amazon SES?

**Why it matters:** Blocks Day 11 (email notifications) from having a real production send path; affects deliverability (risk of notification emails landing in spam) and whether the department wants email fully in-house.

**Current default:** Resend recommended for MVP simplicity; college mail server viable if its SMTP relay supports the required send volume without being flagged as bulk mail — see `06_Technology_Stack.md`.

**If unresolved by Day 11:** Use a console/log-based provider in development and flag the production send path as pending — do not silently default to a real third-party provider without the Secretary's confirmation, since it may involve a cost commitment.

### Q3 — Graduated Batch Retention Policy

**Question:** Are graduated batches archived (retained, hidden from active use) or deleted? For how long?

**Why it matters:** Affects database design's lifecycle handling (`08_Database_Design.md`), backup retention (`14_Security_Architecture.md`), and whether historical placement data remains available for brochure/NAAC-NBA reporting (Phase 3–4) or is lost once a batch graduates.

**Current default:** None assumed — the schema supports either outcome (`Batch.status` distinguishes `ARCHIVED` from any future deletion action) without committing to one. No batch has been auto-deleted or auto-archived by default.

**If unresolved:** Acceptable through MVP (no batch graduates mid-MVP), but should be resolved before the first real batch graduates under the system — flagged as risk R8 in `17_Risk_Assessment.md`.

### Q4 — Coordinator Access

**Question:** Who specifically receives Coordinator privileges? What is the maximum number of Coordinators? What permission boundaries beyond the default batch-scoping (`09_User_Roles_and_Permissions.md`) does the Secretary want?

**Why it matters:** Affects onboarding process and whether additional permission granularity (e.g., a Coordinator who can approve profiles but not create Drives) is needed beyond the MVP's single Coordinator role.

**Current default:** No hard limit on Coordinator count; a single Coordinator permission level (full authority within assigned batch scope) for MVP — see `09_User_Roles_and_Permissions.md` Assumptions.

**If unresolved:** No blocker — this is an operating decision the Secretary can make and change at any time via the admin dashboard, not an architectural constraint requiring advance commitment.

## Additional Questions Raised During Documentation

### Q5 — Brochure "Canva-Compatible" Export: Exact Expectation

**Question:** Does "Canva-compatible" mean the exported PPTX/PDF simply opens cleanly for further manual editing in Canva/PowerPoint (this document's working assumption, `FR-BROCH-05`), or is a direct Canva API integration (e.g., pushing a design directly into a Canva project) expected?

**Why it matters:** These are very different engineering efforts — the former is a Phase 3 export-format concern; the latter would require Canva's developer platform/API and a different scope of work entirely.

**Current default:** Structurally editable export (PDF + native PPTX), not a live Canva API integration — see `03_Functional_Requirements.md` (FR-BROCH-05) and `06_Technology_Stack.md`.

**If unresolved:** Not a blocker until Phase 3 planning begins; should be confirmed before Brochure Builder implementation starts.

### Q6 — Academic Data Source of Truth

**Question:** Is CGPA/backlog data entered manually by the Secretary/Coordinators into MYARCH each season, or is there an existing institutional system it should ideally be sourced from?

**Why it matters:** Affects whether Excel import (FR-STUD-05) is the primary data-entry path (implying manual entry is the norm) or whether a future integration with an institutional academic system should be anticipated architecturally.

**Current default:** Manual entry / Excel import, no institutional integration assumed — see `01_Product_Vision.md` Assumptions.

**If unresolved:** Not a blocker for MVP; worth confirming once Phase 2 Excel import is being built, so the import format matches whatever source the Secretary actually pulls CGPA data from today.

### Q7 — Peer Visibility Among Students

**Question:** Should students be able to browse other students' approved Public Profiles (peer visibility), or is the Public Profile visible only to Recruiters and admins?

**Why it matters:** Affects the recruiter-directory read path's reuse (`09_User_Roles_and_Permissions.md` Assumptions) and whether a "browse batch" feature is expected by students.

**Current default:** No peer browsing in Phase 1 (assumption, not a confirmed requirement).

**If unresolved:** Not a blocker for MVP as specified; confirm before considering it for a later phase.

## Assumptions

- Every "current default" listed above is a documented placeholder specifically so implementation is not blocked by an unanswered question — none of these defaults should be read as a final decision made without the Secretary, and each is flagged precisely because it needs confirmation.

## Future Considerations

- As each question is resolved, move the outcome into `19_Decision_Log.md` with the date and rationale, and remove (or mark resolved) the corresponding entry here, keeping this document a true reflection of what's still actually open.
