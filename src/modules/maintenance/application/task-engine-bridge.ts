import type { AuthenticatedActor } from "@/modules/auth";
import {
  createTaskUseCase,
  setTaskStatusUseCase,
  reassignTaskUseCase,
  reopenTaskUseCase,
  updateTaskUseCase,
  getTaskUseCase,
  addTaskCommentUseCase,
  type TaskRecord,
  type TaskStatus,
  type TaskCommentRecord,
} from "@/modules/tasks";

/**
 * Maintenance use cases perform their OWN complete authorization check
 * (canManageMaintenanceIssue / canAssignMaintenanceIssue / ...) BEFORE ever
 * calling into here — by this point the acting user is already known to be
 * legitimately allowed to drive this specific issue. The linked Task is an
 * internal implementation detail of that already-made decision, not a
 * second, independently-authorized resource.
 *
 * Task Engine's own authorization (canManageTask: owner/creator only;
 * canAssignTaskTo: a Coordinator may never target another Coordinator) is
 * designed to protect ARBITRARY, directly user-facing Task creation — it has
 * no way to know a Coordinator was independently granted "maintenance.assign"/
 * "maintenance.manage" by the Secretary, and would incorrectly reject e.g.
 * one authorized Coordinator assigning issue-repair work to a different
 * Coordinator. Elevating to a Secretary-shaped actor (keeping the real
 * user's own id, so Task-level audit entries and notification exclusions —
 * "don't notify yourself" — still resolve correctly) sidesteps that,
 * deliberately, only for this already-authorized internal path.
 */
function asTaskEngineActor(actor: AuthenticatedActor): AuthenticatedActor {
  return { userId: actor.userId, role: "SECRETARY" };
}

export async function createLinkedTask(input: {
  actor: AuthenticatedActor;
  title: string;
  ownerId: string;
  deadline: Date | null;
  relatedEntityType: "MaintenanceIssue" | "Request";
  relatedEntityId: string;
}): Promise<TaskRecord> {
  return createTaskUseCase.execute({
    actor: asTaskEngineActor(input.actor),
    title: input.title,
    ownerId: input.ownerId,
    deadline: input.deadline,
    relatedEntityType: input.relatedEntityType,
    relatedEntityId: input.relatedEntityId,
  });
}

export async function reassignLinkedTask(actor: AuthenticatedActor, taskId: string, newOwnerId: string): Promise<TaskRecord> {
  return reassignTaskUseCase.execute({ actor: asTaskEngineActor(actor), newOwnerId, taskId });
}

export async function setLinkedTaskStatus(actor: AuthenticatedActor, taskId: string, status: TaskStatus): Promise<TaskRecord> {
  return setTaskStatusUseCase.execute({ actor: asTaskEngineActor(actor), taskId, status });
}

export async function reopenLinkedTask(actor: AuthenticatedActor, taskId: string): Promise<TaskRecord> {
  return reopenTaskUseCase.execute({ actor: asTaskEngineActor(actor), taskId });
}

export async function updateLinkedTaskDeadline(actor: AuthenticatedActor, taskId: string, deadline: Date | null): Promise<TaskRecord> {
  return updateTaskUseCase.execute({ actor: asTaskEngineActor(actor), taskId, deadline });
}

/**
 * A read, not a write, but the same elevation reasoning applies: the caller
 * (GetMaintenanceIssueUseCase) has already confirmed via canViewMaintenanceIssue
 * that this actor may see this issue's full detail, including its "updates"
 * (the linked Task's own comments) — Task Engine's own canViewTask (Secretary,
 * task owner, or task creator only) has no way to know that and would
 * otherwise incorrectly reject the complainant who reported the issue.
 */
export async function getLinkedTask(
  actor: AuthenticatedActor,
  taskId: string,
): Promise<{ task: TaskRecord; comments: readonly TaskCommentRecord[] }> {
  return getTaskUseCase.execute({ actor: asTaskEngineActor(actor), taskId });
}

/** §3.5 — "add updates." An update on a MaintenanceIssue/Request IS a comment on its linked Task — no separate comment table. */
export async function addLinkedTaskComment(actor: AuthenticatedActor, taskId: string, body: string): Promise<TaskCommentRecord> {
  return addTaskCommentUseCase.execute({ actor: asTaskEngineActor(actor), taskId, body });
}
