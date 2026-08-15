/**
 * Composition root for the maintenance module (MYARCH Phase 2, §3.1–§3.6).
 * No secrets involved beyond the shared file-storage root — safe to
 * construct eagerly, mirroring placements'/tasks' own container shape.
 */
import { prisma } from "@/lib/prisma";
import { PrismaAuditRecorder } from "@/lib/audit";
import { saveFile } from "@/lib/file-storage";
import { notificationService, sendDirectEmail } from "@/modules/notifications";
import { PrismaMaintenanceIssueRepository } from "./prisma-maintenance-issue-repository";
import { PrismaMaintenanceAttachmentRepository } from "./prisma-maintenance-attachment-repository";
import { PrismaUserRoleLookup } from "./prisma-user-role-lookup";
import { PrismaSecretaryRecipientLookup } from "./prisma-secretary-recipient-lookup";
import { ReportMaintenanceIssueUseCase } from "../application/use-cases/report-issue";
import { ReportPublicMaintenanceIssueUseCase } from "../application/use-cases/report-public-issue";
import { AcknowledgeMaintenanceIssueUseCase } from "../application/use-cases/acknowledge-issue";
import { AssignMaintenanceIssueUseCase } from "../application/use-cases/assign-issue";
import { ReassignMaintenanceIssueUseCase } from "../application/use-cases/reassign-issue";
import { UpdateMaintenanceIssueUseCase } from "../application/use-cases/update-issue";
import { StartMaintenanceIssueProgressUseCase } from "../application/use-cases/start-progress";
import { ResolveMaintenanceIssueUseCase } from "../application/use-cases/resolve-issue";
import { ConfirmMaintenanceResolutionUseCase } from "../application/use-cases/confirm-resolution";
import { CloseMaintenanceIssueUseCase } from "../application/use-cases/close-issue";
import { ReopenMaintenanceIssueUseCase } from "../application/use-cases/reopen-issue";
import { AddMaintenanceAttachmentUseCase } from "../application/use-cases/add-attachment";
import { AddMaintenanceIssueUpdateUseCase } from "../application/use-cases/add-update";
import { GetMaintenanceIssueUseCase } from "../application/use-cases/get-issue";
import { SearchMaintenanceIssuesUseCase } from "../application/use-cases/search-issues";
import { GetMaintenanceDashboardStatsUseCase } from "../application/use-cases/get-dashboard-stats";

const maintenanceIssueRepository = new PrismaMaintenanceIssueRepository(prisma);
export const maintenanceAttachmentRepository = new PrismaMaintenanceAttachmentRepository(prisma);
const userRoleLookup = new PrismaUserRoleLookup(prisma);
const secretaryRecipientLookup = new PrismaSecretaryRecipientLookup(prisma);
const auditRecorder = new PrismaAuditRecorder(prisma);

export const reportMaintenanceIssueUseCase = new ReportMaintenanceIssueUseCase({
  maintenanceIssueRepository,
  secretaryRecipientLookup,
  notificationService,
  auditRecorder,
});
export const reportPublicMaintenanceIssueUseCase = new ReportPublicMaintenanceIssueUseCase({
  maintenanceIssueRepository,
  secretaryRecipientLookup,
  notificationService,
});
export const acknowledgeMaintenanceIssueUseCase = new AcknowledgeMaintenanceIssueUseCase({
  maintenanceIssueRepository,
  auditRecorder,
});
export const assignMaintenanceIssueUseCase = new AssignMaintenanceIssueUseCase({
  maintenanceIssueRepository,
  userRoleLookup,
  auditRecorder,
});
export const reassignMaintenanceIssueUseCase = new ReassignMaintenanceIssueUseCase({
  maintenanceIssueRepository,
  userRoleLookup,
  auditRecorder,
});
export const updateMaintenanceIssueUseCase = new UpdateMaintenanceIssueUseCase({ maintenanceIssueRepository, auditRecorder });
export const startMaintenanceIssueProgressUseCase = new StartMaintenanceIssueProgressUseCase({
  maintenanceIssueRepository,
  auditRecorder,
});
export const resolveMaintenanceIssueUseCase = new ResolveMaintenanceIssueUseCase({
  maintenanceIssueRepository,
  notificationService,
  auditRecorder,
  sendPublicReporterEmail: sendDirectEmail,
});
export const confirmMaintenanceResolutionUseCase = new ConfirmMaintenanceResolutionUseCase({
  maintenanceIssueRepository,
  auditRecorder,
});
export const closeMaintenanceIssueUseCase = new CloseMaintenanceIssueUseCase({ maintenanceIssueRepository, auditRecorder });
export const reopenMaintenanceIssueUseCase = new ReopenMaintenanceIssueUseCase({ maintenanceIssueRepository, auditRecorder });
export const addMaintenanceAttachmentUseCase = new AddMaintenanceAttachmentUseCase({
  maintenanceIssueRepository,
  maintenanceAttachmentRepository,
  auditRecorder,
  saveFile,
});
export const addMaintenanceIssueUpdateUseCase = new AddMaintenanceIssueUpdateUseCase({ maintenanceIssueRepository });
export const getMaintenanceIssueUseCase = new GetMaintenanceIssueUseCase({
  maintenanceIssueRepository,
  maintenanceAttachmentRepository,
});
export const searchMaintenanceIssuesUseCase = new SearchMaintenanceIssuesUseCase({ maintenanceIssueRepository });
export const getMaintenanceDashboardStatsUseCase = new GetMaintenanceDashboardStatsUseCase({ maintenanceIssueRepository });
