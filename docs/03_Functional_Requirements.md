# 03 — Functional Requirements

## Purpose

Defines what the system must *do*, expressed as discrete, testable requirements grouped by feature area and mapped to the phase in which they ship. This is the primary reference for QA scenarios and acceptance testing.

## Scope

Covers all functional behavior across Phase 1–4 as described in the project brief. Requirements are written to be independently testable. Non-functional qualities (performance, security posture, accessibility) are covered in `04_Non_Functional_Requirements.md` even where they constrain a functional requirement.

## Requirement Notation

Each requirement has an ID in the form `FR-<Area>-<Number>`, a phase tag, and a priority. Priority `P0` requirements block release of the phase they belong to.

---

## FR-AUTH — Authentication & Session Management (Phase 1)

- **FR-AUTH-01** (P0): Users authenticate with email + password. Passwords are hashed with bcrypt at cost factor 12 or higher; plaintext passwords are never logged or stored.
- **FR-AUTH-02** (P0): On successful login, the system issues a short-lived JWT access token and a longer-lived refresh token. Refresh tokens are stored in an httpOnly, secure cookie, never in localStorage.
- **FR-AUTH-03** (P0): Access tokens expire within minutes; refresh tokens can be used to obtain a new access token without re-entering credentials, up to the refresh token's own expiry.
- **FR-AUTH-04** (P0): Refresh tokens are rotated on use and invalidated on logout, password change, or detected reuse.
- **FR-AUTH-05** (P0): Login attempts are rate-limited per account and per IP to mitigate brute-force attacks.
- **FR-AUTH-06** (P1): Students and Coordinators can reset a forgotten password via an emailed, single-use, time-limited reset link.
- **FR-AUTH-07** (P0): Every authenticated request is authorized against the caller's role and scope before any data access occurs (see `09_User_Roles_and_Permissions.md`).

## FR-BATCH — Batch Management (Phase 1)

- **FR-BATCH-01** (P0): The Secretary can create, rename, and archive a Batch (e.g., "2026", "B.Arch 2022–27").
- **FR-BATCH-02** (P0): Coordinators can be assigned to one or more specific Batches; a Coordinator's data access is scoped to their assigned Batch(es) only.
- **FR-BATCH-03** (P0): Students belong to exactly one Batch.
- **FR-BATCH-04** (P1): A Batch can be marked "graduated," which affects default visibility and retention handling (see `18_Open_Questions.md` for the unresolved retention policy).

## FR-STUD — Student Database (Phase 1)

- **FR-STUD-01** (P0): The Secretary/Coordinator can create, view, update, and deactivate a student record within their scope.
- **FR-STUD-02** (P0): A student record stores, at minimum: name, roll number, batch, contact information, CGPA, backlog status, and internal remarks — all classified as Private Profile data.
- **FR-STUD-03** (P0): A student record additionally stores Public Profile fields: bio, skills, software proficiency, selected projects, portfolio links, resume file, certifications, and internships.
- **FR-STUD-04** (P0): Students can log in and edit their own Private contact information and their own Public Profile draft; students cannot edit CGPA, backlog status, or internal remarks (department-entered fields).
- **FR-STUD-05** (P1): Bulk student onboarding via Excel/CSV import (Phase 2), validated row-by-row with a per-row error report rather than an all-or-nothing failure.

## FR-PROF — Two-Profile & Approval Workflow (Phase 1)

- **FR-PROF-01** (P0): Private Profile and Public Profile are distinct data structures with independent access rules, not a single record with a visibility flag (see `08_Database_Design.md`).
- **FR-PROF-02** (P0): Any edit a student makes to their Public Profile is saved as a **draft** and does not affect the currently published (recruiter-visible) version until approved.
- **FR-PROF-03** (P0): A Secretary or a Coordinator scoped to that student's Batch can review a pending draft, and either approve (publishes it) or reject it with a reason visible to the student.
- **FR-PROF-04** (P0): Recruiters can only ever see the most recently **approved** Public Profile version — never a pending draft.
- **FR-PROF-05** (P1): Students receive an email notification when their draft is approved or rejected.
- **FR-PROF-06** (P1): The approval queue is filterable by Batch and sortable by submission time, so Coordinators can process their scope efficiently.

## FR-ADMIN — Admin Dashboard (Phase 1)

- **FR-ADMIN-01** (P0): The Secretary has a dashboard summarizing student counts, pending approvals, and active drives across all batches.
- **FR-ADMIN-02** (P0): Coordinators see the equivalent dashboard scoped to their assigned Batch(es) only.
- **FR-ADMIN-03** (P0): The Secretary can manage Coordinator accounts: create, assign batch scope, deactivate.
- **FR-ADMIN-04** (P1): The dashboard surfaces a profile-completeness indicator per student (full scoring model is Phase 4, per `02_Project_Objectives.md`; MVP may show a simple filled/empty field count).

## FR-RECRUIT — Recruiter Portal (Phase 1)

- **FR-RECRUIT-01** (P0): Recruiter accounts are created/invited by the Secretary or Coordinator, not self-registered.
- **FR-RECRUIT-02** (P0): Recruiters can browse and search approved Public Profiles by batch, skills, software, and other portfolio attributes.
- **FR-RECRUIT-03** (P0): Recruiters can view a student's full approved Public Profile, including portfolio links and selected projects.
- **FR-RECRUIT-04** (P0): Recruiters can download a student's resume file directly from the approved profile.
- **FR-RECRUIT-05** (P0): Recruiters cannot access any Private Profile field under any circumstance, at the API layer as well as the UI layer.

## FR-EXPORT — Data Export/Import (Phase 1–2)

- **FR-EXPORT-01** (P0, Phase 1): The Secretary/Coordinator can export student and profile data (scoped to their permissions) to Excel/CSV.
- **FR-EXPORT-02** (P1, Phase 2): Bulk import of student data from Excel/CSV with validation feedback (shared requirement with FR-STUD-05).

## FR-NOTIFY — Notifications (Phase 1+)

- **FR-NOTIFY-01** (P0, Phase 1): Email notification sent to a student when their Public Profile draft is approved or rejected.
- **FR-NOTIFY-02** (P1, Phase 1): Email notification sent to relevant students when a new Placement Drive is announced.
- **FR-NOTIFY-03** (P2, Phase 3): WhatsApp notification channel as an addition to, not a replacement for, email.

## FR-PIPE — Application Tracking Pipeline (Phase 2)

- **FR-PIPE-01** (P0): A Placement Drive is created for a Company, with eligibility criteria (e.g., minimum CGPA, no active backlog, batch).
- **FR-PIPE-02** (P0): Eligible students can apply to a Drive; an Application record tracks status through the pipeline: Applied → Shortlisted → Interview → Offer → Rejected.
- **FR-PIPE-03** (P0): Status changes are recorded with a timestamp and the actor who made the change, forming a full history per application.
- **FR-PIPE-04** (P1): A Drive may have multiple rounds (e.g., portfolio review, interview 1, interview 2); an application's status reflects current round.
- **FR-PIPE-05** (P1): Recruiters with self-service access can move applications through drive-specific stages without Secretary involvement, within the bounds of their own drive.

## FR-ANALYTICS — Analytics (Phase 2)

- **FR-ANALYTICS-01** (P1): Compute placement percentage, highest/average/median package, and sector breakdown per batch and cumulatively.
- **FR-ANALYTICS-02** (P1): Analytics are computed from live Application/Offer data, not manually entered summary numbers.

## FR-BROCH — Placement Brochure Builder (Phase 3)

- **FR-BROCH-01** (P0 within Phase 3): Generate a brochure directly from live database records — placement percentage, highest/average/median package, recruiter logos, hiring sectors, alumni stories, and testimonials — without manual re-entry of statistics.
- **FR-BROCH-02** (P1): Editable sections: cover page, department introduction, layout template choice, and per-section visibility toggles.
- **FR-BROCH-03** (P0): Export to print-ready PDF.
- **FR-BROCH-04** (P0): Export to editable PowerPoint (`.pptx`) with real, editable text/image objects (not a flattened image).
- **FR-BROCH-05** (P1): Export structure is Canva-compatible — meaning exported assets (PDF/PPTX) preserve enough structural fidelity (distinct layers/objects, standard fonts or embedded fonts, standard page sizes) that a human can continue editing in Canva or PowerPoint without rebuilding from scratch.

## FR-STUDIO — Studio Project Import (Phase 3)

- **FR-STUDIO-01** (P1): Students can import studio project entries (title, studio/semester, images, description, collaborators) into their Public Profile's "Selected Projects" section with less re-typing than manual entry, e.g., via a structured template rather than free-form upload only.

## FR-FEEDBACK — Interview Feedback Bank (Phase 3)

- **FR-FEEDBACK-01** (P1): Coordinators/Secretary can log structured interview feedback tied to a Company and Drive, reusable in future seasons for briefing students.

## FR-ALUMNI — Alumni Mentor Matching (Phase 3)

- **FR-ALUMNI-01** (P2): Graduated students (alumni) can opt in to a mentor pool; current students can be matched/introduced to alumni mentors by field of interest.

## FR-MOBILE — Mobile PWA (Phase 4)

- **FR-MOBILE-01** (P1): Core student and recruiter flows (view/edit profile, browse candidates, view drive status) are usable as an installable PWA on mobile devices.

## FR-REPORT — NAAC/NBA Reporting (Phase 4)

- **FR-REPORT-01** (P1): Generate accreditation-format placement reports from accumulated multi-year data.

---

## Assumptions

- "Recruiter self-service" (FR-PIPE-05) still requires the recruiter account itself to have been created/invited by the department; self-service refers to *pipeline actions*, not account creation.
- Excel import/export format assumes `.xlsx` as primary, with `.csv` supported as a lighter-weight alternative.
- Brochure "Canva-compatible" export (FR-BROCH-05) is interpreted as *structurally editable*, since no direct Canva API integration is implied by the brief — this is clarified further in `18_Open_Questions.md`.
- Eligibility criteria (CGPA/backlog thresholds) are configured per Drive by the Secretary/Coordinator, not hardcoded.

## Future Considerations

- As Phase 2 pipeline data accumulates across multiple placement seasons, functional requirements for year-over-year comparison views may be added.
- Studio Project Import may eventually integrate with department LMS/studio-review tools if such systems exist — no such integration is assumed today.
