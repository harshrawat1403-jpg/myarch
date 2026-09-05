import { associateElectionCandidate } from "@/modules/elections";
import { associateCoreCommitteeSelectionCandidate } from "@/modules/selections";
import { prisma } from "@/lib/prisma";
import { PrismaAuditRecorder } from "@/lib/audit";
import { notificationService } from "@/modules/notifications";
import { formRepository } from "@/modules/forms";
import { PrismaFormApplicationRepository } from "./prisma-application-repository";
import { PrismaApplicantLookup } from "./prisma-applicant-lookup";
import { PrismaReviewerLookup, PrismaSecretaryRecipientLookup } from "./prisma-reviewer-lookup";
import { SubmitFormUseCase } from "../application/use-cases/submit-form";
import { ListMyApplicationsUseCase } from "../application/use-cases/list-my-applications";
import { GetMyApplicationUseCase } from "../application/use-cases/get-my-application";
import { SearchApplicationsUseCase } from "../application/use-cases/search-applications";
import { GetApplicationUseCase } from "../application/use-cases/get-application";
import { AssignReviewerUseCase } from "../application/use-cases/assign-reviewer";
import { RecordReviewUseCase } from "../application/use-cases/record-review";
import { DecideApplicationUseCase } from "../application/use-cases/decide-application";

export const applicationRepository = new PrismaFormApplicationRepository(prisma, async (tx, input) => {
  await associateElectionCandidate(tx, input);
  await associateCoreCommitteeSelectionCandidate(tx, input);
});
const applicantLookup = new PrismaApplicantLookup(prisma);
const reviewerLookup = new PrismaReviewerLookup(prisma);
const secretaryRecipientLookup = new PrismaSecretaryRecipientLookup(prisma);
const auditRecorder = new PrismaAuditRecorder(prisma);

export const submitFormUseCase = new SubmitFormUseCase({ formRepository, applicationRepository, applicantLookup, secretaryRecipientLookup, auditRecorder, notificationService });
export const listMyApplicationsUseCase = new ListMyApplicationsUseCase({ applicationRepository });
export const getMyApplicationUseCase = new GetMyApplicationUseCase({ applicationRepository });
export const searchApplicationsUseCase = new SearchApplicationsUseCase({ applicationRepository });
export const getApplicationUseCase = new GetApplicationUseCase({ applicationRepository });
export const assignReviewerUseCase = new AssignReviewerUseCase({ applicationRepository, reviewerLookup, auditRecorder, notificationService });
export const recordReviewUseCase = new RecordReviewUseCase({ applicationRepository, auditRecorder, notificationService });
export const decideApplicationUseCase = new DecideApplicationUseCase({ applicationRepository, auditRecorder, notificationService });
