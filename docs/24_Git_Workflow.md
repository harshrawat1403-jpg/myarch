# 24 — Git Workflow

## Purpose

Defines how version control is used day-to-day: branching, commit conventions, and release tagging — kept deliberately simple, matching the single-primary-developer reality described in `01_Product_Vision.md` and `20_Coding_Standards.md`, while still leaving a clean, auditable history for a future maintainer.

## Scope

Applies to the MYARCH repository for all phases. Complements `15_Deployment_Strategy.md`'s CI/CD pipeline, which is triggered directly by the branch/merge events described here.

## Branching Model

A simplified trunk-based model, chosen over a heavier model (e.g., Gitflow with long-lived `develop`/`release` branches) because a single primary developer and a small, infrequent release cadence do not benefit from that overhead:

- **`main`** — always deployable; every commit on `main` has passed CI (`15_Deployment_Strategy.md`) and represents what is (or is about to be) in Staging.
- **Feature branches** — created off `main` for each discrete piece of work (e.g., `feature/profile-approval-workflow`, `fix/cgpa-validation-bounds`), named descriptively enough that the branch list itself is legible without opening each one.
- **No long-lived `develop` branch** — feature branches merge directly to `main` once complete and passing CI, keeping divergence windows short and reducing merge-conflict risk.

## Commit Conventions

- Commit messages are written in the imperative mood, describing *why* a change was made where that isn't obvious from the diff alone, following the same "explain the why, not the what" principle as code comments (`20_Coding_Standards.md`).
- Commits are scoped to one logical change — a bug fix and an unrelated refactor are separate commits, even if made in the same session, so `git blame`/`git log` remain useful for a future maintainer trying to understand why a specific line exists.
- No secrets, credentials, or real student data are ever committed — enforced both by discipline and by `.gitignore`/pre-commit checks on `.env` files (`14_Security_Architecture.md`).

## Pull Requests

Even with a single primary developer, pull requests (rather than direct commits to `main`) are used as the mechanism that triggers CI (`15_Deployment_Strategy.md`) before anything reaches `main` — this is a quality gate, not a social review process, given the team size, but it is not skipped:

- Every PR description states what changed and why, and links to the relevant documentation (e.g., "implements FR-PROF-03, see `03_Functional_Requirements.md`") so the connection between a code change and a documented requirement is explicit and traceable.
- CI (lint, type-check, tests, dependency audit) must pass before merge — no bypassing checks to merge faster (`14_Security_Architecture.md`'s dependency-audit gate applies here specifically).
- Merges use a clean merge or squash strategy (not a rebase that rewrites already-pushed history), keeping `main`'s history straightforward to read chronologically.

## Tagging & Releases

- Each production deployment (`15_Deployment_Strategy.md`) corresponds to a git tag on `main` (e.g., `v1.0.0-mvp`, following semantic-ish versioning: major for breaking data-model changes, minor for new features, patch for fixes).
- The MVP go-live (Day 14, `16_Project_Roadmap.md`) is tagged explicitly (e.g., `v1.0.0-mvp`) so "what shipped for MVP" is always answerable by checking out that tag, independent of how much further work has happened on `main` since.

## Handling the Day 1 Freeze

- The project brief's Day 1 "freeze data model and roles, no scope changes afterward" (`16_Project_Roadmap.md`) is reflected in git practice: the Prisma schema and role definitions merged by end of Day 1 are treated as the locked baseline for the MVP sprint. Any change to them during Days 2–14 requires an explicit note in the PR description flagging it as a freeze exception, so such changes are visible in history rather than blending in as routine work.

## Handling Migrations

- Prisma migration files are committed alongside the code that depends on them, in the same PR — never as a separate, out-of-band step — so `main` at any commit represents a consistent, matched pair of schema and application code.

## Assumptions

- A single primary developer (Claude Code) is the expected contributor for the foreseeable term; this workflow is intentionally lighter than what a larger team would need, while still providing the CI gate and clear history a future maintainer benefits from.
- GitHub is assumed as the hosting platform for version control (matching `06_Technology_Stack.md`'s CI/CD choice of GitHub Actions), with a private repository given the sensitivity of the codebase (even though sensitive *data* itself is never committed).

## Future Considerations

- If a second developer joins, introduce a lightweight required-review step on pull requests (one approval before merge) — not needed today, but the branch/PR structure already in place makes adding it later a configuration change, not a workflow redesign.
- If release cadence increases significantly (e.g., continuous smaller deploys rather than milestone-based ones), revisit whether manual production-deploy approval (`15_Deployment_Strategy.md`) remains the right gate.
