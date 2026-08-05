# Performance Review

**Date:** 2026-08-06
**Scope:** Database access patterns, search/export paths, the background job worker, and dashboard loading.
**Conducted as part of:** Production Readiness Sprint, Phase C.
**Guiding principle applied throughout:** avoid premature optimization — every item below is either verified sound at the project's documented expected scale (`docs/04_Non_Functional_Requirements.md`'s "low-hundreds-per-batch" assumption), or flagged as a deferred, scale-triggered recommendation rather than fixed speculatively.

## Current status

### N+1 queries

None found. Every repository method that returns a list or a joined shape was read directly (not just its tests):

- `PrismaStudentRepository.search()` — a single `findMany` with `include` for `privateProfile`/`batch`/`publicProfile`/`draft`, not a loop of per-student queries.
- `PrismaRecruiterDirectoryRepository.search()`/`getDashboardStats()` — single `findMany` calls with `include`; certifications/internships JSON-field filtering happens in memory on the already-fetched, already-narrowed result set (a deliberate, documented tradeoff — see below).
- `PrismaBatchReportExportRepository.fetch()` — a single `findMany` with a nested `students: { select: { isActive: true } }`, aggregated in application code, not one query per batch.
- All other export repositories follow the same single-query-plus-map shape.

### Indexes

`prisma/schema.prisma` has `@@index` on every column list endpoints actually filter by at the database level: `StudentProfile.batchId`, `CoordinatorBatchScope.batchId`, `FileAsset.ownerUserId`, `AuditLog.actorUserId` and `[targetEntityType, targetEntityId]`, `Notification.recipientUserId`, and `Job.[status, runAt]` (the exact compound the job worker's claim query filters and sorts by). Unique constraints exist on `User.email`, `StudentProfile.rollNumber`, `RefreshToken.tokenHash`, and `FileAsset.storageKey`.

**Not indexed, and correctly so at current scale:** `StudentProfile.fullName`/`rollNumber` free-text `contains`/`insensitive` search, and `StudentPrivateProfile.cgpa` range filtering. Both would require a trigram (`pg_trgm`) index to meaningfully speed up at high row counts; at the documented scale (a single department's roster) a sequential scan is fast enough, and adding an index now would be optimizing against a load profile that doesn't exist yet.

### Search and export performance

The recruiter directory's certification/internship keyword search and the general free-text `query` filter are applied **in application memory** after an already-scoped `findMany` (excluding inactive students and non-`ACTIVE` batches at the database level first) — not as a database predicate. This is because certifications/internships are stored as JSON, and cross-provider-reliable case-insensitive partial JSON text search is not something Prisma expresses cleanly. This tradeoff is explicitly documented at the call site and is reasonable at current scale; it would need revisiting (e.g., a materialized search column, or a real search engine) only if the *approved, active* student population grows into the thousands.

CSV export generation (`toCsv()`) builds the entire output string in memory rather than streaming it. At current scale (a few hundred rows, a handful of columns) this is negligible; streaming would be meaningful only at row counts far beyond this project's scope, and was not implemented to avoid solving a problem that doesn't exist.

### List endpoints have no pagination

`docs/api/10_API_Architecture.md` documents cursor-based pagination for list endpoints ("student directory, recruiter search, applications"). **Neither `SearchStudentsUseCase` nor the recruiter directory search implements pagination today** — both return the full unbounded result set for the given filter. This is a genuine gap against the documented API architecture, not merely a performance nitpick, but per this phase's own instruction ("avoid premature optimization; optimize only where justified") it was **not implemented in this sprint**: at current expected scale (low hundreds of students total) an unbounded list is simple, correct, and fast; retrofitting cursor pagination now would touch the use case interfaces, repository signatures, response envelope shape, and both the admin and recruiter UI's rendering — real scope, not a hardening fix, and explicitly out of bounds for "do not redesign working modules." Tracked as a scale-triggered item in `TECHNICAL_DEBT.md`.

### Dashboard loading

The admin dashboard overview (`/dashboard`) already fetches its three data sources (students, batches, approval queue) via `Promise.all`, not a sequential waterfall — verified by reading the component directly, not assumed.

One real inefficiency was found and is **flagged, not fixed** (same "optimize only where justified" reasoning): the overview page fetches the *entire* student roster (via `/api/students?includeInactive=true`) purely to compute two counts (`totalStudents`, `activeStudents`) client-side. At current roster sizes this is a small, one-time payload with no noticeable latency impact; a dedicated `count()`-based stats endpoint would be the right fix once the roster grows large enough for this to matter (see Recommendations).

### Background job worker

`JobWorker` polls in batches (default 5 jobs, default 2s idle interval, both configurable via `JOB_WORKER_POLL_INTERVAL_MS`/`JOB_WORKER_BATCH_SIZE`), executing jobs within a claimed batch **sequentially** rather than concurrently — a deliberate choice (documented in the class itself) to keep graceful shutdown simple and avoid one worker process bursting concurrent calls at a single downstream dependency (e.g. an email provider). Horizontal scaling is running more worker *processes*, not concurrency within one; the atomic `FOR UPDATE SKIP LOCKED` claim is what actually prevents double-execution across any number of workers, so this scales correctly without further changes.

### Memory usage

No unbounded in-memory accumulation was found. The `InMemoryRateLimiter`'s per-key hit arrays are pruned to the current window on every `consume()` call (old timestamps are filtered out, not just appended), so its memory footprint does not grow without bound over the process lifetime — though note it does grow with the number of *distinct keys* seen (e.g. distinct emails/IPs), which is a scale consideration for the same "single process, single instance" reason already documented on that class.

## Issues found

None required a code change in this phase — every finding below "sound at current scale" is a **documented, scale-triggered recommendation**, not a defect.

## Recommendations / future improvements (trigger conditions noted explicitly)

| Recommendation | Trigger for prioritizing it |
|---|---|
| Add cursor-based pagination to student search and recruiter directory search | Total active-student count across active batches exceeds roughly 1,000–2,000, or list-endpoint response times become noticeable in practice |
| Add a dedicated `/api/students/stats`-style aggregate-count endpoint for the dashboard overview | Same roster-size trigger as above; low priority until then |
| Add a `pg_trgm` trigram index for name/roll-number search | Free-text search latency becomes noticeable, or student count grows well beyond a single department's current scale |
| Move `InMemoryRateLimiter` to a shared store (Redis) | The application is horizontally scaled beyond one instance |
| Reconsider in-memory JSON-field text filtering for recruiter search | Approved, active student population grows into the thousands |
