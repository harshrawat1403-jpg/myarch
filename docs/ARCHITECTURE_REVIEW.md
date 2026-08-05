# Architecture Review

**Date:** 2026-08-06
**Scope:** Full codebase as of the Background Job Processing System milestone (8 modules, 32 use cases, 33 route handlers, 63 test files, 514 tests).
**Conducted as part of:** Production Readiness Sprint, Phase A.

## Current status

The codebase implements a Modular Monolith with strict per-module Clean Architecture layering (`domain/application/infrastructure/presentation`), enforced mechanically by an ESLint `no-restricted-imports` rule that blocks any import reaching into `@/modules/*/domain|application|infrastructure|presentation` from outside that module — only a module's `index.ts` (or `client.ts` for client-safe exports) may be imported by anyone else. This rule was verified to have zero violations across the entire `src/` tree.

### Module dependency graph

```
auth (no deps)
  ← batches
      ← students
          ← profiles ← notifications ← jobs
              ← recruiters
              ← exports (also ← batches)
```

Traced by grepping every `@/modules/*` import per module. The graph is a **strict DAG — no circular dependencies** were found. Every edge points from a more feature-specific module toward a more foundational one (auth is the only module every other module may depend on; jobs is a pure leaf with zero module dependencies, by design, so it stays reusable by anything).

### Clean Architecture compliance

- Domain layers are framework-free in every module (no Prisma types, no Next.js types, no `jsonwebtoken`/`bcryptjs` imports found in any `domain/` directory).
- Application layers depend only on ports (interfaces) and domain types; every concrete infrastructure class is wired at a single per-module `infrastructure/container.ts` composition root.
- Composition roots consistently use the "construct eagerly if no secret is involved, construct lazily (cached getter) if it depends on `getEnv()`" split established in Days 2–3 and now followed by every module (auth, notifications, jobs all documented and verified consistent).
- Presentation-layer route handlers never contain business logic — every one delegates to exactly one use case and maps its typed domain errors to HTTP responses.

### Duplicate logic

One real instance was found and fixed: `src/modules/auth/presentation/http-errors.ts` was a near-complete duplicate of `src/lib/http-errors.ts`, predating it (from Days 2–3, before the shared version existed in Days 3–4). It had one function (`tooManyRequests`) the shared version lacked, which is why it hadn't been deleted. **Fixed**: `tooManyRequests` was added to the shared `src/lib/http-errors.ts`, all three consumers (`with-auth.ts`, `login.ts`, `refresh.ts`) were repointed at it, and the duplicate file was deleted.

Other apparent duplication (e.g., each module re-implementing its own "Secretary unrestricted / Coordinator scoped to batch" check inline rather than sharing one helper across modules) is **intentional**, not accidental: it was a deliberate decision documented as early as the Days 10 CHANGELOG entry, to keep modules decoupled rather than introduce a shared cross-module authorization-scoping utility. This is noted in `TECHNICAL_DEBT.md` as an accepted tradeoff, not fixed here.

### Dead code / TODOs / temporary implementations

- No `TODO`/`FIXME`/`HACK`/`XXX` markers exist anywhere in `src/` (verified with a word-boundary search — an earlier pass without word boundaries produced false positives from function names like `toDomain`).
- No `@ts-ignore`/`@ts-expect-error` suppressions and no `any`/`as any` usages exist anywhere in `src/`.
- `console.log`/`console.error` usage is limited to five files, all intentional: the three logging/metrics infrastructure classes in the `jobs` module (`ConsoleJobLogger`, `ConsoleJobMetricsRecorder`, whose entire purpose is to log), `ConsoleEmailProvider` (the Version 1.0 dev-logger email provider), and `DefaultNotificationService`/`PrismaNotificationRepository`'s NFR-AVAIL-03 failure logging. None are stray debug statements.

### Error-handling consistency

Every route handler follows the same pattern: parse/validate input with Zod, call exactly one use case inside a `try/catch`, map each of that use case's documented thrown error types to the matching HTTP status via the shared `@/lib/http-errors` helpers, and re-throw anything unrecognized (which Next.js converts to a generic 500 with no stack trace exposed in production).

Two files deviated from this pattern and were fixed:

- `batches/presentation/route-handlers/create.ts` had no `try/catch` at all, even though its use case (`CreateBatchUseCase`) can throw `NotAuthorizedError` as a defense-in-depth check. Currently unreachable in practice (the route is already gated to `SECRETARY`, and `canManageBatches` only checks that role), but every sibling batch route handler defends against this anyway, and an unhandled throw would surface as a raw 500 rather than a clean 403 if the use case is ever reused from a less-restrictive route. **Fixed** — the standard catch block was added.
- `batches/presentation/route-handlers/list.ts` has no `try/catch`, but this is correct: `ListBatchesUseCase` has no error path (verified by reading it) — nothing to catch.

### Naming consistency

Per-module mapper functions (`toDomain`, `toDTO`, `toRow`) are named differently depending on what they produce (a domain entity, an external-facing DTO, or a CSV export row) — this is intentional and documented at each definition site, not an inconsistency.

## Issues found (summary)

| # | Issue | Severity | Status |
|---|---|---|---|
| A1 | Duplicate `http-errors.ts` in auth module | Low | Fixed |
| A2 | Missing `try/catch` in batch create route (defense-in-depth gap) | Low | Fixed |

## Recommendations / future improvements

- If a third module ever needs the same "Secretary unrestricted / Coordinator scoped" check beyond students/profiles/exports/batches, promote it to a shared `src/lib/` helper at that point (the same trigger that moved `AuditRecorder` to `src/lib/audit.ts` in Days 5–6) — not before, per this project's established "duplicate twice, extract on the third occurrence" pattern.
- Consider a lightweight architecture-fitness test (e.g., a script asserting the module dependency graph never gains a cycle) to catch a future regression automatically in CI, rather than relying on manual review like this one.
