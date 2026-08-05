# 20 — Acceptance Test Plan

## Purpose

This document provides the final checklist before declaring the MVP production-ready. It defines the manual acceptance criteria against which the Secretary (or whoever performs sign-off) verifies that every MVP feature works correctly before TNPArch goes live at `tnparch.in`. It is the last gate in the Phase 1 schedule — corresponding to Day 12 ("Testing — real student data, bug fixing") and the go/no-go decision ahead of Day 14 ("Deployment, project handoff") in `16_Project_Roadmap.md`.

This document is deliberately **implementation-agnostic**: it describes expected system *behavior*, not code, so it remains valid regardless of how a given feature is technically implemented, and so it can be executed by someone testing the live product without needing to read source code.

## Scope

This plan covers **Phase 1 (MVP) functionality only**, as defined in `03_Functional_Requirements.md` and scoped by `02_Project_Objectives.md`. It does not test Phase 2–4 features (application pipeline, brochure builder, studio import, alumni matching, WhatsApp notifications, mobile PWA, NAAC/NBA reporting) since these are explicitly deferred beyond MVP per `16_Project_Roadmap.md`. Each Phase 2+ feature should receive its own acceptance test plan when its phase is scheduled for release.

Automated test coverage (unit, integration, end-to-end) is addressed separately in `21_Testing_Strategy.md`; this document is the **manual, human-executed** verification pass that precedes production sign-off, and assumes automated tests are already passing before manual acceptance testing begins.

## Test Environment

Before acceptance testing begins, the following must be in place:

- **Fresh database** — a clean environment free of leftover test artifacts from development, so results reflect true first-run behavior (matching a real production go-live, not an environment already patched around known issues).
- **Secretary account** — one active Secretary (Super Admin) account with full platform access.
- **Coordinator account(s)** — at least two Coordinator accounts, each scoped to a *different* Batch, specifically so cross-batch access boundaries can be verified (per `09_User_Roles_and_Permissions.md`).
- **Student account(s)** — at least three student accounts across at least two Batches, with varied data completeness (one with a fully completed profile, one with a minimal/incomplete profile, one with an active backlog) so eligibility and validation edge cases surface.
- **Recruiter account** — at least one Recruiter account, associated with a Company, to verify the recruiter-facing directory and access boundaries.
- **Email service configured** — a working transactional email path (whichever provider is confirmed per `18_Open_Questions.md` Q2), pointed at a real or test inbox capable of receiving and inspecting sent mail.
- **File storage configured** — object storage (per `06_Technology_Stack.md`) reachable and writable, so resume/portfolio upload tests reflect real behavior rather than a mocked storage layer.
- **HTTPS-enabled environment** — acceptance testing for security-related checks (below) should run against an environment with HTTPS enabled, matching the production configuration described in `15_Deployment_Strategy.md`.

Each test case below assumes this environment is available and reset to a known state before the pass begins.

---

## Functional Acceptance Tests

Each test case is written as: preconditions, action, expected result. A test case **fails** if the actual result differs from the expected result in any way that affects correctness, security, or data integrity — not only on a hard crash.

### Authentication

| # | Test Case | Expected Result |
|---|---|---|
| AUTH-01 | Log in with a valid email and password | Login succeeds; an access token and refresh token are issued; the user lands on the dashboard appropriate to their role |
| AUTH-02 | Log in with a valid email and an incorrect password | Login is rejected with a clear, generic error (does not reveal whether the email exists) |
| AUTH-03 | Log in with an email that does not exist | Login is rejected with the same generic error as AUTH-02 (no account-enumeration signal) |
| AUTH-04 | Attempt to access a protected route using an expired access token | Request is rejected (`401`); the client is prompted to refresh or re-authenticate |
| AUTH-05 | Present a valid refresh token to request a new access token | A new access token is issued without requiring the user to re-enter credentials |
| AUTH-06 | Present an already-used (rotated-out) refresh token | Request is rejected, and the entire session/token family is invalidated, requiring full re-login |
| AUTH-07 | Log out | The refresh token is invalidated server-side immediately; it cannot be used afterward to obtain a new access token |
| AUTH-08 | Request a password reset for a valid account | A single-use, time-limited reset link is emailed; using it allows setting a new password |
| AUTH-09 | Attempt to reuse a password-reset link after it has already been used once | The second attempt is rejected |
| AUTH-10 | Attempt several logins in quick succession with an incorrect password | After a defined threshold, further attempts are rate-limited/temporarily blocked |

### Role-Based Access Control

| # | Test Case | Expected Result |
|---|---|---|
| RBAC-01 | Secretary accesses any Batch, Student, Coordinator, or approval-queue view | Full access is granted in every case |
| RBAC-02 | Coordinator accesses a Student within their assigned Batch | Access is granted, including Private Profile data |
| RBAC-03 | Coordinator attempts to access a Student in a Batch **not** assigned to them | Access is denied (`403`); no private data, and ideally no confirmation the student exists, is returned |
| RBAC-04 | Coordinator attempts to approve/reject a Public Profile draft outside their assigned Batch | Action is rejected |
| RBAC-05 | Coordinator attempts to create or modify another Coordinator's account | Action is rejected — Coordinator account management is Secretary-only |
| RBAC-06 | Student logs in and views their own Private Profile | Their own contact info, CGPA, backlog status, and remarks are visible as read (contact info editable, the rest read-only) |
| RBAC-07 | Student attempts to access another student's Private Profile via direct request (e.g., altering an ID in the URL/request) | Access is denied |
| RBAC-08 | Recruiter attempts to access any Private Profile endpoint, directly or by altering a request | Access is denied in every case, with no partial data leakage |
| RBAC-09 | Recruiter attempts to view a Student's Public Profile Draft (pending, not yet approved) | Access is denied — only the currently approved Public Profile is ever reachable |
| RBAC-10 | An unauthenticated user attempts to reach any protected route or API endpoint | Request is rejected with `401` |
| RBAC-11 | An authenticated user of one role attempts an action reserved for another role (e.g., a Student attempting to approve their own draft) | Request is rejected with `403` |

### Batch Management

| # | Test Case | Expected Result |
|---|---|---|
| BATCH-01 | Secretary creates a new Batch | Batch is created and appears in the batch list immediately |
| BATCH-02 | Secretary edits a Batch's name/details | Changes are saved and reflected wherever the Batch is referenced (student rosters, coordinator scope) |
| BATCH-03 | Secretary archives a Batch | Batch status changes as expected; its default visibility in active views changes per `08_Database_Design.md`'s lifecycle model, without deleting any underlying data |
| BATCH-04 | Secretary or in-scope Coordinator assigns a Student to a Batch | The student appears correctly under that Batch in listings and in the assigned Coordinator's scope |
| BATCH-05 | Secretary views the full Batch listing; Coordinator views their scoped Batch listing | Secretary sees all Batches; Coordinator sees only their assigned Batch(es) |

### Student Management

| # | Test Case | Expected Result |
|---|---|---|
| STUD-01 | Secretary/Coordinator creates a new Student record with all required fields | Record is created successfully and is immediately visible in the relevant Batch roster |
| STUD-02 | Secretary/Coordinator updates a Student's details (CGPA, backlog status, remarks) | Changes are saved; the update is attributable to the acting user (traceability, per `14_Security_Architecture.md`) |
| STUD-03 | Search for a Student by name or roll number | Correct matching student(s) are returned; no unrelated students are returned |
| STUD-04 | Filter the Student list by Batch, CGPA range, or backlog status | Only students matching the filter criteria are shown |
| STUD-05 | Archive/deactivate a Student record | Student is marked inactive; they can no longer log in, but their historical record is retained, not deleted (per retention handling in `08_Database_Design.md`) |
| STUD-06 | Restore a previously archived/deactivated Student | Student regains access and reappears in active listings |
| STUD-07 | Attempt to create a Student with an invalid or out-of-range field (e.g., CGPA above 10, duplicate roll number) | Creation is rejected with a clear, field-specific validation error |

### Private Profile

| # | Test Case | Expected Result |
|---|---|---|
| PRIV-01 | Student edits their own contact information (phone, personal email) | Changes are saved and visible to the Secretary/in-scope Coordinator |
| PRIV-02 | Student attempts to edit their own CGPA, backlog status, or internal remarks | The interface does not permit this; any direct attempt via a non-UI request is rejected, since these are department-entered fields |
| PRIV-03 | In-scope Coordinator views a Student's Private Profile | CGPA, backlog status, contact info, and internal remarks are all visible |
| PRIV-04 | Recruiter attempts to access any part of a Student's Private Profile | Access is denied in full — no field, including non-sensitive-seeming ones, is returned |
| PRIV-05 | Confirm confidential documents and internal remarks never appear in any Recruiter-facing view, export, or API response | No such data is present under any circumstance tested |

### Public Profile

| # | Test Case | Expected Result |
|---|---|---|
| PUB-01 | Student edits their Public Profile (bio, skills, software, projects, portfolio links, resume, certifications, internships) | Edits are saved as a **draft**; the currently published, recruiter-visible profile is unaffected |
| PUB-02 | While a draft is pending review, check the Recruiter-facing view of that student | The Recruiter sees only the last **approved** version (or nothing, if none has ever been approved) — never the pending draft |
| PUB-03 | Secretary or in-scope Coordinator approves a pending draft | The draft becomes the new published Public Profile; it is now visible to Recruiters; the student is notified |
| PUB-04 | Secretary or in-scope Coordinator rejects a pending draft with a reason | The draft is returned to the student in an editable state, with the rejection reason visible; the previously published profile (if any) remains unchanged and still visible to Recruiters |
| PUB-05 | Student edits and resubmits a previously rejected draft | The resubmitted draft re-enters the approval queue correctly, and the prior rejection reason does not block resubmission |

### Approval Workflow

| # | Test Case | Expected Result |
|---|---|---|
| APR-01 | Student submits a draft for review | Draft status changes to Pending Review; it appears in the correct Coordinator's/Secretary's approval queue |
| APR-02 | Approval queue is filtered/viewed by an in-scope Coordinator | Only drafts belonging to students in their assigned Batch(es) appear |
| APR-03 | Approve a pending draft | Status changes to Approved; publication and notification occur as described in PUB-03 |
| APR-04 | Reject a pending draft | Status changes to Rejected; feedback is delivered to the student as described in PUB-04 |
| APR-05 | Resubmit a rejected draft | Status correctly returns to Pending Review and reappears in the approval queue |
| APR-06 | Confirm a full approval workflow end-to-end: Submit → Pending → Approve → Publish | Each transition happens in the correct order with no way to skip a step (e.g., no path directly from Draft to Published without an approval action) |

### Recruiter Portal

| # | Test Case | Expected Result |
|---|---|---|
| REC-01 | Recruiter browses the student directory | Only students with an approved, published Public Profile appear |
| REC-02 | Recruiter searches by name, skill, or software | Correct matching approved profiles are returned |
| REC-03 | Recruiter filters by Batch or other approved-profile attributes | Only matching approved profiles are returned |
| REC-04 | Recruiter opens an approved Student's full profile | All approved Public Profile content (bio, skills, software, selected projects, portfolio links, certifications, internships) is visible and correctly rendered |
| REC-05 | Recruiter downloads a Student's resume from an approved profile | The correct, current resume file downloads successfully |
| REC-06 | Confirm a Student with no approved profile (never approved, or currently only has a pending/rejected draft) never appears in Recruiter search, filter, or direct-access attempts | Student is fully absent from all Recruiter-facing surfaces |
| REC-07 | Confirm a Student whose Batch has been archived (per BATCH-03) behaves as expected in Recruiter search per the current retention/visibility rules | Behavior matches whatever default visibility rule is documented for archived batches |

### CSV / Excel Export

| # | Test Case | Expected Result |
|---|---|---|
| EXP-01 | Secretary/Coordinator exports student data (within their permission scope) | Export completes successfully and downloads |
| EXP-02 | Open the exported file in a standard spreadsheet application | File opens without corruption or formatting errors |
| EXP-03 | Compare exported data against the live database records | Data matches exactly at the time of export — no missing, duplicated, or mismatched rows/fields |
| EXP-04 | Export data containing non-ASCII/Unicode characters (e.g., names with diacritics, non-Latin scripts) | Characters are preserved correctly in the exported file, not corrupted or replaced with placeholder characters |
| EXP-05 | Coordinator exports data | Only records within their assigned Batch scope are included in the export — no out-of-scope data leaks into the file |

### Email Notifications

| # | Test Case | Expected Result |
|---|---|---|
| MAIL-01 | A Public Profile draft is approved | The student receives an approval email with correct, relevant content |
| MAIL-02 | A Public Profile draft is rejected | The student receives a rejection email including the stated reason |
| MAIL-03 | A Placement Drive is announced to eligible students | Relevant students receive a drive announcement email |
| MAIL-04 | An email is sent to an invalid or non-existent address | The system handles the failure gracefully (logs/flags the failure) without crashing the triggering action (e.g., an approval still completes even if the notification email fails to send) |

### File Uploads

| # | Test Case | Expected Result |
|---|---|---|
| FILE-01 | Student uploads a valid resume file (allowed type, within size limit) | Upload succeeds and the file is correctly associated with the student's profile |
| FILE-02 | Student uploads valid portfolio images | Upload succeeds and images display correctly on the profile |
| FILE-03 | Student attempts to upload a file exceeding the configured size limit | Upload is rejected with a clear error before it is stored |
| FILE-04 | Student attempts to upload a disallowed file type (including a disguised file, e.g., an executable renamed with an image extension) | Upload is rejected based on actual file content, not merely the filename/extension |
| FILE-05 | Student replaces an existing resume or portfolio file with a new upload | The new file replaces the old one; the previously uploaded file is no longer served as current, and recruiter-facing links reflect the new file after the next approval (per the draft/publish workflow) |

---

## Security Acceptance Tests

| # | Test Case | Expected Result |
|---|---|---|
| SEC-01 | Inspect how passwords are stored | Passwords are stored as bcrypt hashes (cost factor 12 or higher) — never in plaintext, and never present in logs |
| SEC-02 | Tamper with a JWT (e.g., modify its payload or signature) and attempt to use it | The tampered token is rejected |
| SEC-03 | Attempt to access every protected route while unauthenticated or under-authorized | All such attempts are correctly rejected (`401`/`403`) per the RBAC test cases above |
| SEC-04 | Trigger the rate limit on login and password-reset endpoints | Requests are throttled/blocked after the defined threshold, and normal use resumes once the window passes |
| SEC-05 | Submit malformed, missing, or unexpected fields to API endpoints | Requests are rejected with clear validation errors, not processed or silently coerced |
| SEC-06 | Submit invalid file uploads (type, size, disguised content) | Rejected per FILE-03/FILE-04 |
| SEC-07 | Access the production environment over plain HTTP | The request is redirected to HTTPS; no functionality is served unencrypted |
| SEC-08 | Perform a profile approval, rejection, or admin action (e.g., Coordinator creation) | A corresponding audit log entry is created, correctly attributing the action to the acting user with a timestamp |
| SEC-09 | Have a Coordinator view a Student's Private Profile | This access itself is recorded in the audit log, per the sensitive-data-access logging requirement in `14_Security_Architecture.md` |
| SEC-10 | Verify the existence and integrity of a recent database backup | A backup exists per the defined schedule, and a documented restore procedure has been executed successfully at least once before go-live |

## Performance Checks

| # | Test Case | Expected Result |
|---|---|---|
| PERF-01 | Load the Secretary/Coordinator dashboard | Dashboard loads within an acceptable time under realistic data volume (per the scale assumptions in `04_Non_Functional_Requirements.md`) |
| PERF-02 | Search/filter the student directory with a realistic number of records | Results return without noticeable lag |
| PERF-03 | Browse and filter the Recruiter-facing student directory, including profiles with portfolio images | Browsing remains smooth; images load progressively without blocking the rest of the page |
| PERF-04 | Export a full Batch's data to CSV/Excel | Export completes successfully within a reasonable time and without timing out or freezing the interface |

## Accessibility Checks

| # | Test Case | Expected Result |
|---|---|---|
| A11Y-01 | Navigate the core flows (login, profile editing, approval queue, recruiter directory) using only a keyboard | Every interactive element is reachable and operable without a mouse |
| A11Y-02 | Tab through interactive elements | A visible focus indicator is present at all times and never suppressed |
| A11Y-03 | Check text and UI element contrast against the dark background/palette | Contrast meets the WCAG 2.1 AA thresholds defined in `23_Accessibility_Guidelines.md` |
| A11Y-04 | Inspect form fields and status indicators with a screen reader | Fields have correctly associated labels; status (e.g., Pending/Approved/Rejected) is announced, not conveyed by color alone |
| A11Y-05 | View core flows at common mobile and desktop viewport widths | Layout remains usable and coherent at each tested width, with no broken or overlapping elements |

---

## Final MVP Acceptance Checklist

- [ ] Authentication complete
- [ ] RBAC verified
- [ ] Batch management working
- [ ] Student management working
- [ ] Private profile secure
- [ ] Public profile approval working
- [ ] Recruiter portal verified
- [ ] CSV/Excel export verified
- [ ] Email notifications verified
- [ ] File uploads verified
- [ ] Security checks passed
- [ ] Performance checks passed
- [ ] Accessibility checks passed
- [ ] Deployment verified

## Definition of Done

The MVP is considered complete only when every acceptance test in this document has passed without critical defects, and the system has been reviewed and formally approved by the T&P Secretary for production use. A critical defect is any failure that compromises the private/public profile boundary, allows unauthorized access, causes data loss, or blocks a core Phase 1 workflow described in `03_Functional_Requirements.md`. Non-critical issues may be logged and deferred, at the Secretary's discretion, without blocking go-live — but the Secretary's explicit sign-off, not the completion of testing alone, is what marks the MVP as done.
