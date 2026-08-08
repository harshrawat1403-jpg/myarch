import type { AuthenticatedActor } from "@/modules/auth";
import { canManageCoordinatorAccounts } from "@/modules/auth";
import { NotAuthorizedError } from "@/lib/errors";
import { AUDIT_ACTIONS } from "@/lib/audit-actions";
import type { AuditRecorder } from "@/lib/audit";
import type { BatchLookup } from "@/lib/batch-lookup";
import type { CoordinatorRecord } from "../../domain/entities";
import { BatchNotFoundError, DuplicateEmailError } from "../../domain/errors";
import type { CoordinatorRepository } from "../ports/coordinator-repository";
import type { CoordinatorUserProvisioner } from "../ports/coordinator-user-provisioner";

export interface CreateCoordinatorInput {
  actor: AuthenticatedActor;
  email: string;
  fullName: string;
  /** Optional initial batch assignments — same effect as creating, then calling AssignBatchUseCase once per id. */
  batchIds?: readonly string[];
}

export interface CreateCoordinatorResult {
  coordinator: CoordinatorRecord;
  /** Plaintext — reveal-once. Never persisted, never logged. */
  tempPassword: string;
}

export interface CreateCoordinatorUseCaseDeps {
  coordinatorRepository: CoordinatorRepository;
  coordinatorUserProvisioner: CoordinatorUserProvisioner;
  batchLookup: BatchLookup;
  auditRecorder: AuditRecorder;
}

export class CreateCoordinatorUseCase {
  constructor(private readonly deps: CreateCoordinatorUseCaseDeps) {}

  async execute(input: CreateCoordinatorInput): Promise<CreateCoordinatorResult> {
    if (!canManageCoordinatorAccounts(input.actor)) {
      throw new NotAuthorizedError("Not authorized to create coordinator accounts");
    }

    for (const batchId of input.batchIds ?? []) {
      const batch = await this.deps.batchLookup.findById(batchId);
      if (!batch) throw new BatchNotFoundError();
    }

    let userId: string;
    let tempPassword: string;
    try {
      const provisioned = await this.deps.coordinatorUserProvisioner.provisionCoordinatorUser(input.email);
      userId = provisioned.userId;
      tempPassword = provisioned.tempPassword;
    } catch (err) {
      if (isUniqueConstraintViolation(err)) {
        throw new DuplicateEmailError(input.email);
      }
      throw err;
    }

    let coordinator = await this.deps.coordinatorRepository.create({ userId, fullName: input.fullName });

    for (const batchId of input.batchIds ?? []) {
      coordinator = await this.deps.coordinatorRepository.assignBatch(coordinator.id, batchId);
    }

    await this.deps.auditRecorder.record({
      actorUserId: input.actor.userId,
      action: AUDIT_ACTIONS.COORDINATOR_CREATED,
      targetEntityType: "User",
      targetEntityId: userId,
      metadata: { coordinatorId: coordinator.id },
    });

    return { coordinator, tempPassword };
  }
}

function isUniqueConstraintViolation(err: unknown): boolean {
  return typeof err === "object" && err !== null && "code" in err && (err as { code?: unknown }).code === "P2002";
}
