import type { AuthenticatedActor } from "@/modules/auth";
import { NotAuthorizedError } from "@/lib/errors";
import type { TaskCommentRecord } from "@/modules/tasks";
import { canViewMaintenanceIssue } from "../../domain/permissions";
import { MaintenanceIssueNotFoundError } from "../../domain/errors";
import type { MaintenanceIssueRepository } from "../ports/maintenance-issue-repository";
import { addLinkedTaskComment } from "../task-engine-bridge";

export interface AddMaintenanceIssueUpdateInput {
  actor: AuthenticatedActor;
  issueId: string;
  body: string;
}

/**
 * §3.5 — "add updates." Only possible once the issue has a linked Task
 * (i.e. it's been assigned) — an update before that point has nowhere to
 * attach; a Secretary/Coordinator acknowledging a fresh SUBMITTED issue
 * assigns it first, which is the same action that creates the Task.
 */
export class AddMaintenanceIssueUpdateUseCase {
  constructor(private readonly deps: { maintenanceIssueRepository: MaintenanceIssueRepository }) {}

  async execute(input: AddMaintenanceIssueUpdateInput): Promise<TaskCommentRecord> {
    const issue = await this.deps.maintenanceIssueRepository.findById(input.issueId);
    if (!issue) throw new MaintenanceIssueNotFoundError();
    if (!canViewMaintenanceIssue(input.actor, issue)) {
      throw new NotAuthorizedError("Not authorized to comment on this issue");
    }
    if (!issue.taskId) {
      throw new NotAuthorizedError("This issue has not been assigned yet");
    }

    return addLinkedTaskComment(input.actor, issue.taskId, input.body);
  }
}
