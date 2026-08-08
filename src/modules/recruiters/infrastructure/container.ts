import { prisma } from "@/lib/prisma";
import { getEnv } from "@/config/env";
import { PrismaAuditRecorder } from "@/lib/audit";
import { getAdminResetPasswordUseCase, revokeUserSessions } from "@/modules/auth";
import { SearchDirectoryUseCase } from "../application/use-cases/search-directory";
import { GetRecruiterStudentProfileUseCase } from "../application/use-cases/get-student-profile";
import { GetDashboardStatsUseCase } from "../application/use-cases/get-dashboard-stats";
import { GetResumeReferenceUseCase } from "../application/use-cases/get-resume-reference";
import { CreateRecruiterAccountUseCase } from "../application/use-cases/admin/create-recruiter-account";
import { UpdateRecruiterAccountUseCase } from "../application/use-cases/admin/update-recruiter-account";
import { SetRecruiterActiveUseCase } from "../application/use-cases/admin/set-recruiter-active";
import { ApproveRecruiterUseCase } from "../application/use-cases/admin/approve-recruiter";
import { RejectRecruiterUseCase } from "../application/use-cases/admin/reject-recruiter";
import { SearchRecruiterAccountsUseCase } from "../application/use-cases/admin/search-recruiter-accounts";
import { GetRecruiterAccountUseCase } from "../application/use-cases/admin/get-recruiter-account";
import { BulkSetRecruitersActiveUseCase } from "../application/use-cases/admin/bulk-set-recruiters-active";
import { ResetRecruiterPasswordUseCase } from "../application/use-cases/admin/reset-password";
import { PrismaRecruiterDirectoryRepository } from "./prisma-recruiter-directory-repository";
import { PrismaRecruiterAccountRepository } from "./prisma-recruiter-account-repository";
import { PrismaRecruiterUserProvisioner } from "./prisma-recruiter-user-provisioner";

// No secrets/config required for this module — safe to construct eagerly.
const directoryRepository = new PrismaRecruiterDirectoryRepository(prisma);
const recruiterAccountRepository = new PrismaRecruiterAccountRepository(prisma);
const auditRecorder = new PrismaAuditRecorder(prisma);

export const searchDirectoryUseCase = new SearchDirectoryUseCase({ directoryRepository });
export const getRecruiterStudentProfileUseCase = new GetRecruiterStudentProfileUseCase({
  directoryRepository,
});
export const getDashboardStatsUseCase = new GetDashboardStatsUseCase({ directoryRepository });
export const getResumeReferenceUseCase = new GetResumeReferenceUseCase({ directoryRepository });

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
export const approveRecruiterUseCase = new ApproveRecruiterUseCase({ recruiterAccountRepository, auditRecorder });
export const rejectRecruiterUseCase = new RejectRecruiterUseCase({ recruiterAccountRepository, auditRecorder });
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
