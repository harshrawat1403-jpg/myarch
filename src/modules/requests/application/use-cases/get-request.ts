import type { AuthenticatedActor } from "@/modules/auth";
import { NotAuthorizedError } from "@/lib/errors";
import type { TaskCommentRecord, TaskRecord } from "@/modules/tasks";
import type { RequestAttachmentRecord, RequestRecord } from "../../domain/entities";
import { canViewRequest } from "../../domain/permissions";
import { RequestNotFoundError } from "../../domain/errors";
import type { RequestRepository } from "../ports/request-repository";
import type { RequestAttachmentRepository } from "../ports/request-attachment-repository";
import { getLinkedTask } from "../task-engine-bridge";

export interface GetRequestInput {
  actor: AuthenticatedActor;
  requestId: string;
}

export interface GetRequestResult {
  request: RequestRecord;
  attachments: readonly RequestAttachmentRecord[];
  task: TaskRecord | null;
  updates: readonly TaskCommentRecord[];
}

/** Mirrors GetMaintenanceIssueUseCase exactly. */
export class GetRequestUseCase {
  constructor(
    private readonly deps: { requestRepository: RequestRepository; requestAttachmentRepository: RequestAttachmentRepository },
  ) {}

  async execute(input: GetRequestInput): Promise<GetRequestResult> {
    const request = await this.deps.requestRepository.findById(input.requestId);
    if (!request) throw new RequestNotFoundError();
    if (!canViewRequest(input.actor, request)) {
      throw new NotAuthorizedError("Not authorized to view this request");
    }

    const attachments = await this.deps.requestAttachmentRepository.listForRequest(input.requestId);

    if (!request.taskId) {
      return { request, attachments, task: null, updates: [] };
    }
    const { task, comments } = await getLinkedTask(input.actor, request.taskId);
    return { request, attachments, task, updates: comments };
  }
}
