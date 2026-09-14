# 13 — Component Library

## Purpose

Catalogues the reusable UI components MYARCH is built from, so features are assembled from a consistent, shared set rather than each screen inventing its own version of a card, table, or form field. This document defines *what* components exist and their responsibilities; visual tokens come from `12_Design_System.md`, structural placement from `11_UI_Architecture.md`.

## Scope

Covers Phase 1–3 component needs. Does not include implementation code — components are built in Claude Code against this catalogue as a specification.

## Component Ownership Model

Following the `06_Technology_Stack.md` decision to own component code (shadcn/ui pattern) rather than depend on a pre-styled component library as a black box, every component below lives in `src/components/` (shared) and consumes design tokens from `src/design-system/` — never a hardcoded color or font value inside a component file.

## Core Primitives

| Component | Responsibility |
|---|---|
| `Button` | Primary/secondary/ghost/destructive variants; accent color reserved for primary only |
| `Input`, `Textarea`, `Select`, `Checkbox` | Form primitives with consistent label, helper text, and error-state treatment |
| `Badge` | Status indicators (Pending/Approved/Rejected, Applied/Shortlisted/Offer, etc.) using the semantic status colors from `12_Design_System.md` |
| `Table` | Data-dense list rendering (student directory, application pipeline) with sortable columns and consistent row density |
| `Modal` / `Dialog` | Translucent, frosted overlay treatment per `12_Design_System.md`; used for confirmations and focused single-record edits |
| `Toast` | Transient feedback (save succeeded, export ready) — restrained motion, auto-dismiss |
| `Tabs` | Sectioned content within a single view (e.g., Private / Public tabs on a student detail page) |
| `Skeleton` | Loading placeholders matching the shape of the content they precede, avoiding layout shift |

## Signature Components

### `TitleBlock`

The reused metadata panel described in `12_Design_System.md`. Implemented as a single component with a typed props contract (`project`, `scale`, `date`, `drawnBy`, plus an optional `status` slot for a `Badge`), so every context that needs it (dashboard cards, profile headers, drive cards, statistics panels) renders the identical frame with different content — guaranteeing visual consistency without per-screen reimplementation.

```
<TitleBlock
  project="Student Profile — Jane Doe"
  scale="Batch 2022–27"
  date={profile.updatedAt}
  drawnBy={approver.name}
  status={<Badge variant="approved">Published</Badge>}
/>
```

### `SheetLayout`

The page-level "drawing sheet" frame from `11_UI_Architecture.md` — persistent border/frame treatment, left rail slot, content slot, and Title Block strip slot. Every authenticated route composes its page inside `SheetLayout` rather than hand-rolling layout per page.

### `ProfileCard`

Portfolio-first presentation of a student's approved Public Profile — used in the recruiter directory grid and on the student's own profile preview. Structured to foreground selected project imagery and portfolio links above text fields (bio, skills), directly implementing the brief's portfolio-first principle at the component level, not just as a page-layout convention.

### `ApprovalQueueItem`

A single pending draft in the Coordinator/Secretary approval queue — shows a diff-oriented summary of what changed from the currently published profile (not just the full new content), so an approver can review efficiently rather than re-reading an entire profile for a one-line change.

### `PipelineBoard` (Phase 2)

Kanban-style column view of Applications by status (Applied → Shortlisted → Interview → Offer → Rejected) for a given Drive, built from the same `Badge`/status tokens used elsewhere so pipeline status colors match approval-status colors conventionally (e.g., green consistently means "successful terminal state" whether that's "Approved" or "Offer").

### `StatPanel`

Wraps a `TitleBlock` with a large numeric figure (in IBM Plex Mono, per `12_Design_System.md`) — used for placement percentage, average package, and similar dashboard/brochure statistics, ensuring every statistic in the product (dashboard, analytics, brochure) is presented with the same visual weight and metadata framing.

### `BrochureCanvas` (Phase 3)

Renders the brochure's editable sections (cover, department intro, statistics, testimonials) using the same design tokens and `TitleBlock`/`StatPanel` components as the live app, so the exported brochure visually matches the product rather than being a separately designed artifact — supporting `05_System_Architecture.md`'s decision to reuse web components for PDF rendering via Playwright.

## Form Components (Draft-Aware)

Per `11_UI_Architecture.md`'s draft-first editing principle, form components used on the Public Profile editor carry an explicit `draftStatus` indicator (Draft / Pending Review / Published / Rejected) as a required prop, not an optional add-on — making it structurally difficult to build a profile-editing screen that fails to communicate publish state to the student.

## Accessibility Baseline (applies to every component)

- All interactive components are keyboard-operable and expose correct ARIA roles/states by default (e.g., `Modal` traps focus and restores it on close; `Tabs` follows the standard ARIA tabs pattern).
- Color is never the sole indicator of state — `Badge` and status indicators pair color with a text label or icon, so status remains legible under color-vision deficiency or on a badly calibrated projector (a real scenario for department presentations of placement statistics).
- Full detail in `23_Accessibility_Guidelines.md`.

## Assumptions

- Components are built as framework-native React components (no dependency on a third-party component library's runtime), consistent with the shadcn/ui-style ownership model in `06_Technology_Stack.md`.
- A living Storybook-style catalogue is not required for MVP given the small team size; this document serves as the component specification until/unless a visual catalogue becomes necessary for onboarding a second developer.

## Future Considerations

- If a second developer joins the project, consider introducing Storybook (or an equivalent) so components can be visually reviewed in isolation against this catalogue.
- `BrochureCanvas` may be extended with additional layout templates (Phase 3's "layout template" editable section) — new templates should be added as additional named variants of the same component rather than one-off custom markup, to keep brochure output visually consistent with the rest of the product.
