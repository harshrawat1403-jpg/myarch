/**
 * Framework-free Domain layer types for the Generic Request System (MYARCH
 * Phase 2, §3.7) — built ON TOP OF the Task/Follow-up Engine (§3.8), the
 * same way Maintenance (§3.1–§3.6) is: once a Request is assigned, a single
 * linked Task carries its deadline/reminder/overdue/escalation/comments. See
 * application/task-engine-bridge.ts.
 */

/** §3.7 — SUBMITTED → REVIEW → ASSIGNED → IN_PROGRESS → COMPLETED → CLOSED. */
export type RequestStatus = "SUBMITTED" | "REVIEW" | "ASSIGNED" | "IN_PROGRESS" | "COMPLETED" | "CLOSED";

export type RequestPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

export type RequestDecision = "APPROVED" | "REJECTED";

export interface RequestRecord {
  readonly id: string;
  /** Free-form, owned by the caller — mirrors Job.type's own "not an enum, new types added by callers, never a schema change" convention. */
  readonly type: string;
  readonly description: string;
  readonly priority: RequestPriority;
  readonly status: RequestStatus;

  readonly requesterId: string;
  readonly ownerId: string | null;

  readonly deadline: Date | null;
  /** Plain pointer to the linked Task, set once ASSIGNED — mirrors MaintenanceIssue.taskId's identical FK-less convention. */
  readonly taskId: string | null;

  readonly decision: RequestDecision | null;
  readonly decisionReason: string | null;
  readonly decidedAt: Date | null;

  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface RequestAttachmentRecord {
  readonly id: string;
  readonly requestId: string;
  readonly fileId: string;
  readonly mimeType: string;
  readonly sizeBytes: number;
  readonly createdAt: Date;
}

export interface RequestFilters {
  readonly status?: RequestStatus;
  readonly type?: string;
  readonly priority?: RequestPriority;
  readonly requesterId?: string;
  readonly ownerId?: string;
  readonly overdueOnly?: boolean;
  readonly search?: string;
}

export type RequestSortField = "createdAt" | "deadline" | "priority" | "updatedAt";

export interface RequestSort {
  readonly field: RequestSortField;
  readonly direction: "asc" | "desc";
}

export interface PaginationInput {
  readonly page: number;
  readonly pageSize: number;
}

export interface PaginatedResult<T> {
  readonly items: readonly T[];
  readonly total: number;
  readonly page: number;
  readonly pageSize: number;
}

export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

export const REQUEST_TYPE_MAX_LENGTH = 100;
export const REQUEST_DESCRIPTION_MAX_LENGTH = 5000;
export const REQUEST_DECISION_REASON_MAX_LENGTH = 2000;

const OPEN_STATUSES: readonly RequestStatus[] = ["SUBMITTED", "REVIEW", "ASSIGNED", "IN_PROGRESS"];

export function isRequestOverdue(request: Pick<RequestRecord, "deadline" | "status">, now: Date = new Date()): boolean {
  if (!request.deadline) return false;
  if (!OPEN_STATUSES.includes(request.status)) return false;
  return request.deadline.getTime() < now.getTime();
}
