import type { AuthenticatedActor } from "@/modules/auth";
import { NotAuthorizedError } from "@/lib/errors";
import type { TaskCommentRecord } from "@/modules/tasks";
import { canViewRequest } from "../../domain/permissions";
import { RequestNotFoundError } from "../../domain/errors";
import type { RequestRepository } from "../ports/request-repository";
import { addLinkedTaskComment } from "../task-engine-bridge";

export interface AddRequestUpdateInput {
  actor: AuthenticatedActor;
  requestId: string;
  body: string;
}

/** §3.7 — "comments." An update on a Request IS a comment on its linked Task — no separate comment table (mirrors AddMaintenanceIssueUpdateUseCase exactly). */
export class AddRequestUpdateUseCase {
  constructor(private readonly deps: { requestRepository: RequestRepository }) {}

  async execute(input: AddRequestUpdateInput): Promise<TaskCommentRecord> {
    const request = await this.deps.requestRepository.findById(input.requestId);
    if (!request) throw new RequestNotFoundError();
    if (!canViewRequest(input.actor, request)) {
      throw new NotAuthorizedError("Not authorized to comment on this request");
    }
    if (!request.taskId) {
      throw new NotAuthorizedError("This request has not been assigned yet");
    }

    return addLinkedTaskComment(input.actor, request.taskId, input.body);
  }
}
