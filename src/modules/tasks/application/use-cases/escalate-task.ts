import type { AuthenticatedActor } from "@/modules/auth";
import { NotAuthorizedError } from "@/lib/errors";
import { AUDIT_ACTIONS } from "@/lib/audit-actions";
import type { AuditRecorder } from "@/lib/audit";
import type { NotificationService } from "@/modules/notifications";
import type { TaskRecord } from "../../domain/entities";
import { canEscalateTask } from "../../domain/permissions";
import { TaskNotFoundError } from "../../domain/errors";
import type { TaskRepository } from "../ports/task-repository";
import type { SecretaryRecipientLookup } from "../ports/secretary-recipient-lookup";

export interface EscalateTaskInput {
  actor: AuthenticatedActor;
  taskId: string;
}

export interface EscalateTaskUseCaseDeps {
  taskRepository: TaskRepository;
  secretaryRecipientLookup: SecretaryRecipientLookup;
  notificationService: NotificationService;
  auditRecorder: AuditRecorder;
}

/**
 * Escalation always targets the Technical Secretary — never client-chosen
 * (see domain/permissions.ts's canEscalateTask doc comment for why this is
 * what keeps a Coordinator escalating their own task safe). Every active
 * Secretary is notified; the task's own `escalatedToId` records the first
 * one found, for display purposes only.
 */
export class EscalateTaskUseCase {
  constructor(private readonly deps: EscalateTaskUseCaseDeps) {}

  async execute(input: EscalateTaskInput): Promise<TaskRecord> {
    const existing = await this.deps.taskRepository.findById(input.taskId);
    if (!existing) throw new TaskNotFoundError();
    if (!canEscalateTask(input.actor, existing)) {
      throw new NotAuthorizedError("Not authorized to escalate this task");
    }

    const secretaryUserIds = await this.deps.secretaryRecipientLookup.listActiveSecretaryUserIds();
    const updated = await this.deps.taskRepository.escalate(input.taskId, secretaryUserIds[0] ?? null);

    await this.deps.auditRecorder.record({
      actorUserId: input.actor.userId,
      action: AUDIT_ACTIONS.TASK_ESCALATED,
      targetEntityType: "Task",
      targetEntityId: updated.id,
    });

    await Promise.all(
      secretaryUserIds.map((recipientUserId) =>
        this.deps.notificationService.notify({
          recipientUserId,
          template: "TASK_ESCALATED",
          context: { taskId: updated.id, title: updated.title },
        }),
      ),
    );

    return updated;
  }
}
