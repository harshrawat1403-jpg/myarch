/**
 * The abstraction every background job type implements — the "job handler
 * abstraction" named in the architecture requirement. A handler knows only
 * how to do its own work; it never touches Job.status/attempts/retries —
 * that lifecycle bookkeeping belongs entirely to JobWorker.
 *
 * `handle()`'s parameter is always `Record<string, unknown>` — JobWorker
 * stores and dispatches handlers uniformly and never knows a given type's
 * real payload shape, so a handler cannot narrow this type at the
 * interface level (doing so breaks structural assignability against a
 * shared registry). Each concrete handler casts/validates its own payload
 * shape at the top of handle() instead — see
 * notifications/infrastructure/notification-job-handler.ts.
 */
export interface JobHandler {
  readonly type: string;

  handle(payload: Record<string, unknown>): Promise<void>;

  /**
   * Optional hook called once, after JobWorker has exhausted retries and
   * moved a job to its terminal FAILED (dead-letter) state. Lets a handler
   * react to permanent failure (e.g. notifications marks its own audit-trail
   * Notification row FAILED) without re-implementing retry/backoff itself.
   * A failure inside this hook is logged by JobWorker and never re-thrown.
   */
  onPermanentFailure?(payload: Record<string, unknown>, error: Error): Promise<void>;
}
