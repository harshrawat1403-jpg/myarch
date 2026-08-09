import { prisma } from "@/lib/prisma";
import { PrismaAuditRecorder } from "@/lib/audit";
import { saveFile, deleteFile } from "@/lib/file-storage";
import { notificationService } from "@/modules/notifications";
import { PrismaPlacementDriveRepository } from "./prisma-placement-drive-repository";
import { PrismaApplicationRepository } from "./prisma-application-repository";
import { PrismaStudentEligibilityLookup } from "./prisma-student-eligibility-lookup";
import { PrismaInternshipOutcomeRepository } from "./prisma-internship-outcome-repository";
import { PrismaCertificateFileRepository } from "./prisma-certificate-file-repository";
import { CreatePlacementDriveUseCase } from "../application/use-cases/create-placement-drive";
import { UpdatePlacementDriveUseCase } from "../application/use-cases/update-placement-drive";
import { PublishPlacementDriveUseCase } from "../application/use-cases/publish-placement-drive";
import { SetPlacementDriveStatusUseCase } from "../application/use-cases/set-placement-drive-status";
import { SearchPlacementDrivesUseCase } from "../application/use-cases/search-placement-drives";
import { GetPlacementDriveUseCase } from "../application/use-cases/get-placement-drive";
import { ListOpenDrivesForStudentUseCase } from "../application/use-cases/list-open-drives-for-student";
import { ApplyToPlacementDriveUseCase } from "../application/use-cases/apply-to-placement-drive";
import { WithdrawApplicationUseCase } from "../application/use-cases/withdraw-application";
import { ListMyApplicationsUseCase } from "../application/use-cases/list-my-applications";
import { GetApplicationUseCase } from "../application/use-cases/get-application";
import { SearchApplicationsForDriveUseCase } from "../application/use-cases/search-applications-for-drive";
import { UpdateApplicationStatusUseCase } from "../application/use-cases/update-application-status";
import { ScheduleInterviewUseCase } from "../application/use-cases/schedule-interview";
import { GetInternshipOutcomeUseCase } from "../application/use-cases/get-internship-outcome";
import { UpdateInternshipOutcomeUseCase } from "../application/use-cases/update-internship-outcome";
import { SubmitStudentFeedbackUseCase } from "../application/use-cases/submit-student-feedback";
import { UploadInternshipCertificateUseCase } from "../application/use-cases/upload-internship-certificate";
import { GetCertificateFileUseCase } from "../application/use-cases/get-certificate-file";

const placementDriveRepository = new PrismaPlacementDriveRepository(prisma);
const applicationRepository = new PrismaApplicationRepository(prisma);
const studentEligibilityLookup = new PrismaStudentEligibilityLookup(prisma);
const internshipOutcomeRepository = new PrismaInternshipOutcomeRepository(prisma);
const certificateFileRepository = new PrismaCertificateFileRepository(prisma);
const auditRecorder = new PrismaAuditRecorder(prisma);

export const createPlacementDriveUseCase = new CreatePlacementDriveUseCase({ placementDriveRepository, auditRecorder });
export const updatePlacementDriveUseCase = new UpdatePlacementDriveUseCase({ placementDriveRepository, auditRecorder });
export const publishPlacementDriveUseCase = new PublishPlacementDriveUseCase({
  placementDriveRepository,
  auditRecorder,
  studentEligibilityLookup,
  notificationService,
});
export const setPlacementDriveStatusUseCase = new SetPlacementDriveStatusUseCase({ placementDriveRepository, auditRecorder });
export const searchPlacementDrivesUseCase = new SearchPlacementDrivesUseCase({ placementDriveRepository });
export const getPlacementDriveUseCase = new GetPlacementDriveUseCase({ placementDriveRepository });
export const listOpenDrivesForStudentUseCase = new ListOpenDrivesForStudentUseCase({
  placementDriveRepository,
  applicationRepository,
  studentEligibilityLookup,
});
export const applyToPlacementDriveUseCase = new ApplyToPlacementDriveUseCase({
  placementDriveRepository,
  applicationRepository,
  studentEligibilityLookup,
});
export const withdrawApplicationUseCase = new WithdrawApplicationUseCase({ applicationRepository, placementDriveRepository });
export const listMyApplicationsUseCase = new ListMyApplicationsUseCase({ applicationRepository, placementDriveRepository });
export const getApplicationUseCase = new GetApplicationUseCase({ applicationRepository, studentEligibilityLookup });
export const searchApplicationsForDriveUseCase = new SearchApplicationsForDriveUseCase({
  applicationRepository,
  placementDriveRepository,
  studentEligibilityLookup,
});
export const updateApplicationStatusUseCase = new UpdateApplicationStatusUseCase({
  applicationRepository,
  placementDriveRepository,
  studentEligibilityLookup,
  internshipOutcomeRepository,
  auditRecorder,
  notificationService,
});
export const scheduleInterviewUseCase = new ScheduleInterviewUseCase({ applicationRepository, studentEligibilityLookup });
export const getInternshipOutcomeUseCase = new GetInternshipOutcomeUseCase({
  applicationRepository,
  internshipOutcomeRepository,
  studentEligibilityLookup,
});
export const updateInternshipOutcomeUseCase = new UpdateInternshipOutcomeUseCase({
  applicationRepository,
  internshipOutcomeRepository,
  studentEligibilityLookup,
});
export const submitStudentFeedbackUseCase = new SubmitStudentFeedbackUseCase({
  applicationRepository,
  internshipOutcomeRepository,
});
export const uploadInternshipCertificateUseCase = new UploadInternshipCertificateUseCase({
  applicationRepository,
  internshipOutcomeRepository,
  certificateFileRepository,
  studentEligibilityLookup,
  saveFile,
  deleteFile,
});
export const getCertificateFileUseCase = new GetCertificateFileUseCase({
  applicationRepository,
  internshipOutcomeRepository,
  certificateFileRepository,
  studentEligibilityLookup,
});

/** Used by withAuth's getRequiredBatchId callback for application routes — resolves the applying student's own batch. */
export async function findApplicationBatchId(applicationId: string): Promise<string | undefined> {
  const application = await applicationRepository.findById(applicationId);
  if (!application) return undefined;
  const student = await studentEligibilityLookup.findByStudentProfileId(application.studentProfileId);
  return student?.batchId;
}
