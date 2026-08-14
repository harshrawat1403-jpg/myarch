import { prisma } from "@/lib/prisma";
import { PrismaAuditRecorder } from "@/lib/audit";
import { hashPassword, getIssueEmailVerificationTokenUseCase } from "@/modules/auth";
import { notificationService } from "@/modules/notifications";
import { PrismaAlumniRepository } from "./prisma-alumni-repository";
import { PrismaAlumniUserProvisioner } from "./prisma-alumni-user-provisioner";
import { PrismaSecretaryRecipientLookup } from "./prisma-secretary-recipient-lookup";
import { CreateAlumniUseCase } from "../application/use-cases/create-alumni";
import { UpdateAlumniUseCase } from "../application/use-cases/update-alumni";
import { DeleteAlumniUseCase } from "../application/use-cases/delete-alumni";
import { SearchAlumniUseCase } from "../application/use-cases/search-alumni";
import { GetAlumniUseCase } from "../application/use-cases/get-alumni";
import { SignupAlumniUseCase } from "../application/use-cases/signup-alumni";
import { ApproveAlumniUseCase } from "../application/use-cases/admin/approve-alumni";
import { RejectAlumniUseCase } from "../application/use-cases/admin/reject-alumni";

// No secrets required — safe to construct eagerly.
const alumniRepository = new PrismaAlumniRepository(prisma);
const alumniUserProvisioner = new PrismaAlumniUserProvisioner(prisma);
const secretaryRecipientLookup = new PrismaSecretaryRecipientLookup(prisma);
const auditRecorder = new PrismaAuditRecorder(prisma);

export const createAlumniUseCase = new CreateAlumniUseCase({ alumniRepository, auditRecorder });
export const updateAlumniUseCase = new UpdateAlumniUseCase({ alumniRepository, auditRecorder });
export const deleteAlumniUseCase = new DeleteAlumniUseCase({ alumniRepository, auditRecorder });
export const searchAlumniUseCase = new SearchAlumniUseCase({ alumniRepository });
export const getAlumniUseCase = new GetAlumniUseCase({ alumniRepository });
export const approveAlumniUseCase = new ApproveAlumniUseCase({ alumniRepository, auditRecorder, notificationService });
export const rejectAlumniUseCase = new RejectAlumniUseCase({ alumniRepository, auditRecorder, notificationService });

let cachedSignupAlumniUseCase: SignupAlumniUseCase | undefined;
export function getSignupAlumniUseCase(): SignupAlumniUseCase {
  return (cachedSignupAlumniUseCase ??= new SignupAlumniUseCase({
    alumniRepository,
    alumniUserProvisioner,
    secretaryRecipientLookup,
    notificationService,
    auditRecorder,
    hashPassword,
    issueEmailVerificationToken: (input) => getIssueEmailVerificationTokenUseCase().execute(input),
  }));
}
