/**
 * Framework-free Domain layer types for Maintenance (MYARCH Phase 2,
 * §3.1–§3.6) — built ON TOP OF the Task/Follow-up Engine (§3.8): SLA
 * deadline tracking, reminders, overdue detection, and escalation are never
 * reimplemented here. Once a MaintenanceIssue is assigned, a single Task row
 * (relatedEntityType "MaintenanceIssue") carries all of that; see
 * infrastructure/container.ts's `driveLinkedTask` helper.
 */

export type MaintenanceCategory =
  | "ELECTRICAL"
  | "PLUMBING"
  | "FURNITURE"
  | "HVAC"
  | "NETWORK"
  | "CLASSROOM_STUDIO"
  | "LAB"
  | "EQUIPMENT"
  | "CLEANING"
  | "SAFETY"
  | "CIVIL_BUILDING"
  | "OTHER";

export const MAINTENANCE_CATEGORIES: readonly MaintenanceCategory[] = [
  "ELECTRICAL",
  "PLUMBING",
  "FURNITURE",
  "HVAC",
  "NETWORK",
  "CLASSROOM_STUDIO",
  "LAB",
  "EQUIPMENT",
  "CLEANING",
  "SAFETY",
  "CIVIL_BUILDING",
  "OTHER",
];

/** §3.3 — SUBMITTED → ACKNOWLEDGED → ASSIGNED → IN_PROGRESS → RESOLVED → VERIFIED → CLOSED, plus REOPENED (a distinct action from any post-resolution state, mirroring Task's own reopen). */
export type MaintenanceIssueStatus =
  | "SUBMITTED"
  | "ACKNOWLEDGED"
  | "ASSIGNED"
  | "IN_PROGRESS"
  | "RESOLVED"
  | "VERIFIED"
  | "CLOSED"
  | "REOPENED";

/** Reuses the same LOW/MEDIUM/HIGH/URGENT scale as Task.priority (schema-level: MaintenanceIssue.priority IS TaskPriority) — redeclared here per this module's own isolation convention. */
export type MaintenancePriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

export interface MaintenanceIssueRecord {
  readonly id: string;
  readonly category: MaintenanceCategory;
  readonly location: string;
  readonly description: string;
  readonly priority: MaintenancePriority;
  readonly status: MaintenanceIssueStatus;

  readonly requesterId: string;
  readonly assigneeId: string | null;

  readonly deadline: Date | null;
  /** Plain pointer to the linked Task, set once ASSIGNED — see this file's own top doc comment. */
  readonly taskId: string | null;

  readonly resolutionDetails: string | null;
  readonly acknowledgedAt: Date | null;
  readonly resolvedAt: Date | null;

  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface MaintenanceAttachmentRecord {
  readonly id: string;
  readonly issueId: string;
  readonly fileId: string;
  readonly mimeType: string;
  readonly sizeBytes: number;
  readonly createdAt: Date;
}

export interface MaintenanceIssueFilters {
  readonly status?: MaintenanceIssueStatus;
  readonly category?: MaintenanceCategory;
  readonly priority?: MaintenancePriority;
  readonly requesterId?: string;
  readonly assigneeId?: string;
  /** deadline < now AND status not in a terminal/resolved state. */
  readonly overdueOnly?: boolean;
  readonly search?: string;
}

export type MaintenanceIssueSortField = "createdAt" | "deadline" | "priority" | "updatedAt";

export interface MaintenanceIssueSort {
  readonly field: MaintenanceIssueSortField;
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

export const MAINTENANCE_LOCATION_MAX_LENGTH = 200;
export const MAINTENANCE_DESCRIPTION_MAX_LENGTH = 5000;
export const MAINTENANCE_RESOLUTION_MAX_LENGTH = 5000;

const TERMINAL_OR_RESOLVED_STATUSES: readonly MaintenanceIssueStatus[] = ["RESOLVED", "VERIFIED", "CLOSED"];

/** Pure — no DB round trip. Mirrors isTaskOverdue's exact reasoning: overdue only while genuinely still open. */
export function isMaintenanceIssueOverdue(
  issue: Pick<MaintenanceIssueRecord, "deadline" | "status">,
  now: Date = new Date(),
): boolean {
  if (!issue.deadline) return false;
  if (TERMINAL_OR_RESOLVED_STATUSES.includes(issue.status)) return false;
  return issue.deadline.getTime() < now.getTime();
}

/** §3.9 dashboard's "critical" bucket. */
export function isCriticalMaintenancePriority(priority: MaintenancePriority): boolean {
  return priority === "URGENT";
}

export function isReopenableMaintenanceIssue(status: MaintenanceIssueStatus): boolean {
  return TERMINAL_OR_RESOLVED_STATUSES.includes(status);
}
