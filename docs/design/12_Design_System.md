# 12 — Design System

## Purpose

Defines the visual language of MYARCH: color, typography, spacing, motion, and the signature Title Block motif — as concrete, reusable tokens rather than per-screen judgment calls. This document is the single source of truth for every visual decision; `13_Component_Library.md` describes how these tokens compose into components.

## Scope

Covers design tokens and the rationale behind them. Component-level application of these tokens is in `13_Component_Library.md`; structural/layout application is in `11_UI_Architecture.md`.

## Design Identity

MYARCH's interface is inspired by **architectural drafting sheets and blueprint drawings** — deliberately not a generic SaaS dashboard aesthetic. This is a functional choice, not decoration: the department's own discipline (architecture) is visually literate in technical drawings, and a placement platform that looks like one signals it was built specifically for them, not adapted from a generic template.

Concretely, this means: restrained color (a dark neutral field with a single precise accent, as a drafting sheet uses black/graphite lines with sparing color highlights), monospaced data labels (as dimension/annotation text on a drawing), and a persistent metadata block echoing a drawing's title block.

## Color Palette

| Token | Value | Usage |
|---|---|---|
| `--color-background` | `#15171B` | App background, the "sheet" |
| `--color-surface` | `#1D2024` | Panels, cards, elevated surfaces |
| `--color-text-primary` | `#ECEAE4` | Primary text — an off-white, not pure white, matching drafting paper rather than a screen-glare white |
| `--color-text-secondary` | `#8B8F98` | Secondary text, captions, metadata labels |
| `--color-accent` | `#4FB8D4` | Blueprint Cyan — primary interactive accent: links, active states, focus rings, primary actions |

**Usage discipline:**

- The accent color (`#4FB8D4`) is used sparingly and consistently for interactive/actionable elements only (primary buttons, active nav item, links, focus states, status indicators for "in progress"). It is never used decoratively (no accent-colored backgrounds on large surfaces) — this preserves its meaning as "this is actionable/current."
- Surfaces are differentiated by the two-step elevation between `--color-background` and `--color-surface` — additional elevation (e.g., a modal over a panel) uses subtle border/shadow treatment rather than introducing a third background color, keeping the palette restrained as specified in the brief.
- Semantic colors (success/error/warning, used for application status, approval state) are defined as controlled additions layered onto this palette, not as arbitrary bright colors — see Assumptions.

### Frosted/Translucent Surfaces

Per the brief's UI principles, elevated surfaces (modals, dropdowns, the Title Block strip when overlaying content) use a translucent, blurred treatment over `--color-surface` (backdrop blur + partial opacity) rather than a fully opaque panel — evoking layered drafting vellum rather than a flat solid UI panel. This is applied restrained: primary content panels (tables, forms) remain opaque for legibility; translucency is reserved for surfaces that intentionally sit *above* content (overlays, floating panels, the persistent Title Block strip).

## Typography

| Role | Typeface | Usage |
|---|---|---|
| Display | General Sans | Page titles, section headers, the Title Block's primary label |
| Body | IBM Plex Sans | Paragraph text, form labels, buttons, navigation |
| Data Labels | IBM Plex Mono | Numeric data (CGPA, package figures, dates, IDs), field annotations, the Title Block's metadata fields (Scale/Date/Drawn By style values) |

**Rationale:** General Sans gives headers a confident, contemporary display quality without being a novelty/display face. IBM Plex Sans is chosen for body text for its technical, neutral legibility (IBM Plex was designed with technical/engineering contexts in mind, which suits the drafting metaphor without resorting to a literal architectural stencil font that would hurt readability). IBM Plex Mono for data labels reinforces the "annotation on a drawing" feel for anything numeric or identifier-like (roll numbers, CGPA, dates, file sizes) and gives the interface a visual rhythm distinguishing *data* from *prose*.

### Type Scale

A single, consistent modular scale is used across the app (defined once as tokens, not per-component):

| Token | Approx. size | Usage |
|---|---|---|
| `--font-size-display` | 28–32px | Page-level titles |
| `--font-size-heading` | 20–22px | Section headers |
| `--font-size-body` | 15–16px | Default body/UI text |
| `--font-size-caption` | 13px | Secondary text, metadata |
| `--font-size-data` | 13–14px (mono) | Data labels, table figures |

## Spacing

A single 4px-base spacing scale (`4, 8, 12, 16, 24, 32, 48, 64`) is used throughout, exposed as tokens (`--space-1` through `--space-8`) rather than arbitrary per-component pixel values — directly supporting the brief's "consistent spacing" principle and making the drafting-sheet grid feel intentional rather than incidental.

## Motion

Per the brief's "restrained motion" principle:

- Transitions are short (150–200ms) and used only to communicate state change (hover, focus, expand/collapse, approval status change) — never purely decorative animation.
- Easing uses a standard ease-out curve; no bounce, spring, or attention-grabbing motion.
- Page-level transitions are avoided entirely — navigating between sections is instant, consistent with a tool used for focused, repetitive admin work rather than a marketing site.

## The Title Block: Signature Design Element

The Title Block is MYARCH's reused, load-bearing design motif — a persistent metadata panel styled after the information block in the corner of a technical architectural drawing, appearing consistently across:

- Dashboard summary cards
- Student profile headers
- Placement drive cards
- Statistics panels

**Structure** (fields adapt per context, but the frame and typographic treatment are constant):

```
┌───────────────────────────────────┐
│  PROJECT     Student Profile — Jane Doe   │
│  SCALE       Batch 2022–27                │
│  DATE        2026-08-05                   │
│  DRAWN BY    Coordinator: R. Sharma       │
└───────────────────────────────────┘
```

- Field labels (`PROJECT`, `SCALE`, `DATE`, `DRAWN BY`) are set in IBM Plex Mono, uppercase, in `--color-text-secondary` — literal drafting annotation styling.
- Field values are set in the context-appropriate body/display font in `--color-text-primary`.
- The block always sits in a fixed position relative to its container (bottom strip on a card, header strip on a full page) so its presence is predictable and never feels randomly placed.
- Field semantics adapt per context without changing the frame:
  - **Dashboard card**: PROJECT = card's subject (e.g., "Pending Approvals"), SCALE = the count/scope (e.g., "12 of 48 students"), DATE = last-updated timestamp, DRAWN BY = the acting role.
  - **Student profile header**: PROJECT = student name, SCALE = batch, DATE = last profile update, DRAWN BY = last approver.
  - **Placement drive card**: PROJECT = drive/company name, SCALE = eligible batch(es), DATE = drive date/deadline, DRAWN BY = drive creator.
  - **Statistics panel**: PROJECT = metric name, SCALE = the scope the statistic covers (e.g., "Batch 2026"), DATE = as-of date, DRAWN BY = "System" or the report generator's name for brochure-sourced stats.

This gives the interface a single, recognizable signature element that is genuinely functional (it always answers "what is this, what's its scope, when was it last touched, who's responsible") rather than a purely decorative flourish repeated for branding's sake.

## Assumptions

- Semantic status colors (approval pending/approved/rejected, application pipeline stages) are a controlled, minimal addition to the core five-token palette — e.g., the existing accent cyan for "in progress," a muted amber for "pending," a muted red for "rejected," and a muted green for "approved/offer" — chosen to read clearly against the dark background without breaking the restrained palette principle. Exact values are a Phase 1 implementation decision within this constraint, not a deviation from it.
- "General Sans" and "IBM Plex Sans/Mono" are assumed to be available as licensed/self-hostable web fonts (both are broadly available under open licenses); font files are self-hosted rather than loaded from a third-party CDN, consistent with keeping the platform's assets under the department's own control.
- Dark mode is the only mode for Phase 1–3 — the brief specifies a dark architectural palette without mentioning a light mode, and a light "blueprint" variant is not assumed to be needed unless requested later.

## Future Considerations

- If a light mode is requested later (e.g., for print-friendly admin views or accessibility preference), the token structure (CSS custom properties) is designed to support a `[data-theme="light"]` override without restructuring components — see `13_Component_Library.md` for how components consume tokens indirectly rather than hardcoding values.
- The Title Block motif could extend to the Placement Brochure Builder's cover page/section templates (Phase 3), reinforcing the same visual identity from in-app dashboards through to the exported recruiter-facing brochure.
