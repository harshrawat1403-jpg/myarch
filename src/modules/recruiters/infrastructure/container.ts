import { prisma } from "@/lib/prisma";
import { getEnv } from "@/config/env";
import { PrismaAuditRecorder } from "@/lib/audit";
import {
  getAdminResetPasswordUseCase,
  revokeUserSessions,
  hashPassword,
  getIssueEmailVerificationTokenUseCase,
} from "@/modules/auth";
import { notificationService } from "@/modules/notifications";
import { SearchDirectoryUseCase } from "../application/use-cases/search-directory";
import { GetRecruiterStudentProfileUseCase } from "../application/use-cases/get-student-profile";
import { GetDashboardStatsUseCase } from "../application/use-cases/get-dashboard-stats";
import { GetResumeReferenceUseCase } from "../application/use-cases/get-resume-reference";
import { SetSavedStudentUseCase } from "../application/use-cases/set-saved-student";
import { SetShortlistedStudentUseCase } from "../application/use-cases/set-shortlisted-student";
import { ExpressInterestUseCase } from "../application/use-cases/express-interest";
import { ListStudentInterestsUseCase } from "../application/use-cases/list-student-interests";
import { RespondToInterestUseCase } from "../application/use-cases/respond-to-interest";
import { ListSavedStudentsUseCase } from "../application/use-cases/list-saved-students";
import { ListSentInterestsUseCase } from "../application/use-cases/list-sent-interests";
import { GetRecruiterOverviewUseCase } from "../application/use-cases/get-recruiter-overview";
import { CreateRecruiterAccountUseCase } from "../application/use-cases/admin/create-recruiter-account";
import { UpdateRecruiterAccountUseCase } from "../application/use-cases/admin/update-recruiter-account";
import { SetRecruiterActiveUseCase } from "../application/use-cases/admin/set-recruiter-active";
import { ApproveRecruiterUseCase } from "../application/use-cases/admin/approve-recruiter";
import { RejectRecruiterUseCase } from "../application/use-cases/admin/reject-recruiter";
import { SearchRecruiterAccountsUseCase } from "../application/use-cases/admin/search-recruiter-accounts";
import { GetRecruiterAccountUseCase } from "../application/use-cases/admin/get-recruiter-account";
import { BulkSetRecruitersActiveUseCase } from "../application/use-cases/admin/bulk-set-recruiters-active";
import { ResetRecruiterPasswordUseCase } from "../application/use-cases/admin/reset-password";
import { SignupRecruiterUseCase } from "../application/use-cases/signup-recruiter";
import { PrismaRecruiterDirectoryRepository } from "./prisma-recruiter-directory-repository";
import { PrismaRecruiterAccountRepository } from "./prisma-recruiter-account-repository";
import { PrismaRecruiterUserProvisioner } from "./prisma-recruiter-user-provisioner";
import { PrismaRecruiterInteractionRepository } from "./prisma-recruiter-interaction-repository";
import { PrismaRecruiterInterestRepository } from "./prisma-recruiter-interest-repository";
import { PrismaRecruiterSelfLookup } from "./prisma-recruiter-self-lookup";
import { PrismaStudentNameLookup } from "./prisma-student-name-lookup";
import { PrismaSecretaryRecipientLookup } from "./prisma-secretary-recipient-lookup";

// No secrets/config required for this module — safe to construct eagerly.
const directoryRepository = new PrismaRecruiterDirectoryRepository(prisma);
const recruiterAccountRepository = new PrismaRecruiterAccountRepository(prisma);
const interactionRepository = new PrismaRecruiterInteractionRepository(prisma);
const interestRepository = new PrismaRecruiterInterestRepository(prisma);
const recruiterSelfLookup = new PrismaRecruiterSelfLookup(prisma);
const studentNameLookup = new PrismaStudentNameLookup(prisma);
const secretaryRecipientLookup = new PrismaSecretaryRecipientLookup(prisma);
const auditRecorder = new PrismaAuditRecorder(prisma);

export const searchDirectoryUseCase = new SearchDirectoryUseCase({
  directoryRepository,
  interactionRepository,
  interestRepository,
  recruiterSelfLookup,
});
export const getRecruiterStudentProfileUseCase = new GetRecruiterStudentProfileUseCase({
  directoryRepository,
  interactionRepository,
  interestRepository,
  recruiterSelfLookup,
});
export const getDashboardStatsUseCase = new GetDashboardStatsUseCase({ directoryRepository });
export const getResumeReferenceUseCase = new GetResumeReferenceUseCase({ directoryRepository });
export const setSavedStudentUseCase = new SetSavedStudentUseCase({
  directoryRepository,
  interactionRepository,
  recruiterSelfLookup,
});
export const setShortlistedStudentUseCase = new SetShortlistedStudentUseCase({
  interactionRepository,
  recruiterSelfLookup,
});
export const expressInterestUseCase = new ExpressInterestUseCase({
  directoryRepository,
  interestRepository,
  recruiterSelfLookup,
  studentNameLookup,
  notificationService,
});
export const listStudentInterestsUseCase = new ListStudentInterestsUseCase({ interestRepository });
export const respondToInterestUseCase = new RespondToInterestUseCase({
  interestRepository,
  recruiterAccountRepository,
  studentNameLookup,
  secretaryRecipientLookup,
  notificationService,
});
export const listSavedStudentsUseCase = new ListSavedStudentsUseCase({
  directoryRepository,
  interactionRepository,
  interestRepository,
  recruiterSelfLookup,
});
export const listSentInterestsUseCase = new ListSentInterestsUseCase({
  directoryRepository,
  interestRepository,
  recruiterSelfLookup,
});
export const getRecruiterOverviewUseCase = new GetRecruiterOverviewUseCase({
  interactionRepository,
  interestRepository,
  recruiterSelfLookup,
});

/** Used by withAuth's getRequiredBatchId callback where applicable — recruiters have no batch scope, so this is always undefined; kept for symmetry with coordinators/students' container shape. */
export async function findRecruiterUserId(recruiterId: string): Promise<string | undefined> {
  const recruiter = await recruiterAccountRepository.findById(recruiterId);
  return recruiter?.userId;
}

export const updateRecruiterAccountUseCase = new UpdateRecruiterAccountUseCase({ recruiterAccountRepository, auditRecorder });
export const setRecruiterActiveUseCase = new SetRecruiterActiveUseCase({
  recruiterAccountRepository,
  auditRecorder,
  revokeUserSessions,
});
export const approveRecruiterUseCase = new ApproveRecruiterUseCase({
  recruiterAccountRepository,
  auditRecorder,
  notificationService,
});
export const rejectRecruiterUseCase = new RejectRecruiterUseCase({
  recruiterAccountRepository,
  auditRecorder,
  notificationService,
});
export const searchRecruiterAccountsUseCase = new SearchRecruiterAccountsUseCase({ recruiterAccountRepository });
export const getRecruiterAccountUseCase = new GetRecruiterAccountUseCase({ recruiterAccountRepository });
export const bulkSetRecruitersActiveUseCase = new BulkSetRecruitersActiveUseCase({
  setRecruiterActiveUseCase,
  auditRecorder,
});
export const resetRecruiterPasswordUseCase = new ResetRecruiterPasswordUseCase({
  recruiterAccountRepository,
  resetPassword: (input) => getAdminResetPasswordUseCase().execute(input),
});

let cachedRecruiterUserProvisioner: PrismaRecruiterUserProvisioner | undefined;
function getRecruiterUserProvisioner(): PrismaRecruiterUserProvisioner {
  return (cachedRecruiterUserProvisioner ??= new PrismaRecruiterUserProvisioner(prisma, getEnv().BCRYPT_COST_FACTOR));
}

let cachedCreateRecruiterAccountUseCase: CreateRecruiterAccountUseCase | undefined;
export function getCreateRecruiterAccountUseCase(): CreateRecruiterAccountUseCase {
  return (cachedCreateRecruiterAccountUseCase ??= new CreateRecruiterAccountUseCase({
    recruiterAccountRepository,
    recruiterUserProvisioner: getRecruiterUserProvisioner(),
    auditRecorder,
  }));
}

let cachedSignupRecruiterUseCase: SignupRecruiterUseCase | undefined;
export function getSignupRecruiterUseCase(): SignupRecruiterUseCase {
  return (cachedSignupRecruiterUseCase ??= new SignupRecruiterUseCase({
    recruiterAccountRepository,
    recruiterUserProvisioner: getRecruiterUserProvisioner(),
    secretaryRecipientLookup,
    notificationService,
    auditRecorder,
    hashPassword,
    issueEmailVerificationToken: (input) => getIssueEmailVerificationTokenUseCase().execute(input),
  }));
}
