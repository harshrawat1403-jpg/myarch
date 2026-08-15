import { prisma } from "@/lib/prisma";
import { getEnv } from "@/config/env";
import { PrismaAuditRecorder } from "@/lib/audit";
import { PrismaBatchLookup } from "@/lib/batch-lookup";
import { getAdminResetPasswordUseCase, revokeUserSessions } from "@/modules/auth";
import { CreateCoordinatorUseCase, type CreateCoordinatorTransactionContext } from "../application/use-cases/create-coordinator";
import { UpdateCoordinatorUseCase } from "../application/use-cases/update-coordinator";
import { SetCoordinatorActiveUseCase } from "../application/use-cases/set-coordinator-active";
import { AssignBatchUseCase } from "../application/use-cases/assign-batch";
import { RemoveBatchUseCase } from "../application/use-cases/remove-batch";
import { SearchCoordinatorsUseCase } from "../application/use-cases/search-coordinators";
import { GetCoordinatorUseCase } from "../application/use-cases/get-coordinator";
import { BulkSetCoordinatorsActiveUseCase } from "../application/use-cases/bulk-set-coordinators-active";
import { ResetCoordinatorPasswordUseCase } from "../application/use-cases/reset-password";
import { UpdateCoordinatorPermissionsUseCase } from "../application/use-cases/update-coordinator-permissions";
import { SetCoordinatorMaintenanceRoleUseCase } from "../application/use-cases/set-coordinator-maintenance-role";
import { UpdateMaintenanceCoordinatorPermissionsUseCase } from "../application/use-cases/update-maintenance-coordinator-permissions";
import { GetMaintenanceCoordinatorUseCase } from "../application/use-cases/get-maintenance-coordinator";
import { PrismaCoordinatorRepository } from "./prisma-coordinator-repository";
import { PrismaCoordinatorUserProvisioner } from "./prisma-coordinator-user-provisioner";

// No secrets required — safe to construct eagerly.
const coordinatorRepository = new PrismaCoordinatorRepository(prisma);
const batchLookup = new PrismaBatchLookup(prisma);
const auditRecorder = new PrismaAuditRecorder(prisma);

/** Used by withAuth's getRequiredBatchId callback where applicable (batch-assignment routes). */
export async function findCoordinatorUserId(coordinatorId: string): Promise<string | undefined> {
  const coordinator = await coordinatorRepository.findById(coordinatorId);
  return coordinator?.userId;
}

export const updateCoordinatorUseCase = new UpdateCoordinatorUseCase({ coordinatorRepository, auditRecorder });
export const setCoordinatorActiveUseCase = new SetCoordinatorActiveUseCase({
  coordinatorRepository,
  auditRecorder,
  revokeUserSessions,
});
export const assignBatchUseCase = new AssignBatchUseCase({ coordinatorRepository, batchLookup, auditRecorder });
export const removeBatchUseCase = new RemoveBatchUseCase({ coordinatorRepository, auditRecorder });
export const searchCoordinatorsUseCase = new SearchCoordinatorsUseCase({ coordinatorRepository });
export const getCoordinatorUseCase = new GetCoordinatorUseCase({ coordinatorRepository });
export const bulkSetCoordinatorsActiveUseCase = new BulkSetCoordinatorsActiveUseCase({
  setCoordinatorActiveUseCase,
  auditRecorder,
});
export const resetCoordinatorPasswordUseCase = new ResetCoordinatorPasswordUseCase({
  coordinatorRepository,
  resetPassword: (input) => getAdminResetPasswordUseCase().execute(input),
});
export const updateCoordinatorPermissionsUseCase = new UpdateCoordinatorPermissionsUseCase({
  coordinatorRepository,
  auditRecorder,
});
export const setCoordinatorMaintenanceRoleUseCase = new SetCoordinatorMaintenanceRoleUseCase({
  coordinatorRepository,
  auditRecorder,
});
export const updateMaintenanceCoordinatorPermissionsUseCase = new UpdateMaintenanceCoordinatorPermissionsUseCase({
  coordinatorRepository,
  auditRecorder,
});
export const getMaintenanceCoordinatorUseCase = new GetMaintenanceCoordinatorUseCase({ coordinatorRepository });

/**
 * Runs CreateCoordinatorUseCase's writes — provision the User, create the
 * CoordinatorProfile, assign initial batches, optionally designate a
 * Maintenance functional role, and record the COORDINATOR_CREATED audit
 * entry — as one atomic Prisma transaction. Mirrors
 * modules/registration/infrastructure/container.ts's runApproveTransaction
 * exactly: builds transaction-scoped instances of the exact same classes
 * every other Coordinator-management path uses (PrismaCoordinatorRepository,
 * PrismaCoordinatorUserProvisioner, PrismaAuditRecorder,
 * SetCoordinatorMaintenanceRoleUseCase) bound to `tx`, so a mid-sequence
 * failure (duplicate email, a Maintenance-role cap violation) rolls
 * everything back rather than leaving a User account with no
 * CoordinatorProfile, or a CoordinatorProfile with no/wrong Maintenance
 * designation.
 */
async function runCreateCoordinatorTransaction<T>(
  fn: (ctx: CreateCoordinatorTransactionContext) => Promise<T>,
): Promise<T> {
  return prisma.$transaction(async (tx) => {
    const txCoordinatorRepository = new PrismaCoordinatorRepository(tx);
    const txAuditRecorder = new PrismaAuditRecorder(tx);
    const txSetMaintenanceRoleUseCase = new SetCoordinatorMaintenanceRoleUseCase({
      coordinatorRepository: txCoordinatorRepository,
      auditRecorder: txAuditRecorder,
    });

    return fn({
      coordinatorUserProvisioner: new PrismaCoordinatorUserProvisioner(tx, getEnv().BCRYPT_COST_FACTOR),
      coordinatorRepository: txCoordinatorRepository,
      auditRecorder: txAuditRecorder,
      assignMaintenanceRole: (input) => txSetMaintenanceRoleUseCase.execute(input),
    });
  });
}

let cachedCreateCoordinatorUseCase: CreateCoordinatorUseCase | undefined;
export function getCreateCoordinatorUseCase(): CreateCoordinatorUseCase {
  return (cachedCreateCoordinatorUseCase ??= new CreateCoordinatorUseCase({
    coordinatorRepository,
    batchLookup,
    runCreateCoordinatorTransaction,
  }));
}
