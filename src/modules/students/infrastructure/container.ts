import { prisma } from "@/lib/prisma";
import { getEnv } from "@/config/env";
import { CreateStudentUseCase } from "../application/use-cases/create-student";
import { GetStudentUseCase } from "../application/use-cases/get-student";
import { UpdateStudentUseCase } from "../application/use-cases/update-student";
import { ArchiveStudentUseCase } from "../application/use-cases/archive-student";
import { RestoreStudentUseCase } from "../application/use-cases/restore-student";
import { SearchStudentsUseCase } from "../application/use-cases/search-students";
import { AttachConfidentialDocumentUseCase } from "../application/use-cases/attach-confidential-document";
import { ListConfidentialDocumentsUseCase } from "../application/use-cases/list-confidential-documents";
import { RemoveConfidentialDocumentUseCase } from "../application/use-cases/remove-confidential-document";
import { PrismaStudentRepository } from "./prisma-student-repository";
import { PrismaBatchLookup } from "./prisma-batch-lookup";
import { PrismaUserProvisioner } from "./prisma-user-provisioner";
import { PrismaFileReferenceRepository } from "./prisma-file-reference-repository";

// No secrets required — safe to construct eagerly.
const studentRepository = new PrismaStudentRepository(prisma);
const batchLookup = new PrismaBatchLookup(prisma);
const fileReferenceRepository = new PrismaFileReferenceRepository(prisma);

/** Used by withAuth's getRequiredBatchId callback on single-student routes. */
export async function findStudentBatchId(studentId: string): Promise<string | undefined> {
  const student = await studentRepository.findById(studentId);
  return student?.batchId;
}

export const getStudentUseCase = new GetStudentUseCase({ studentRepository });
export const updateStudentUseCase = new UpdateStudentUseCase({ studentRepository, batchLookup });
export const archiveStudentUseCase = new ArchiveStudentUseCase({ studentRepository });
export const restoreStudentUseCase = new RestoreStudentUseCase({ studentRepository });
export const searchStudentsUseCase = new SearchStudentsUseCase({ studentRepository });
export const attachConfidentialDocumentUseCase = new AttachConfidentialDocumentUseCase({
  studentRepository,
  fileReferenceRepository,
});
export const listConfidentialDocumentsUseCase = new ListConfidentialDocumentsUseCase({
  studentRepository,
  fileReferenceRepository,
});
export const removeConfidentialDocumentUseCase = new RemoveConfidentialDocumentUseCase({
  studentRepository,
  fileReferenceRepository,
});

// Depends on getEnv() (bcrypt cost factor) — lazily constructed and cached,
// same reasoning as src/modules/auth/infrastructure/container.ts: importing
// this module's pure domain types (e.g. from a future module) must never
// require secrets to already be configured.
let cachedUserProvisioner: PrismaUserProvisioner | undefined;
function getUserProvisioner(): PrismaUserProvisioner {
  return (cachedUserProvisioner ??= new PrismaUserProvisioner(prisma, getEnv().BCRYPT_COST_FACTOR));
}

let cachedCreateStudentUseCase: CreateStudentUseCase | undefined;
export function getCreateStudentUseCase(): CreateStudentUseCase {
  return (cachedCreateStudentUseCase ??= new CreateStudentUseCase({
    studentRepository,
    batchLookup,
    userProvisioner: getUserProvisioner(),
  }));
}
