# 23 — Accessibility Guidelines

## Purpose

Defines concrete accessibility requirements for TNPArch, ensuring the dark, blueprint-inspired design system (`12_Design_System.md`) is usable by everyone — including students and recruiters using assistive technology, low vision, or keyboard-only navigation — without diluting the visual identity the brief specifically asks for.

## Scope

Covers the target conformance level, specific requirements by interaction type, and how these requirements interact with the design system's dark palette and restrained motion principles. Applies across all phases.

## Conformance Target

**WCAG 2.1 Level AA** is the target across the platform (`NFR-A11Y-02`). AAA is not required given the authenticated, relatively specialized user base (students, coordinators, verified recruiters — not a general public audience), but AA is treated as a hard bar, not an aspiration, because it directly affects whether a student or recruiter with a disability can actually use the platform.

## Color & Contrast

- All text and meaningful UI elements meet AA contrast ratios (4.5:1 for normal text, 3:1 for large text/UI components) against the dark backgrounds (`#15171B` background, `#1D2024` surface) specified in `12_Design_System.md`.
- `--color-text-secondary` (`#8B8F98`), used for captions and metadata, is checked against its actual usage context (which surface it sits on) to confirm it clears 4.5:1 for body-sized text; where a specific pairing falls short, that specific instance uses `--color-text-primary` instead rather than lowering the bar for that element.
- The accent color (`#4FB8D4`) is checked for contrast both as text-on-background and as a UI-component color (e.g., focus rings, active states) — its restrained, non-decorative-only usage pattern (`12_Design_System.md`) makes it easier to verify contrast consistently, since it appears in a limited number of contexts rather than scattered arbitrarily.
- **Color is never the sole indicator of meaning.** Status indicators (Pending/Approved/Rejected, Applied/Shortlisted/Offer) pair color with a text label or icon (`13_Component_Library.md`'s `Badge` component), so status remains legible under color-vision deficiency and in low-fidelity contexts (e.g., a department presentation projector with poor color reproduction).

## Keyboard Operability

- Every interactive element (buttons, form fields, the approval queue's approve/reject actions, the recruiter directory's filters) is reachable and operable via keyboard alone, with a visible focus indicator using the accent color at all times — never suppressed for aesthetic reasons.
- Focus order follows visual/logical reading order within the `SheetLayout` structure (`11_UI_Architecture.md`) — the left rail, then content, then the Title Block strip, not an arbitrary DOM order that diverges from what's visually presented.
- Modals/dialogs (`13_Component_Library.md`) trap focus while open and restore it to the triggering element on close, per standard ARIA dialog practice.

## Forms

- Every form field (student profile editor, drive creation, batch management) has a programmatically associated label — not a placeholder used as a substitute for a label, which disappears on input and is not reliably announced by all assistive technology.
- Validation errors are announced to assistive technology (via `aria-live` or equivalent) at the moment they occur, and are associated with their specific field (`aria-describedby`), not shown only as a generic banner disconnected from the field it concerns.
- Required vs. optional fields are indicated in a way that doesn't rely on color alone (e.g., explicit "required" text/asterisk with an accessible label, not merely a colored border).

## Images & Portfolio Content

- Every meaningful image (student portfolio images, recruiter logos, brochure assets) has appropriate alternative text. For student-uploaded portfolio images specifically, the profile editor prompts the student for a brief description at upload time — since the platform cannot infer meaningful alt text for an architectural drawing or model photo automatically, and generic alt text ("image") would fail the intent of accessible portfolio content in a portfolio-first product.
- Purely decorative imagery (if any) is marked so assistive technology skips it, rather than announcing meaningless content.

## Motion

- Per the design system's restrained-motion principle (`12_Design_System.md`), animations are short and functional; additionally, the platform respects the operating system's `prefers-reduced-motion` setting by disabling non-essential transitions for users who have indicated a sensitivity to motion, rather than assuming restrained motion alone is sufficient for every user.

## Data Tables

- The student directory, approval queue, and application pipeline tables (`13_Component_Library.md`'s `Table` component) use proper semantic table markup (headers associated with data cells), so sorting/filtering state and column meaning are announced correctly by assistive technology, not conveyed by visual position alone.

## Testing & Verification

- Automated accessibility linting (e.g., `axe`-based checks) runs as part of component-level testing (`21_Testing_Strategy.md`), catching contrast, missing-label, and ARIA-role issues before manual review.
- Key flows (login, profile draft editing, approval queue, recruiter search) are manually verified with keyboard-only navigation and at least one screen reader (e.g., NVDA or VoiceOver) before each phase's release, not assumed correct from automated checks alone — automated tooling catches a meaningful but partial subset of real accessibility issues.

## Assumptions

- The user base is authenticated and role-specific (no general public/anonymous audience), which justifies AA rather than AAA as the target conformance level.
- No specific assistive-technology usage has been reported by current students/recruiters, but the platform is built to AA regardless, as a baseline quality bar rather than a reactive accommodation.

## Future Considerations

- If a light mode is introduced (`12_Design_System.md` Future Considerations), it must independently meet the same AA contrast bar — it is not assumed to inherit the dark mode's accessibility properties automatically.
- The Mobile PWA (Phase 4) should be verified against mobile-specific accessibility concerns (touch target sizing, screen reader gesture navigation) in addition to the desktop-oriented checks above.
