/**
 * A job's type is a free-form string owned by whichever module dispatches
 * and handles it (e.g. notifications defines "SEND_NOTIFICATION" itself —
 * see src/modules/notifications/domain/job-type.ts). This module never
 * enumerates known types; doing so would mean every new background job
 * required a change here, exactly what the extensibility requirement rules
 * out ("adding a new background job requires only: defining a new JobType,
 * implementing a handler, registering it — no worker modifications").
 */
export type JobType = string;

export type JobStatus = "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED" | "RETRYING" | "CANCELLED";

/**
 * The full row shape, mirroring prisma/schema.prisma's Job model. Kept as a
 * plain, framework-free type — infrastructure/prisma-job-repository.ts maps
 * the Prisma row into this shape explicitly.
 */
export interface JobRecord {
  readonly id: string;
  readonly type: JobType;
  readonly payload: Record<string, unknown>;
  readonly status: JobStatus;
  readonly attempts: number;
  readonly maxAttempts: number;
  readonly runAt: Date;
  readonly lastAttemptAt: Date | null;
  readonly nextRetryAt: Date | null;
  readonly completedAt: Date | null;
  readonly errorMessage: string | null;
  readonly executionTimeMs: number | null;
  readonly lockedBy: string | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export const DEFAULT_MAX_ATTEMPTS = 5;
