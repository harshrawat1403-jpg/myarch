import type { BadgeVariant } from "@/components/ui/badge";

/**
 * Edit Mode — MYARCH UI/UX unification pass. Every status/priority enum
 * that gets a `<Badge>` anywhere in the app is mapped here exactly once,
 * replacing the 7+ near-identical `Record<Status, BadgeVariant>` literals
 * that were previously hand-retyped per module (meetings/events/
 * maintenance/requests/tasks/announcements/committees list & detail pages).
 * A page imports the one map it needs; nothing here changes badge
 * rendering itself (still plain `<Badge variant={...}>`), only where the
 * variant comes from.
 *
 * Convention, held consistent across every domain below:
 *   neutral  = initial/unstarted
 *   pending  = awaiting action / blocked
 *   active   = currently in progress
 *   approved = successfully completed/resolved
 *   rejected = cancelled / urgent (attention-demanding)
 *   archived = closed/terminal, no further action expected
 */

export const MEETING_STATUS_BADGE: Record<"SCHEDULED" | "COMPLETED" | "CANCELLED", BadgeVariant> = {
  SCHEDULED: "active",
  COMPLETED: "approved",
  CANCELLED: "rejected",
};

export const EVENT_STATUS_BADGE: Record<"DRAFT" | "PUBLISHED" | "COMPLETED" | "CANCELLED", BadgeVariant> = {
  DRAFT: "neutral",
  PUBLISHED: "active",
  COMPLETED: "approved",
  CANCELLED: "rejected",
};

export const MAINTENANCE_ISSUE_STATUS_BADGE: Record<
  "SUBMITTED" | "ACKNOWLEDGED" | "ASSIGNED" | "IN_PROGRESS" | "RESOLVED" | "VERIFIED" | "CLOSED" | "REOPENED",
  BadgeVariant
> = {
  SUBMITTED: "neutral",
  ACKNOWLEDGED: "pending",
  ASSIGNED: "pending",
  IN_PROGRESS: "active",
  RESOLVED: "approved",
  VERIFIED: "approved",
  CLOSED: "archived",
  REOPENED: "rejected",
};

export const REQUEST_STATUS_BADGE: Record<
  "SUBMITTED" | "REVIEW" | "ASSIGNED" | "IN_PROGRESS" | "COMPLETED" | "CLOSED",
  BadgeVariant
> = {
  SUBMITTED: "neutral",
  REVIEW: "pending",
  ASSIGNED: "pending",
  IN_PROGRESS: "active",
  COMPLETED: "approved",
  CLOSED: "archived",
};

export const TASK_STATUS_BADGE: Record<"TODO" | "IN_PROGRESS" | "BLOCKED" | "DONE" | "CANCELLED", BadgeVariant> = {
  TODO: "neutral",
  IN_PROGRESS: "active",
  BLOCKED: "pending",
  DONE: "approved",
  CANCELLED: "rejected",
};

export const COMMITTEE_STATUS_BADGE: Record<"ACTIVE" | "ARCHIVED", BadgeVariant> = {
  ACTIVE: "active",
  ARCHIVED: "archived",
};

/**
 * The shared LOW/MEDIUM/HIGH/URGENT scale (Task Engine's own vocabulary,
 * reused by Maintenance/Requests/Tasks/Announcements per each module's own
 * "reuse Task Engine's priority scale" convention). Previously only
 * Announcements rendered this as a badge — Maintenance/Requests/Tasks list
 * pages rendered it as plain text ("Priority: HIGH"), so the same concept
 * had a color in one module and none in three others. This is the single
 * map every one of those four modules should use from now on.
 */
export const PRIORITY_BADGE: Record<"LOW" | "MEDIUM" | "HIGH" | "URGENT", BadgeVariant> = {
  LOW: "neutral",
  MEDIUM: "active",
  HIGH: "pending",
  URGENT: "rejected",
};
