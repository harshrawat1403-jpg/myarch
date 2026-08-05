# 21 — Testing Strategy

## Purpose

Defines what is tested, at what level, and in what priority order — with explicit emphasis on the platform's highest-stakes guarantee: that private student data never reaches a recruiter and that Coordinator batch scoping is never bypassed.

## Scope

Covers automated testing (unit, integration, end-to-end) across Phase 1–4. Manual QA scenarios and checklists (a ChatGPT-owned deliverable per the brief's responsibility split) are referenced here but authored separately as non-code planning artifacts.

## Testing Priority Order

Given limited developer time (single-developer delivery, 2-week MVP), tests are prioritized in this order — later categories are not skipped, but earlier categories are never sacrificed for later ones:

1. **Authorization boundary tests** — the two boundaries the brief names explicitly: a Coordinator cannot read another batch's private/confidential data; a Recruiter cannot read any private student data under any code path.
2. **Approval workflow correctness** — a draft never becomes recruiter-visible without an explicit approval action; rejection never silently publishes.
3. **Core CRUD and business rules** — student/batch/drive management, eligibility rules, CGPA/backlog validation bounds.
4. **UI/component behavior** — forms, draft-status indicators, the Title Block and other shared components.
5. **Non-critical-path features** — export formatting, analytics computation correctness.

## Test Levels

### Unit Tests (Vitest)

- Target the Domain and Application layers exclusively — pure business rules (drive eligibility, CGPA bounds, approval state transitions) tested without a database or network involved.
- Every use case (`ApproveProfileDraft`, `RejectProfileDraft`, `SubmitApplication`, etc.) has unit tests covering its success path and its explicit failure modes (e.g., approving an already-approved draft, a Coordinator attempting to approve outside their scope).

### Integration Tests (Vitest + a real test database)

- Exercise a full Application-layer use case against a real (test) PostgreSQL instance via Prisma, verifying that repository implementations actually enforce the scoping/filtering they claim to (e.g., a `StudentRepository.findByBatch` call genuinely excludes out-of-scope batches at the query level, not just in application code that could be bypassed).
- API route handler tests that send a real HTTP request through the authorization middleware (`10_API_Architecture.md`) and assert the correct status code and payload shape, including negative cases (`403` for out-of-scope access, `401` for missing/expired tokens).

### End-to-End Tests (Playwright)

Cover the critical user journeys, run against a fully deployed staging-like environment:

- Student logs in, edits a Public Profile draft, submits it.
- Coordinator (in-scope) logs in, sees the pending draft in the approval queue, approves it; the change is verified visible on the Recruiter-facing directory immediately after.
- Coordinator (out-of-scope, different batch) logs in and cannot see that student at all in their own dashboard.
- Recruiter logs in, searches/filters the directory, opens an approved profile, downloads the resume — and a direct API request for that student's private data (attempted programmatically within the test) is confirmed rejected.
- Secretary creates a Coordinator account, assigns batch scope, and confirms the new Coordinator's dashboard reflects exactly that scope.

## Manual QA & Test Data

- **Day 12 of the MVP schedule** (`16_Project_Roadmap.md`) is dedicated to testing with real student data, specifically because synthetic test fixtures cannot anticipate every real-world data irregularity (a missing field, an unusual character in a name, an inconsistent CGPA format) — this is a deliberate, scheduled step, not an afterthought.
- Manual QA checklists and structured test scenarios are a non-code deliverable (per the brief's responsibility split, owned by the documentation/planning side of the project rather than Claude Code) and should cover exploratory scenarios automated tests are less suited to: does the drafting-sheet UI genuinely feel coherent and non-generic in practice, does the approval queue workflow feel efficient to an actual Coordinator, etc.

## Security-Specific Test Coverage

- Rate limiting is tested directly (repeated failed logins trigger the expected lockout/backoff behavior).
- File upload validation is tested against both valid and deliberately malformed inputs (wrong MIME type, oversized file, a renamed executable disguised with an image extension).
- Token rotation/reuse detection (`14_Security_Architecture.md`) has a dedicated test: presenting an already-rotated refresh token is confirmed to revoke the full token family, not merely reject the single request.

## Coverage Expectations

- No fixed blanket coverage percentage target is imposed (a high percentage on trivial code provides false confidence). Instead, coverage is evaluated qualitatively against the priority order above: authorization boundaries and approval workflow logic are expected to be thoroughly covered before any coverage attention goes to less critical paths.

## CI Integration

- Unit and integration tests run on every pull request (`15_Deployment_Strategy.md`); Playwright end-to-end tests run at minimum before any production deployment, and ideally on a merge-to-main trigger against the Staging environment.

## Assumptions

- A dedicated, separate test database (not a shared dev database) is used for integration tests, reset between runs, so tests are deterministic and never depend on or corrupt real data.
- Manual QA scenario documents are produced as separate planning artifacts (per the brief's ChatGPT-owned responsibility split) and are referenced by, but not duplicated inside, this technical testing strategy.

## Future Considerations

- As Phase 2's application pipeline and Phase 3's brochure generation are built, extend the E2E suite with journeys specific to those features (a full drive lifecycle from announcement to offer; a brochure generation job completing and producing a valid PDF/PPTX).
- If a second developer joins, consider adding mutation testing or stricter coverage gates specifically around the authorization boundary code, given its outsized consequence if broken.
