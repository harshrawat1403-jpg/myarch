import { prisma } from "@/lib/prisma";
import type { PrismaTransactionClient } from "@/lib/prisma";
import { getEnv } from "@/config/env";
import { PrismaAuditRecorder } from "@/lib/audit";
import { saveFile, readFile, deleteFile } from "@/lib/file-storage";
import { jobDispatcher, jobRegistry } from "@/modules/jobs";
import { getAdminResetPasswordUseCase } from "@/modules/auth";
import { CreateStudentUseCase } from "../application/use-cases/create-student";
import { GetStudentUseCase } from "../application/use-cases/get-student";
import { UpdateStudentUseCase } from "../application/use-cases/update-student";
import { ArchiveStudentUseCase } from "../application/use-cases/archive-student";
import { RestoreStudentUseCase } from "../application/use-cases/restore-student";
import { SearchStudentsUseCase } from "../application/use-cases/search-students";
import { AttachConfidentialDocumentUseCase } from "../application/use-cases/attach-confidential-document";
import { ListConfidentialDocumentsUseCase } from "../application/use-cases/list-confidential-documents";
import { RemoveConfidentialDocumentUseCase } from "../application/use-cases/remove-confidential-document";
import { ResetStudentPasswordUseCase } from "../application/use-cases/reset-password";
import { BulkSetStudentsActiveUseCase } from "../application/use-cases/bulk-set-students-active";
import {
  StartBulkImportUseCase,
  BULK_IMPORT_STUDENTS_JOB_TYPE,
} from "../application/use-cases/start-bulk-import";
import { GetBulkImportRunUseCase } from "../application/use-cases/get-bulk-import-run";
import { PrismaStudentRepository } from "./prisma-student-repository";
import { PrismaBatchLookup } from "@/lib/batch-lookup";
import { PrismaUserProvisioner } from "./prisma-user-provisioner";
import { PrismaFileReferenceRepository } from "./prisma-file-reference-repository";
import { PrismaBulkImportRunRepository } from "./prisma-bulk-import-run-repository";
import { BulkImportStudentsJobHandler } from "./bulk-import-job-handler";

// No secrets required — safe to construct eagerly.
const studentRepository = new PrismaStudentRepository(prisma);
const batchLookup = new PrismaBatchLookup(prisma);
const fileReferenceRepository = new PrismaFileReferenceRepository(prisma);
const auditRecorder = new PrismaAuditRecorder(prisma);
const bulkImportRunRepository = new PrismaBulkImportRunRepository(prisma);

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
export const resetStudentPasswordUseCase = new ResetStudentPasswordUseCase({
  studentRepository,
  resetPassword: (input) => getAdminResetPasswordUseCase().execute(input),
});
export const bulkSetStudentsActiveUseCase = new BulkSetStudentsActiveUseCase({
  archiveStudentUseCase,
  restoreStudentUseCase,
  auditRecorder,
});
export const getBulkImportRunUseCase = new GetBulkImportRunUseCase({ bulkImportRunRepository });
export const startBulkImportUseCase = new StartBulkImportUseCase({
  batchLookup,
  bulkImportRunRepository,
  auditRecorder,
  saveFile,
  dispatchJob: (payload) =>
    jobDispatcher.dispatch(
      BULK_IMPORT_STUDENTS_JOB_TYPE,
      payload as unknown as Record<string, unknown>,
      {
        maxAttempts: 1,
      },
    ),
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

/**
 * Transaction-scoped variant of getCreateStudentUseCase(), for a caller that
 * must run student creation inside a larger atomic Prisma transaction
 * alongside other cross-module writes (registration's approval flow — see
 * modules/registration/infrastructure/container.ts). Always builds a fresh
 * instance bound to the given client, unlike the cached singleton above.
 * The batch lookup is transaction-scoped too. Registration approval uses
 * this builder inside an interactive transaction, so every database access
 * in the account-creation phase must use that same client.
 */
export function buildCreateStudentUseCase(client: PrismaTransactionClient): CreateStudentUseCase {
  return new CreateStudentUseCase({
    studentRepository: new PrismaStudentRepository(client),
    batchLookup: new PrismaBatchLookup(client),
    userProvisioner: new PrismaUserProvisioner(client, getEnv().BCRYPT_COST_FACTOR),
  });
}

/**
 * Registers this module's BULK_IMPORT_STUDENTS handler into the shared
 * JobRegistry. Must be called once by whatever process actually runs a
 * JobWorker (scripts/run-worker.ts) — never a side effect of importing this
 * file, mirroring notifications/infrastructure/container.ts's
 * registerJobHandlers(). Idempotent: safe to call more than once.
 */
export function registerBulkImportJobHandlers(): void {
  if (jobRegistry.has(BULK_IMPORT_STUDENTS_JOB_TYPE)) {
    return;
  }
  jobRegistry.register(
    new BulkImportStudentsJobHandler({
      bulkImportRunRepository,
      createStudentUseCase: getCreateStudentUseCase(),
      auditRecorder,
      readFile,
      deleteFile,
    }),
  );
}
