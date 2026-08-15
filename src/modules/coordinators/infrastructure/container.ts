import { prisma } from "@/lib/prisma";
import { getEnv } from "@/config/env";
import { PrismaAuditRecorder } from "@/lib/audit";
import { PrismaBatchLookup } from "@/lib/batch-lookup";
import { getAdminResetPasswordUseCase, revokeUserSessions } from "@/modules/auth";
import { CreateCoordinatorUseCase } from "../application/use-cases/create-coordinator";
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

// Depends on getEnv() (bcrypt cost factor) — lazily constructed and cached,
// same reasoning as students/infrastructure/container.ts.
let cachedUserProvisioner: PrismaCoordinatorUserProvisioner | undefined;
function getUserProvisioner(): PrismaCoordinatorUserProvisioner {
  return (cachedUserProvisioner ??= new PrismaCoordinatorUserProvisioner(prisma, getEnv().BCRYPT_COST_FACTOR));
}

let cachedCreateCoordinatorUseCase: CreateCoordinatorUseCase | undefined;
export function getCreateCoordinatorUseCase(): CreateCoordinatorUseCase {
  return (cachedCreateCoordinatorUseCase ??= new CreateCoordinatorUseCase({
    coordinatorRepository,
    coordinatorUserProvisioner: getUserProvisioner(),
    batchLookup,
    auditRecorder,
  }));
}
