# 20 — Coding Standards

## Purpose

Defines how code is written in TNPArch so that it stays consistent, type-safe, and navigable by a future maintainer who is not the original author — a near-certainty given the annual Secretary/Coordinator turnover described in `01_Product_Vision.md`.

## Scope

Applies to all TypeScript/React code across the repository. Complements, rather than repeats, the structural rules in `07_Repository_Structure.md` (module boundaries) and `05_System_Architecture.md` (layering).

## Language & Type Safety

- TypeScript strict mode is enabled project-wide (`strict: true` in `tsconfig.json`) and never locally disabled.
- `any` is not used as a convenience escape hatch. Where a type genuinely cannot be known (e.g., a third-party library with poor types), it is isolated to a single, clearly commented boundary — not spread through business logic.
- Domain types (`Student`, `ApplicationStatus`, `ApprovalStatus`, etc.) are defined once in each module's `domain/entities.ts` and imported everywhere else — never redefined inline or duplicated per file.
- Prefer discriminated unions over boolean flags for state that has more than two meaningful values (e.g., `ApprovalStatus: 'DRAFT' | 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED'`, not two separate booleans that could contradict each other).

## Architecture Discipline

- Code respects the Clean Architecture layering in `05_System_Architecture.md`: Domain has zero framework imports; Application depends only on Domain and Application-layer ports; Infrastructure implements those ports; Presentation calls Application use cases and does not embed business logic.
- Cross-module imports go through a module's `index.ts` only, enforced by lint rule (`07_Repository_Structure.md`) — a build/lint failure, not a code-review-only convention.
- A use case does one thing (SOLID's Single Responsibility). If a use case's name needs "and" to describe it, it should be split.

## Naming

- Descriptive, unabbreviated names. `approveProfileDraft`, not `apprvDraft` or `handleAction`.
- Boolean variables/props read as a predicate: `isApproved`, `hasActiveBacklog`, not `approved` or `backlog` (ambiguous as to whether it's the boolean or the data itself).
- Avoid encoding types in names (no Hungarian notation); TypeScript's type system already communicates this.

## Comments

- Default to no comments. Code should be self-explanatory through naming and structure.
- A comment is added only to explain a non-obvious *why*: a business rule that isn't derivable from the code alone (e.g., "CGPA is department-entered and intentionally not student-editable — see `09_User_Roles_and_Permissions.md`"), a workaround for a specific external constraint, or a subtle invariant a future editor could easily break.
- Comments never restate what the code already says, never reference a specific past bug-fix PR by number, and are kept up to date — a stale comment is treated as worse than no comment and removed on sight during related work.

## Error Handling

- Domain/Application-layer errors are typed, specific error classes (e.g., `DraftNotPendingReviewError`), not generic thrown strings — allowing the Presentation layer to map errors to correct HTTP status codes deliberately (`10_API_Architecture.md`), not by string-matching.
- Errors are handled at the boundary where something can actually be done about them (e.g., the Presentation layer converts a domain error to a `400`/`403`/`409` response); they are not swallowed silently anywhere in the stack.
- No empty `catch` blocks. If an error is intentionally ignored, that decision is explicit and commented with why.

## Validation

- All external input (API request bodies, form submissions, file uploads, Excel import rows) is validated against an explicit schema at the boundary before use — never trusted implicitly because "the frontend already validates this."

## React & Component Conventions

- Components are function components using hooks; no class components.
- Server Components by default; a component is only marked a Client Component when it genuinely needs interactivity/browser APIs (directly supporting `NFR-PERF-02` and `11_UI_Architecture.md`'s data-fetching approach).
- Components consume design tokens (`12_Design_System.md`) via the shared `design-system` module — no hardcoded hex colors, font names, or magic pixel spacing values inside a component file.
- Props are explicitly typed (no implicit `any` from an untyped destructure); shared prop shapes (e.g., `TitleBlockProps`) are defined once and reused.

## Formatting & Linting

- A single, repository-wide Prettier configuration is the sole source of formatting truth — no per-developer formatting preference, enforced via a pre-commit or CI check rather than manual review.
- ESLint enforces both general TypeScript/React best practices and the project-specific import-boundary rule from `07_Repository_Structure.md`.
- Lint and format checks run in CI (`15_Deployment_Strategy.md`) and block merge on failure.

## Testing Expectations

- New business logic (Domain/Application layer) ships with corresponding unit tests in the same pull request — not as a follow-up task.
- Authorization-boundary behavior (private/public separation, batch scoping) is treated as the highest-priority code to test, per `21_Testing_Strategy.md`.

## Dependencies

- New third-party dependencies are added deliberately, with a stated reason (what problem it solves that isn't reasonably solved with the existing stack) — not accumulated casually, keeping the dependency surface (and therefore the `npm audit` attack surface from `14_Security_Architecture.md`) intentionally small.

## Assumptions

- These standards assume a single primary developer (Claude Code) for the foreseeable term; they are still written as if for a team, since the annual turnover in the *product owner* role (Secretary) makes clear, self-documenting code valuable even without a large engineering team.

## Future Considerations

- If a second developer joins, consider adding a lightweight pull-request template that explicitly asks "does this change cross a module boundary?" and "does this touch the private/public profile boundary?" to keep the highest-risk areas under deliberate scrutiny.
