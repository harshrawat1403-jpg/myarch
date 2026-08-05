# Admin Guide

**Audience:** the T&P Secretary and Batch Coordinators using the admin dashboard day to day. No technical background assumed.

## Signing in

Go to `/login` and sign in with your department email and password. What you see next depends on your role:

- **Secretary:** full access to every batch, every student, all exports, and system-wide audit history.
- **Coordinator:** the same dashboard, scoped to only the batch(es) you're assigned to — you won't see students, drafts, or exports outside your assigned batches, and this is enforced by the system itself, not just hidden in the menu.

If you're signed out after a period of inactivity, that's expected — sign in again to continue.

## Dashboard Overview

The landing page (`/dashboard`) shows: total and active student counts, pending approvals awaiting your review, and a summary card per batch. This is a read-only snapshot — use the sections below for actual work.

## Managing Batches

`Dashboard → Batches` (Secretary only for creating/editing; Coordinators see their assigned batches).

- **Create a batch:** name (e.g. "B.Arch 2026") and year. New batches start `ACTIVE`.
- **Change status:** `ACTIVE` → `GRADUATED` → `ARCHIVED` as a cohort completes the program. This affects what recruiters can see (recruiters only ever see students from `ACTIVE` batches) and how exports categorize students — it does not delete anything.

## Managing Students

`Dashboard → Students`.

- **Add a student:** email, full name, roll number, batch, and (optional at creation) private fields — phone, personal email, CGPA, backlog status/details, internal remarks. Private fields are visible only to you, Coordinators of that student's batch, and the student themself (their own contact info only, not the rest).
- **Search:** by name, roll number, batch, skills, software, or CGPA range. Archived students are hidden by default — check "include inactive" to see them too.
- **Archive / Restore:** archiving a student also disables their login (they can't be approving their own draft while archived); restoring re-enables both.
- **Confidential documents:** you can register a *reference* to a confidential document (ID proof, backlog certificate, etc.) — the system does not yet host file uploads itself (see "What this system does not do yet" below); this only records that such a document exists and where it's stored externally.

## Reviewing Profile Drafts (Approvals)

`Dashboard → Approvals` — this is your queue of student profile drafts submitted for review.

1. Open a submission to see the student's proposed public profile (bio, skills, software, portfolio links, etc.) — never their private fields, which aren't part of this view at all.
2. **Approve:** publishes the profile immediately — it becomes visible to recruiters from that moment on. The student is notified automatically (see "About notifications" below).
3. **Request changes:** write a comment explaining what needs fixing; the draft goes back to the student with your comment attached, and they're notified automatically. The student can resubmit as many times as needed.

A student cannot make their own profile visible to recruiters without your (or a Coordinator's) approval — there is no path that skips this review.

## About notifications

When you approve a draft or request changes, the affected student receives an email automatically — you don't need to tell them separately. **In the current deployment, if the production email provider hasn't been configured yet, these notifications are logged internally rather than actually emailed** (see `DEPLOYMENT_GUIDE.md`) — check with your system administrator if you're not sure whether real emails are going out yet. Either way, the approval/rejection itself takes effect immediately regardless of whether the email successfully sends.

## Exports

`Dashboard → Exports` — four downloadable CSV files (open in Excel/Google Sheets):

| Export | Contents | Who can run it |
|---|---|---|
| Student Directory | Every student's name, roll number, batch, institute email, skills, software, resume/portfolio availability, active status | Secretary, Coordinator (own batches) |
| Batch Report | Per-batch totals: total/active/archived student counts | Secretary, Coordinator (own batches) |
| Public Placement Dataset | The published, recruiter-visible profile fields only — for building placement brochures/reports | Secretary, Coordinator (own batches) |
| Recruiter Directory | Company/contact info for registered recruiters | Secretary only |

None of these ever include private fields (CGPA, backlog, phone, personal email, internal remarks) or confidential document references — they are structurally excluded from every export, not just hidden by a setting.

## Audit History

`Dashboard → Audit` — a read-only log of recent actions (logins, approvals, rejections). Secretaries see the whole department's activity; Coordinators see their own actions only. There is no way for anyone, including a Secretary, to edit or delete an audit entry through the application — this is by design.

## What this system does not do yet

Being upfront about current limitations so you don't go looking for something that isn't there:

- **No file upload.** Resumes, portfolio images, and confidential documents are referenced by a storage location, but the system does not yet host the actual upload — this depends on a storage provider decision still pending.
- **No student self-service password reset.** If a student is locked out, this needs to go through whoever administers the system directly.
- **No placement-drive/company-application tracking.** This system covers the student directory, profile approval workflow, recruiter browsing, and exports — drive/application tracking is a planned future phase, not present today.
