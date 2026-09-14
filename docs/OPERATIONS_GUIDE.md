# Operations Guide

**Audience:** whoever keeps MYARCH running day to day in production — starting/stopping services, reading logs, diagnosing problems, and knowing when to escalate.

## Services at a glance

| Service | What breaks if it's down | How to tell it's down |
|---|---|---|
| `web` | Nobody can use the site at all | `/api/health` stops responding |
| `worker` | Approvals/rejections still work; the emails for them stop being sent (or stop being logged, pre-real-provider) | No new `job.completed` log lines; `jobs` table rows pile up in `PENDING` |
| PostgreSQL | Everything — `web` and `worker` both depend on it | `/api/health/ready` returns `503` |

## Health checks

- `GET /api/health` — liveness. If this doesn't return `200` within a few seconds, the `web` process itself needs restarting.
- `GET /api/health/ready` — readiness. Returns `200 {"status":"ok","checks":{"database":"ok"}}` when the database is reachable, `503` otherwise. Point your platform's load-balancer health check and any uptime monitor at this one, not the liveness endpoint — it's the one that actually reflects whether the app can serve real requests. Both were validated against a real database during the deployment phase.

## Reading logs

Both `web` (via its own request logging, platform-dependent) and `worker` emit **structured JSON, one event per line** — this was a deliberate design choice specifically so logs are machine-parseable by whatever aggregator you point at them (CloudWatch, Datadog, a simple `grep`), without needing a log-parsing rule written for this app specifically.

Worker log events to know:

| Event | Meaning |
|---|---|
| `worker.started` / `worker.stopped` / `worker.stopping` | Process lifecycle |
| `job.started` | A job was claimed and handler execution began |
| `job.completed` | Success — includes `executionTimeMs` |
| `job.retrying` | A transient failure — includes `attempt`, `nextRetryAt`, and the error message |
| `job.dead_lettered` | Retries exhausted — the job is now terminally `FAILED`; investigate the error message |
| `job.no_handler` | A job's type has no registered handler — this should never happen in normal operation; if it does, a deploy is missing a handler registration |
| `job.permanent_failure_hook_error` | A handler's own failure-cleanup logic itself threw — logged, never crashes the worker, but still worth investigating |

Example (captured live during this phase's validation, from a real approval-triggers-notification run):

```json
{"level":"info","event":"job.started","jobId":"e0718afc-...","type":"SEND_NOTIFICATION","attempt":1,"workerId":"worker-868c5c69-..."}
{"level":"info","event":"job.completed","jobId":"e0718afc-...","type":"SEND_NOTIFICATION","executionTimeMs":29}
```

## Starting, stopping, restarting

Platform-dependent — the operations that matter are the same everywhere:

- **Restart `web`:** standard rolling restart. Stateless — any number of replicas, any restart order, no coordination needed.
- **Restart `worker`:** safe at any time. `JobWorker.stop()` finishes whatever job is currently executing before the process exits — no job is ever abandoned mid-execution. A job that was mid-claim (rare timing) simply gets picked up by another worker replica, or the same one after restart, since the atomic claim guarantees it was never double-executed.
- **Scale `web` up/down:** freely, independently of `worker`.
- **Scale `worker` up/down:** freely. More worker processes means jobs are claimed and processed faster under load; the atomic claim query prevents any two of them from ever processing the same job.

## Manually running the worker for a single pass

If your platform doesn't support a persistent worker process, use the single-pass mode on a schedule instead:

```bash
npm run worker:once
```

Wire this to run every 1–2 minutes via your platform's cron/scheduled-function feature. Verified in this phase: a single `--once` run claims and fully processes everything currently due.

## Common troubleshooting

| Symptom | Likely cause | What to check |
|---|---|---|
| `/api/health/ready` returns 503 | Database unreachable | `DATABASE_URL` correctness, database instance status, network/firewall rules between `web`/`worker` and the database |
| Login fails for everyone | JWT secret misconfigured, or database unreachable | `/api/health/ready` first; then confirm `JWT_ACCESS_SECRET`/`JWT_REFRESH_SECRET` are set and unchanged since the last deploy (changing them invalidates every existing session) |
| A specific user can't log in | Rate limited (10 attempts / 15 min, per account and per IP), or their account is deactivated | Wait for the rate-limit window to pass; check `users.isActive` for that account |
| Notifications never send, even after `job.completed` | `EMAIL_PROVIDER` is still `console` (the dev logger) | Check the worker's logs for `[notifications:console]` lines — if present, the real provider hasn't been implemented/configured yet (see `DEPLOYMENT_GUIDE.md`) |
| Jobs pile up in `PENDING` | The worker process isn't running, or isn't running with `EMAIL_PROVIDER` configured (it fails to construct a handler at startup) | Check the worker process is actually up; check its startup logs for a `registerJobHandlers`/`createEmailProvider` error |
| A specific job keeps retrying then dead-letters | A genuine downstream failure (e.g. a real email provider rejecting) | Read the `errorMessage` on the `jobs` row (`SELECT type, status, "errorMessage" FROM jobs WHERE status = 'FAILED'`) |
| Deploy fails at migration step | A schema migration conflicts with existing data, or the database user lacks permission | Read the `prisma migrate deploy` error directly — it names the specific migration and SQL statement that failed |

## Inspecting job/notification state directly

Useful read-only queries for diagnosing the two tables above (run via `psql` or your database provider's query console):

```sql
-- Jobs stuck or failed
SELECT id, type, status, attempts, "maxAttempts", "errorMessage", "nextRetryAt"
FROM jobs WHERE status IN ('FAILED', 'RETRYING') ORDER BY "updatedAt" DESC LIMIT 20;

-- Notifications that never got delivered
SELECT id, "recipientUserId", template, status, "createdAt"
FROM notifications WHERE status != 'SENT' ORDER BY "createdAt" DESC LIMIT 20;
```

There is no admin UI for this yet (tracked in `TECHNICAL_DEBT.md`) — direct read-only queries are the supported path today. Never manually `UPDATE` these tables to "fix" a stuck job; if a job is permanently stuck, resolve the underlying cause (the error message) and either wait for its next scheduled retry or manually re-enqueue the equivalent business action from the application itself (e.g. re-approve the draft) rather than editing job rows directly.

## Monitoring recommendations

Nothing beyond structured logs and the two health endpoints was built in this phase (metrics *hooks* exist — `JobMetricsRecorder` — but the only implementation today logs to the console, same as everything else; see `SYSTEM_ARCHITECTURE.md`). For production, at minimum:

- Point an uptime monitor at `/api/health/ready` on an interval (e.g. every 1–5 minutes) and alert on sustained failure.
- Ship `worker` and `web` logs to whatever log aggregator your platform provides, and alert on a sustained absence of `job.completed` events if notification delivery matters operationally.
- Track `SELECT count(*) FROM jobs WHERE status = 'FAILED'` growing over time as a proxy for "something downstream is broken" (email provider outage, etc.).

## Escalation

If `/api/health/ready` is failing and restarting `web`/`worker` doesn't resolve it, the database itself is the next thing to check — see `BACKUP_AND_RECOVERY.md` for restore procedures if data corruption or loss is suspected.
