# Technical Debt Register

**Date:** 2026-08-06
**Purpose:** A single, honest inventory of every known gap, deferred decision, and scale-triggered improvement across the whole codebase — consolidated from the Production Readiness Sprint's architecture, security, performance, and accessibility review, plus items already flagged in prior CHANGELOG entries. Nothing here is a surprise; every item was already documented at the point it was deferred, and is repeated here so it lives in one place instead of being scattered across a year of CHANGELOG entries.

Each item states **what**, **why it was deferred**, and **the trigger** for revisiting it.

## Open product decisions (blocking, not technical debt per se)

- **Hosting/deployment platform** — undecided (`docs/planning/18_Open_Questions.md`, Q1). Blocks: HTTPS enforcement configuration, scheduled backup setup, and whether the background worker runs as a long-lived daemon or a scheduler-triggered single pass (both modes are already supported — see `scripts/run-worker.ts` — so this decision doesn't block the code, only its deployment).
- **Production email provider** — undecided (Q2). Only a console/dev-logger `EmailProvider` is implemented; `EMAIL_PROVIDER=resend`/`smtp` are accepted by config validation but throw a clear "not implemented" error. Trigger: Secretary decision on SMTP (college mail server) vs. SendGrid vs. Resend vs. SES.
- **Retention policy for graduated batches** — undecided (NFR-SEC-12, Q-series). No code enforces archival/deletion of graduated-batch data yet. Trigger: before the first batch actually graduates under the live system.

## Architecture

- **Per-module duplication of "Secretary unrestricted / Coordinator scoped-to-batch" authorization logic.** Each of students/profiles/exports/batches independently re-derives this same shape rather than sharing one helper. Deferred deliberately (documented since Days 10) to keep modules decoupled; this project's established pattern is "extract to a shared helper on the third+ occurrence of real duplication," and that threshold hasn't clearly been crossed in a way that would reduce risk rather than just line count. **Trigger:** a fourth module needing the identical check, or a bug caused specifically by these copies drifting apart.

## Security

- **Full MIME content-signature validation is not possible yet.** `AttachConfidentialDocumentUseCase` only ever registers a metadata reference (`storageKey`/`mimeType`/`sizeBytes`) to a file uploaded by a storage mechanism that does not exist in this codebase yet. This sprint added an allow-list check on the *declared* MIME type (partial mitigation), but real validation requires inspecting actual file bytes, which requires the upload endpoint itself to exist first. **Trigger:** building the real file-upload/object-storage integration (`docs/architecture/06_Technology_Stack.md`'s Cloudflare R2 recommendation).
- **`InMemoryRateLimiter` is process-local.** Correct for a single application instance (the current, documented deployment topology); silently stops enforcing a *shared* limit the moment the app is horizontally scaled to multiple instances, since each instance would keep independent counters. **Trigger:** horizontal scaling beyond one instance — move to Redis or an equivalent shared store at that point, not before.
- **No `issuer`/`audience` claims on access tokens.** Adds no protection today (single issuer, single consumer, one monolith); would matter if this JWT is ever verified by a second service. **Trigger:** a second service/consumer of these tokens.

## Performance

- **No pagination on list endpoints** (student search, recruiter directory search), despite `docs/api/10_API_Architecture.md` documenting cursor-based pagination for exactly these endpoints. Deferred because implementing it now would touch use case interfaces, repository signatures, the response envelope, and both admin/recruiter UIs — real scope, not a hardening fix — while providing no benefit at current roster sizes. **Trigger:** total active-student count exceeds roughly 1,000–2,000, or list-endpoint latency becomes noticeable in practice.
- **Dashboard overview fetches the full student roster to compute two counts** rather than calling a dedicated aggregate-count endpoint. **Trigger:** same roster-size trigger as above.
- **No trigram (`pg_trgm`) index for name/roll-number free-text search.** Sequential scan is fast enough at current scale. **Trigger:** search latency becomes noticeable, or roster size grows well beyond a single department.
- **Recruiter directory's JSON-field (certifications/internships) keyword search runs in application memory**, not as a database predicate — a documented, deliberate tradeoff since Days 8–9. **Trigger:** approved/active student population grows into the thousands.

## Accessibility

- **No `aria-describedby` wiring between form inputs and their validation errors.** This sprint added `role="alert"` to the shared `FieldError` component (announces the error the moment it appears — the single highest-value fix for this gap) but did not wire `aria-describedby` at every individual form call site, which would require touching every form across every module. **Trigger:** a dedicated accessibility-hardening pass, or a specific user report.
- **No "skip to main content" link** on the admin/recruiter shell layout. Low priority given the sidebar nav is short (6 items), but a standard, cheap addition. **Trigger:** none urgent; safe to add opportunistically.
- **Focus-visible styling is the browser default on `<Button>`** (not custom-styled to match the dark theme, unlike `<Input>`/`<Textarea>`, which do customize their focus ring). The default outline is WCAG-compliant (visible) but visually inconsistent with the rest of the design system. **Trigger:** a design-system polish pass.

## Notification / background jobs

- **No admin UI for job history, retry queues, or manual job cancellation/re-run.** `JobRepository.cancel()`/`findById()` exist as ports and are unit-tested, but nothing calls them from a route or UI yet. **Trigger:** operational need to inspect/intervene in stuck or failed jobs becomes apparent after real usage.
- **Only one job type is implemented** (`SEND_NOTIFICATION`). CSV/Excel export, PDF generation, analytics aggregation, and data-cleanup job handlers were explicitly out of scope for the Background Job Processing System milestone (infrastructure + one reference integration only). **Trigger:** each is additive whenever actually requested — define a job-type string, implement `JobHandler`, register it, add one import line to `scripts/run-worker.ts`.
- **Job execution within a worker is sequential, not concurrent**, and notification delivery is asynchronous via the job queue (reversing an earlier, now-closed deviation where it was synchronous because no worker existed yet). Both are deliberate, documented, low-risk-at-current-scale choices, not oversights.

## Testing gaps acknowledged (not closed by this sprint)

- The exact two-key (`login:email:...`/`login:ip:...`) rate-limit-*exceeded* scenario (specifically triggering a 429 by exhausting the limit) has still not been exercised against a live server — the Production Deployment & Operational Readiness phase validated live login *success* for all three admin-facing roles, but did not specifically drive either counter to its limit. Mitigated by testing the `InMemoryRateLimiter` primitive's key-isolation guarantee directly (`tests/unit/auth/rate-limiter.test.ts`). **Trigger:** a dedicated live rate-limit drill, or incorporate one into a future staging smoke test.
- `PrismaJobRepository.claimBatch()`'s raw `FOR UPDATE SKIP LOCKED` query — **this item is now closed, not open debt.** It was executed against a real PostgreSQL 16.4 instance during the Production Deployment & Operational Readiness phase (a real job was claimed, processed, and marked `COMPLETED`) and worked correctly. Retained here only as a historical note — see `docs/CHANGELOG.md`'s "Production Deployment & Operational Readiness" entry for the full validation record.
- `npm run worker`/`npm run worker:once` were smoke-tested by running the script directly (confirms module resolution, handler registration, and worker construction all succeed) but could not be run to completion against a live database.

## Summary

Nothing in this register is a defect masquerading as debt — every item is either a genuinely deferred decision with a stated trigger, or a documented tradeoff already made deliberately at the time the relevant module was built. See `PRODUCTION_CHECKLIST.md` for what must happen before this system holds real student data in production.
