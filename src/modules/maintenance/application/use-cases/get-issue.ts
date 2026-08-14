import type { AuthenticatedActor } from "@/modules/auth";
import { NotAuthorizedError } from "@/lib/errors";
import type { TaskCommentRecord, TaskRecord } from "@/modules/tasks";
import type { MaintenanceAttachmentRecord, MaintenanceIssueRecord } from "../../domain/entities";
import { canViewMaintenanceIssue } from "../../domain/permissions";
import { MaintenanceIssueNotFoundError } from "../../domain/errors";
import type { MaintenanceIssueRepository } from "../ports/maintenance-issue-repository";
import type { MaintenanceAttachmentRepository } from "../ports/maintenance-attachment-repository";
import { getLinkedTask } from "../task-engine-bridge";

export interface GetMaintenanceIssueInput {
  actor: AuthenticatedActor;
  issueId: string;
}

export interface GetMaintenanceIssueResult {
  issue: MaintenanceIssueRecord;
  attachments: readonly MaintenanceAttachmentRecord[];
  /** Null until ASSIGNED — see this module's own doc comment in domain/entities.ts. */
  task: TaskRecord | null;
  /** §3.4 — "updates" and "expected resolution" (task.deadline) come from here. */
  updates: readonly TaskCommentRecord[];
}

/** §3.4 — everything a complainant (or staff) needs to track an issue: complaint id, status, assignee, timeline (via the separate history endpoint — see infrastructure), updates, expected resolution, resolution details. */
export class GetMaintenanceIssueUseCase {
  constructor(
    private readonly deps: {
      maintenanceIssueRepository: MaintenanceIssueRepository;
      maintenanceAttachmentRepository: MaintenanceAttachmentRepository;
    },
  ) {}

  async execute(input: GetMaintenanceIssueInput): Promise<GetMaintenanceIssueResult> {
    const issue = await this.deps.maintenanceIssueRepository.findById(input.issueId);
    if (!issue) throw new MaintenanceIssueNotFoundError();
    if (!canViewMaintenanceIssue(input.actor, issue)) {
      throw new NotAuthorizedError("Not authorized to view this issue");
    }

    const attachments = await this.deps.maintenanceAttachmentRepository.listForIssue(input.issueId);

    if (!issue.taskId) {
      return { issue, attachments, task: null, updates: [] };
    }
    const { task, comments } = await getLinkedTask(input.actor, issue.taskId);
    return { issue, attachments, task, updates: comments };
  }
}
