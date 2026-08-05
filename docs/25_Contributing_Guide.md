# 25 — Contributing Guide

## Purpose

Gives anyone joining the project — a new developer, or a future Secretary/Coordinator wanting to understand the system they now own — a concrete path to get oriented and make a safe first change. This is the document that most directly mitigates the turnover risk identified in `01_Product_Vision.md` and `17_Risk_Assessment.md` (R4).

## Scope

Covers onboarding, local setup expectations, how to propose a change, and where to look for context before making one. Does not duplicate `20_Coding_Standards.md`, `24_Git_Workflow.md`, or `21_Testing_Strategy.md` — it points to them at the right moment instead.

## Before You Touch Any Code

Read, in this order:

1. `01_Product_Vision.md` — why this exists and what it must never compromise (the private/public data boundary, above all).
2. `09_User_Roles_and_Permissions.md` — the permissions matrix every authorization decision must match exactly.
3. `08_Database_Design.md` — the data model, especially the structural (not flag-based) separation between private and public student data.
4. `05_System_Architecture.md` and `07_Repository_Structure.md` — how the codebase is organized and why, so a new change lands in the right module and layer.

A change that doesn't fit cleanly into an existing module or layer is a signal to re-read `05_System_Architecture.md` before forcing it in — not a signal to bypass the structure "just this once."

## Local Setup Expectations

- Node.js LTS, a local PostgreSQL instance (or a containerized one), and the repository's `.env.example` copied to `.env.local` with local-only values — never production credentials (`14_Security_Architecture.md`, `NFR-OPS-03`).
- Seed data (`prisma/seed.ts`, `07_Repository_Structure.md`) provides synthetic students/batches/drives sufficient to exercise every role's view without touching real student data — local development never uses production data exports.

## Making a Change

1. Identify which feature module (`07_Repository_Structure.md`) the change belongs to, and which layer (Domain, Application, Infrastructure, Presentation — `05_System_Architecture.md`) it touches.
2. If the change affects the data model, check `08_Database_Design.md` first — a schema change is not "just a migration," it's a change to the platform's core contract and should be reflected back into that document.
3. If the change affects who can do what, check `09_User_Roles_and_Permissions.md` first — the permissions matrix is the specification; code should be brought into line with it, not the other way around.
4. Write the code per `20_Coding_Standards.md`.
5. Write tests per `21_Testing_Strategy.md`, in priority order — if the change touches an authorization boundary, that test is not optional.
6. Open a pull request per `24_Git_Workflow.md`, referencing the requirement or document the change implements.

## When a Change Isn't Covered by This Documentation

- If the brief or these documents are silent on a specific point, make the smallest reasonable decision consistent with the principles in `01_Product_Vision.md` (portfolio-first, private/public separation, department-owned, security-first), and record it in `19_Decision_Log.md` — don't leave the reasoning only in your head or in a PR description that will eventually be buried in history.
- If a decision genuinely needs the Secretary's input (a scope, policy, or cost decision — not a technical implementation detail), add it to `18_Open_Questions.md` rather than guessing and shipping it silently.

## What Not to Do

- Do not weaken authorization checks "temporarily" to unblock testing — use seed data with the right role/scope instead (`21_Testing_Strategy.md`).
- Do not add a visibility flag as a shortcut around the structural private/public table separation (`08_Database_Design.md`) — this is the one architectural decision in this project that should never be worked around, only built with.
- Do not introduce a new third-party dependency, hosting service, or third-party account without checking `06_Technology_Stack.md` and `15_Deployment_Strategy.md` first — and logging the addition in `19_Decision_Log.md`.
- Do not commit real student data, secrets, or `.env` files, ever (`14_Security_Architecture.md`, `24_Git_Workflow.md`).

## For a Future Secretary (Non-Developer Handover)

If you are a new Secretary or Coordinator inheriting this system without a development background:

- `01_Product_Vision.md` and `02_Project_Objectives.md` explain what the system is for and what's been built vs. deferred.
- `16_Project_Roadmap.md` shows what phase the platform is in and what's planned next.
- `18_Open_Questions.md` lists decisions that may be waiting on you specifically.
- You do not need to read the architecture/database/API documents to operate the platform day-to-day — those are for whoever maintains the code. Your operational entry point is the Admin Dashboard itself (`03_Functional_Requirements.md`, FR-ADMIN section).

## Assumptions

- This guide assumes the next contributor (developer or Secretary) starts with no prior context beyond what's written here and in the rest of `docs/` — consistent with the annual turnover reality this entire documentation set is built to survive.

## Future Considerations

- If the contributor base grows beyond a single developer, this guide should gain a section on code review expectations and pull request turnaround norms, coordinated with the change noted in `24_Git_Workflow.md` Future Considerations.
