# 11 — UI Architecture

## Purpose

Defines how the frontend is structured to deliver a distinct, non-generic interface — one that reads as an architectural drafting tool rather than a typical SaaS dashboard — while remaining consistent, responsive, and maintainable across every role-specific view.

## Scope

Covers layout structure, navigation model, responsive strategy, and state/data-fetching conventions. Visual tokens (color, type, spacing) are defined in `12_Design_System.md`; reusable components are catalogued in `13_Component_Library.md`. This document is the structural layer between the two.

## Guiding Constraint

The brief is explicit: **the interface should not resemble a generic SaaS dashboard.** Every structural decision below is filtered through that constraint — where a typical dashboard pattern (card grids, sidebar nav, top bar) is used, it is deliberately re-skinned around the drafting-sheet metaphor rather than left as an unstyled default.

## Layout Model: The Drawing Sheet

Each authenticated screen is conceptually a **drawing sheet**: a bounded canvas with a persistent, structured frame — mirroring how a physical architectural drawing has a border, a title block, and a content area, rather than an infinitely scrolling generic page.

```
┌───────────────────────────────────────────────────┐
│  Top strip: role identity, current section, search │
├───────────────┬─────────────────────────────────────┤
│               │                                      │
│  Left rail:   │   Content area                       │
│  section nav  │   (the "drawing" — tables, profile   │
│  (persistent, │    forms, drive boards, etc.)        │
│  role-scoped) │                                      │
│               │                                      │
├───────────────┴─────────────────────────────────────┤
│  Title Block strip: contextual metadata for the      │
│  current view (see 12_Design_System.md)              │
└───────────────────────────────────────────────────┘
```

- The left rail is **role-scoped**: a Student's rail shows Profile, Drives, Applications; a Coordinator's rail shows Students, Approvals, Drives (within scope); the Secretary's rail additionally shows Batches, Coordinators, Brochure. This mirrors the `(student)/(admin)/(recruiter)` route groups in `07_Repository_Structure.md`.
- The Title Block strip is not decorative chrome — it is a functional, reused component (see `12_Design_System.md`) that grounds the user in *what* they're looking at (Project/Scale/Date/Drawn By metaphor), reinforcing the drafting-sheet identity on every screen rather than only on a landing page.

## Navigation Model

- **Persistent left rail** for primary navigation within a role — no hamburger-collapsed navigation on desktop, since the admin/coordinator workflows are dense and benefit from always-visible section access.
- **Breadcrumb-free by design**: because the rail is section-based and shallow (at most two levels deep — e.g., Students → Student Detail), a breadcrumb trail is redundant chrome. Depth is kept shallow deliberately rather than compensated for with breadcrumbs.
- **Command surface (search)** in the top strip is the fast path to a specific student/company/drive, favored over deep nested navigation for lookup-heavy admin tasks.

## Responsive Strategy

- **Desktop-first for admin/coordinator/recruiter roles**, since these are working tools used at a desk during active placement season (data-dense tables, approval queues, filters).
- **Mobile-first for the student-facing profile editor and public profile view**, since students are more likely to check/update their profile from a phone.
- The left rail collapses to a bottom or slide-out navigation below a defined breakpoint; the Title Block strip simplifies (fewer fields shown) rather than disappearing, preserving the drafting-sheet identity even on small screens.
- Full mobile-app-grade responsiveness (PWA) is a Phase 4 objective (`02_Project_Objectives.md`); Phase 1–3 targets "usable and coherent on mobile," not "native-app equivalent."

## Data Fetching & State

- Server Components fetch data directly for initial page loads (list views, profile views) — no client-side loading spinner for data available at request time, keeping image-heavy portfolio pages fast (`NFR-PERF-02`).
- Client Components handle interactive state only where necessary: the profile draft editor, filter controls in the recruiter directory, and the approval queue's optimistic status updates.
- No global client-side state management library is introduced for Phase 1 — server state is fetched per-view via Server Components/route handlers, and local UI state (form state, filter selections) uses React's built-in state. This is revisited only if genuine cross-view client state needs emerge (see Future Considerations).

## Forms: Draft-First Editing

Every form that touches Public Profile content is architecturally a **draft editor**, never a direct-edit-then-save-to-published form — this is a UI-layer reflection of the approval workflow in `08_Database_Design.md` and `05_System_Architecture.md`, so the interface never implies an edit is live until it explicitly is (a visible "Pending Review" / "Published" state indicator is always present, never left ambiguous).

## Error & Empty States

- Error states are informative, not generic ("Unable to save — CGPA must be between 0 and 10" rather than "Something went wrong").
- Empty states (no students in a batch yet, no pending approvals) are treated as first-class designed states, using the Title Block motif to explain what belongs in that space rather than a blank void.

## Assumptions

- No dedicated native mobile app is in scope for any phase; "mobile" means responsive web / PWA (Phase 4), not iOS/Android app store distribution.
- The admin/coordinator user base is small enough (a handful of people) that a persistent, non-collapsing desktop navigation rail is a net usability win rather than wasted space.
- Real-time (websocket-based) UI updates are not required for Phase 1–2; the approval queue and application pipeline are refreshed on navigation/action, not pushed live, which is acceptable given the department's usage cadence.

## Future Considerations

- If application pipeline usage (Phase 2) becomes highly concurrent (multiple coordinators processing the same drive simultaneously), revisit real-time updates (e.g., via polling first, websockets only if polling proves insufficient).
- If mobile usage significantly outpaces desktop for admin roles, revisit the desktop-first assumption for the admin rail.
