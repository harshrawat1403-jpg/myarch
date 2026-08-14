import type { AuthenticatedActor, Role } from "@/modules/auth";
import type { TaskRecord } from "./entities";

/**
 * Technical Secretary: full task administration, unscoped.
 * Coordinator: only tasks they are authorized to manage — interpreted here
 * as tasks where they are the current owner or the original creator (their
 * own work, or work they delegated). A Coordinator has no visibility into
 * an arbitrary task between two other people.
 * Student: only their own tasks (owner) — never creator (Students cannot
 * create tasks at all, see canCreateTask below), never management actions
 * beyond the limited status transitions canUpdateOwnTaskStatus allows.
 */
export function canViewTask(actor: AuthenticatedActor, task: Pick<TaskRecord, "ownerId" | "creatorId">): boolean {
  if (actor.role === "SECRETARY") return true;
  if (actor.role === "COORDINATOR") return actor.userId === task.ownerId || actor.userId === task.creatorId;
  if (actor.role === "STUDENT") return actor.userId === task.ownerId;
  return false;
}

/** Secretary and Coordinator only — a Student receives tasks, never originates them (roadmap: "Student: only their own tasks/actions where applicable"). */
export function canCreateTask(actor: AuthenticatedActor): boolean {
  return actor.role === "SECRETARY" || actor.role === "COORDINATOR";
}

/**
 * Full management (update fields, reassign, change status, cancel,
 * escalate, comment) — Secretary unscoped; Coordinator only for tasks they
 * own or created. A Student is deliberately excluded even for their own
 * task — their only permitted action is the narrower
 * canUpdateOwnTaskStatus below, not full management (e.g. a Student must
 * never be able to reassign a task away from themselves or edit its
 * deadline).
 */
export function canManageTask(actor: AuthenticatedActor, task: Pick<TaskRecord, "ownerId" | "creatorId">): boolean {
  if (actor.role === "SECRETARY") return true;
  if (actor.role === "COORDINATOR") return actor.userId === task.ownerId || actor.userId === task.creatorId;
  return false;
}

/**
 * A Student may move their own task forward (TODO → IN_PROGRESS → BLOCKED →
 * DONE) without full management rights — "Student: only their own
 * tasks/actions where applicable." Reassignment, cancellation, and
 * escalation stay Secretary/Coordinator-only via canManageTask.
 */
export function canUpdateOwnTaskStatus(actor: AuthenticatedActor, task: Pick<TaskRecord, "ownerId">): boolean {
  return actor.role === "STUDENT" && actor.userId === task.ownerId;
}

/**
 * "Coordinator... cannot escalate privileges." A Coordinator may assign or
 * reassign a task only to a Student or to themselves — never to a Secretary
 * (which would let a Coordinator direct/command the department's Super
 * Admin authority) or to another Coordinator (peer-tasking without
 * Secretary authorization, and a route to indirectly reach the max-2-
 * active-Coordinators-protected tier). A Secretary may assign to anyone.
 *
 * Takes the target's userId, not just their role — "or to themselves" is an
 * identity check, not a role check. Comparing `actor.role === targetRole`
 * would be trivially true for ANY two Coordinators (both hold role
 * "COORDINATOR"), silently permitting exactly the peer-tasking this
 * function exists to forbid.
 */
export function canAssignTaskTo(actor: AuthenticatedActor, targetUserId: string, targetRole: Role): boolean {
  if (actor.role === "SECRETARY") return true;
  if (actor.role === "COORDINATOR") return targetRole === "STUDENT" || targetUserId === actor.userId;
  return false;
}

/**
 * Escalation always targets an active Secretary, resolved server-side
 * (never client-chosen — see EscalateTaskUseCase), so a Coordinator
 * escalating their own managed task is safe: it can only ever notify the
 * Secretary upward, never redirect authority sideways or downward.
 */
export function canEscalateTask(actor: AuthenticatedActor, task: Pick<TaskRecord, "ownerId" | "creatorId">): boolean {
  return canManageTask(actor, task);
}
