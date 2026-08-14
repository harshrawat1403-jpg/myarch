/**
 * Composition root for the tasks module (MYARCH Phase 2, §3.8). No secrets
 * involved — safe to construct eagerly, mirroring recruiters'/alumni's own
 * container shape.
 */
import { prisma } from "@/lib/prisma";
import { PrismaAuditRecorder } from "@/lib/audit";
import { notificationService } from "@/modules/notifications";
import { jobDispatcher, jobRegistry } from "@/modules/jobs";
import { PrismaTaskRepository } from "./prisma-task-repository";
import { PrismaTaskCommentRepository } from "./prisma-task-comment-repository";
import { PrismaUserRoleLookup } from "./prisma-user-role-lookup";
import { PrismaSecretaryRecipientLookup } from "./prisma-secretary-recipient-lookup";
import { TaskReminderJobHandler } from "./task-reminder-job-handler";
import { TaskOverdueCheckJobHandler } from "./task-overdue-job-handler";
import { TASK_OVERDUE_CHECK_JOB_TYPE, TASK_REMINDER_CHECK_JOB_TYPE } from "../domain/entities";
import { CreateTaskUseCase } from "../application/use-cases/create-task";
import { UpdateTaskUseCase } from "../application/use-cases/update-task";
import { ReassignTaskUseCase } from "../application/use-cases/reassign-task";
import { SetTaskStatusUseCase } from "../application/use-cases/set-task-status";
import { ReopenTaskUseCase } from "../application/use-cases/reopen-task";
import { EscalateTaskUseCase } from "../application/use-cases/escalate-task";
import { AddTaskCommentUseCase } from "../application/use-cases/add-task-comment";
import { GetTaskUseCase } from "../application/use-cases/get-task";
import { SearchTasksUseCase } from "../application/use-cases/search-tasks";

const taskRepository = new PrismaTaskRepository(prisma);
const taskCommentRepository = new PrismaTaskCommentRepository(prisma);
const userRoleLookup = new PrismaUserRoleLookup(prisma);
const secretaryRecipientLookup = new PrismaSecretaryRecipientLookup(prisma);
const auditRecorder = new PrismaAuditRecorder(prisma);

export const createTaskUseCase = new CreateTaskUseCase({
  taskRepository,
  userRoleLookup,
  jobDispatcher,
  notificationService,
  auditRecorder,
});
export const updateTaskUseCase = new UpdateTaskUseCase({ taskRepository, jobDispatcher, auditRecorder });
export const reassignTaskUseCase = new ReassignTaskUseCase({
  taskRepository,
  userRoleLookup,
  notificationService,
  auditRecorder,
});
export const setTaskStatusUseCase = new SetTaskStatusUseCase({ taskRepository, notificationService, auditRecorder });
export const reopenTaskUseCase = new ReopenTaskUseCase({ taskRepository, auditRecorder });
export const escalateTaskUseCase = new EscalateTaskUseCase({
  taskRepository,
  secretaryRecipientLookup,
  notificationService,
  auditRecorder,
});
export const addTaskCommentUseCase = new AddTaskCommentUseCase({ taskRepository, taskCommentRepository, auditRecorder });
export const getTaskUseCase = new GetTaskUseCase({ taskRepository, taskCommentRepository });
export const searchTasksUseCase = new SearchTasksUseCase({ taskRepository });

/**
 * Registers TASK_REMINDER_CHECK/TASK_OVERDUE_CHECK into the shared
 * JobRegistry. Must be called once by whatever process runs a JobWorker
 * (scripts/run-worker.ts) — mirrors notifications' registerJobHandlers()
 * exactly, including idempotency (safe under dev-server hot reload).
 */
export function registerJobHandlers(): void {
  if (!jobRegistry.has(TASK_REMINDER_CHECK_JOB_TYPE)) {
    jobRegistry.register(new TaskReminderJobHandler({ taskRepository, notificationService }));
  }
  if (!jobRegistry.has(TASK_OVERDUE_CHECK_JOB_TYPE)) {
    jobRegistry.register(
      new TaskOverdueCheckJobHandler({ taskRepository, secretaryRecipientLookup, notificationService, auditRecorder }),
    );
  }
}
