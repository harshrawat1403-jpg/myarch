# 01 — Product Vision

## Purpose

This document defines why the MYARCH platform exists, who it serves, and what success looks like. It is the interpretive lens for every other document in this repository — when a later decision is ambiguous, it should be resolved in favor of the intent described here.

## Scope

Applies to the entire platform across all phases (MVP through Phase 4). Does not cover implementation detail — see `05_System_Architecture.md`, `06_Technology_Stack.md`, and `08_Database_Design.md` for how the vision is realized.

## Background

The Department of Architecture & Planning at VNIT Nagpur currently runs its training and placement (T&P) operations through WhatsApp groups, Excel spreadsheets, email threads, and shared folders. This is coordinated by the T&P Secretary (a student office-bearer) and a small group of Student Coordinators, on behalf of the department, for the benefit of students and recruiting companies.

This process breaks down predictably every placement season:

- Student data (CGPA, contact details, resumes, portfolios) lives in scattered spreadsheets with no single source of truth.
- There is no separation between information a student shares with the department and information a student wants a recruiter to see.
- Recruiters receive static PDFs or spreadsheets instead of a searchable, filterable view of eligible candidates.
- Placement brochures are rebuilt by hand every season in Canva or InDesign, re-typing statistics that already exist somewhere in a spreadsheet.
- There is no audit trail for who approved what, and no consistent access control — anyone with a shared folder link can see everything.

MYARCH replaces this with a single, private, department-owned system of record.

## Product Vision Statement

**MYARCH is the private, portfolio-first platform for the Department of Architecture & Planning — the single place where student academic and portfolio data lives, where the Secretary and Coordinators run placement drives, and where recruiters discover architecture talent through visual work rather than text-only resumes.**

It is built as a focused, department-owned platform, not a general-purpose college ERP. Every design decision optimizes for the specific reality of architecture placements: recruiters hire on the strength of drawings, models, and studio work, not solely GPA and a bullet-point resume.

## Who This Serves

| Audience | What MYARCH gives them |
|---|---|
| **T&P Secretary** (Super Admin) | Full operational control: student records, batch management, drive management, approvals, exports, brochure generation, and an audit trail that protects them personally when questions are asked later. |
| **Student Coordinators** (Sub Admins) | Delegated, scoped authority to manage their batch(es) without needing the Secretary to do everything personally. |
| **Students** | One place to maintain academic records privately and curate a public, recruiter-facing portfolio profile — replacing "send me your resume over WhatsApp" with a permanent, always-current profile. |
| **Recruiters** | A searchable, filterable, portfolio-first view of eligible, approved students — replacing a PDF booklet with a live database. |
| **Department / Faculty / HOD** (indirect) | Defensible placement statistics, NAAC/NBA-ready reporting, and a professional brochure generated from real data instead of manually reconstructed each year. |

## Product Principles

1. **Portfolio-first, not resume-first.** Architecture recruiting is visual. The public profile treats selected projects, software proficiency, and portfolio links as first-class, not an attachment.
2. **Two profiles, one student.** Private (academic/administrative truth) and Public (recruiter-facing, curated, approved) are architecturally separate — not two views filtered from one record — because they have different owners, different approval rules, and different audiences.
3. **Nothing goes public without a human decision.** Every public profile change is a draft until a Secretary or Coordinator approves it. The platform never auto-publishes student-authored content.
4. **Department-owned, not vendor-owned.** Data lives under `myarch.in`, controlled by the department, not inside a WhatsApp group or a personal Google Drive that leaves with whoever set it up.
5. **Small admin team, low operating burden.** The Secretary and a handful of Coordinators rotate out every year or two as students graduate. The system must be simple enough for a new Secretary to operate with minimal handover training.
6. **Built to outlast one placement season.** Batches graduate; the platform persists. Historical data (past placement statistics, alumni outcomes) is a long-term asset, not disposable state.

## What MYARCH Is Not

- It is not a generic multi-department or multi-college ERP. It is scoped to one department.
- It is not a public job board — recruiters are invited/verified counterparties, not anonymous self-service signups (see `09_User_Roles_and_Permissions.md`).
- It is not a social network for students; there are no feeds, likes, or public comments.
- It is not intended to replace the department's official academic records system — CGPA and academic data stored here are for placement-eligibility purposes and are entered/maintained by the department, not treated as the authoritative academic transcript.

## Success Criteria

MYARCH is successful when, by the end of one placement season using it:

- No placement-related student data is exchanged over WhatsApp or ad hoc spreadsheets.
- Every recruiter interaction happens through the recruiter portal rather than an emailed PDF.
- The Secretary can generate a placement brochure with real, current statistics in minutes rather than days.
- A new Secretary, inheriting the role the following year, can operate the system from documentation and the admin dashboard alone.
- No unapproved private student data has ever been exposed to a recruiter (zero-incident bar — see `14_Security_Architecture.md`).

## Assumptions

- The department has authority to operate this platform independently, without requiring integration into VNIT's central institutional ERP for MVP.
- "Recruiter" refers to a company representative who has an existing, department-established relationship (invited to a drive), not an anonymous public user.
- CGPA/backlog data entered into MYARCH originates from the department/academic section and is treated as placement-eligibility data, not as a replacement academic transcript of record.
- The department is comfortable with the platform's design language deliberately diverging from typical SaaS/ERP conventions (see `12_Design_System.md`) as a differentiator, not a risk.
- Student office-bearer turnover (Secretary/Coordinators change most years) is a permanent condition of the product, not a temporary staffing gap.

## Future Considerations

- Extending the platform to other departments at VNIT as a template (out of scope for this brief, but the "feature-first, modular" architecture in `05_System_Architecture.md` is chosen partly to keep that door open without committing to it now).
- Alumni-facing features (mentor matching, long-term outcome tracking) as the platform accumulates multi-year history (Phase 3+).
- Positioning the brochure output and portfolio-first profile model as a recruiting differentiator the department can point to when engaging new recruiters.
