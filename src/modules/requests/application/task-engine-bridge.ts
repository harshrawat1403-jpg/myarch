import type { AuthenticatedActor } from "@/modules/auth";
import {
  createTaskUseCase,
  setTaskStatusUseCase,
  reassignTaskUseCase,
  updateTaskUseCase,
  getTaskUseCase,
  addTaskCommentUseCase,
  type TaskRecord,
  type TaskStatus,
  type TaskCommentRecord,
} from "@/modules/tasks";

/**
 * Same reasoning as maintenance/application/task-engine-bridge.ts, applied
 * to Requests: this module's own authorization (canManageRequest) is
 * already satisfied by the time any of these run — the linked Task is an
 * internal implementation detail, not a second independently-authorized
 * resource. Elevating to a Secretary-shaped actor (keeping the real user's
 * own id) sidesteps Task Engine's owner/creator-only checks, which have no
 * way to know a Coordinator was independently delegated `requests.manage`.
 */
function asTaskEngineActor(actor: AuthenticatedActor): AuthenticatedActor {
  return { userId: actor.userId, role: "SECRETARY" };
}

export async function createLinkedTask(input: {
  actor: AuthenticatedActor;
  title: string;
  ownerId: string;
  deadline: Date | null;
  relatedEntityId: string;
}): Promise<TaskRecord> {
  return createTaskUseCase.execute({
    actor: asTaskEngineActor(input.actor),
    title: input.title,
    ownerId: input.ownerId,
    deadline: input.deadline,
    relatedEntityType: "Request",
    relatedEntityId: input.relatedEntityId,
  });
}

export async function reassignLinkedTask(actor: AuthenticatedActor, taskId: string, newOwnerId: string): Promise<TaskRecord> {
  return reassignTaskUseCase.execute({ actor: asTaskEngineActor(actor), newOwnerId, taskId });
}

export async function setLinkedTaskStatus(actor: AuthenticatedActor, taskId: string, status: TaskStatus): Promise<TaskRecord> {
  return setTaskStatusUseCase.execute({ actor: asTaskEngineActor(actor), taskId, status });
}

export async function updateLinkedTaskDeadline(actor: AuthenticatedActor, taskId: string, deadline: Date | null): Promise<TaskRecord> {
  return updateTaskUseCase.execute({ actor: asTaskEngineActor(actor), taskId, deadline });
}

export async function getLinkedTask(
  actor: AuthenticatedActor,
  taskId: string,
): Promise<{ task: TaskRecord; comments: readonly TaskCommentRecord[] }> {
  return getTaskUseCase.execute({ actor: asTaskEngineActor(actor), taskId });
}

export async function addLinkedTaskComment(actor: AuthenticatedActor, taskId: string, body: string): Promise<TaskCommentRecord> {
  return addTaskCommentUseCase.execute({ actor: asTaskEngineActor(actor), taskId, body });
}
