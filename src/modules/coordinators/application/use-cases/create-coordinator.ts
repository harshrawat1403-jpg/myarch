import type { AuthenticatedActor } from "@/modules/auth";
import { canManageCoordinatorAccounts } from "@/modules/auth";
import { NotAuthorizedError } from "@/lib/errors";
import { AUDIT_ACTIONS } from "@/lib/audit-actions";
import type { AuditRecorder } from "@/lib/audit";
import type { BatchLookup } from "@/lib/batch-lookup";
import {
  MAX_ACTIVE_COORDINATORS,
  normalizeCoordinatorPosition,
  type CoordinatorPosition,
  type CoordinatorRecord,
  type MaintenanceCoordinatorRole,
} from "../../domain/entities";
import { BatchNotFoundError, DuplicateEmailError, InvalidCustomPositionError, MaxActiveCoordinatorsError } from "../../domain/errors";
import type { CoordinatorRepository } from "../ports/coordinator-repository";
import type { CoordinatorUserProvisioner } from "../ports/coordinator-user-provisioner";
import type { SetCoordinatorMaintenanceRoleInput } from "./set-coordinator-maintenance-role";

export interface CreateCoordinatorInput {
  actor: AuthenticatedActor;
  email: string;
  fullName: string;
  /** Display/reporting label only — see CoordinatorPosition doc comment. */
  position?: CoordinatorPosition;
  /** Required (and trimmed) when position is "OTHER"; ignored/cleared otherwise — see normalizeCoordinatorPosition. */
  customPosition?: string | null;
  /** Optional initial batch assignments — same effect as creating, then calling AssignBatchUseCase once per id. */
  batchIds?: readonly string[];
  /**
   * Optional — designates the new Coordinator MAINTENANCE_SECRETARY or
   * MAINTENANCE_COORDINATOR as part of the same atomic create, via
   * SetCoordinatorMaintenanceRoleUseCase (never reimplemented here — see
   * CreateCoordinatorTransactionContext.assignMaintenanceRole). Its own
   * authorization (Secretary-only) and at-most-one-active-per-role cap are
   * fully re-checked, unweakened; a cap violation rolls back the entire
   * create, same as a duplicate email would.
   */
  maintenanceRole?: MaintenanceCoordinatorRole | null;
}

export interface CreateCoordinatorResult {
  coordinator: CoordinatorRecord;
  /** Plaintext — reveal-once. Never persisted, never logged. */
  tempPassword: string;
}

/**
 * The context handed to the create transaction callback — user
 * provisioning, profile creation, batch assignment, and (optionally)
 * Maintenance functional-role designation, all bound to one transaction's
 * Prisma client so they commit or roll back together.
 */
export interface CreateCoordinatorTransactionContext {
  coordinatorUserProvisioner: CoordinatorUserProvisioner;
  coordinatorRepository: CoordinatorRepository;
  auditRecorder: AuditRecorder;
  /** A transaction-scoped SetCoordinatorMaintenanceRoleUseCase.execute — see that class for the authorization/cap-checking/audit logic reused here, never duplicated. */
  assignMaintenanceRole: (input: SetCoordinatorMaintenanceRoleInput) => Promise<CoordinatorRecord>;
}

export interface CreateCoordinatorUseCaseDeps {
  /** Used only for the pre-transaction MAX_ACTIVE_COORDINATORS read — see execute()'s own comment on why this check stays outside the transaction. */
  coordinatorRepository: CoordinatorRepository;
  batchLookup: BatchLookup;
  /**
   * Runs every write this use case performs — provision the User, create
   * the CoordinatorProfile, assign initial batches, optionally designate a
   * Maintenance functional role, and record the COORDINATOR_CREATED audit
   * entry — as one atomic Prisma transaction. Mirrors registration's own
   * runApproveTransaction (decide-registration-request.ts) exactly: a
   * mid-sequence failure (duplicate email, a Maintenance-role cap
   * violation, ...) rolls back everything above, so a failed create can
   * never leave a real User account with no CoordinatorProfile — or a
   * CoordinatorProfile with no/wrong Maintenance designation — behind.
   * Injected rather than opened directly here, so this use case stays
   * testable against a fake — see container.ts for the real
   * `prisma.$transaction` wiring, which builds transaction-scoped
   * instances of the exact repository/use-case classes every other
   * Coordinator-management path already uses.
   */
  runCreateCoordinatorTransaction: <T>(fn: (ctx: CreateCoordinatorTransactionContext) => Promise<T>) => Promise<T>;
}

export class CreateCoordinatorUseCase {
  constructor(private readonly deps: CreateCoordinatorUseCaseDeps) {}

  async execute(input: CreateCoordinatorInput): Promise<CreateCoordinatorResult> {
    if (!canManageCoordinatorAccounts(input.actor)) {
      throw new NotAuthorizedError("Not authorized to create coordinator accounts");
    }

    // A newly created Coordinator is always active (no isActive input exists
    // on this use case), so the cap applies unconditionally here — checked
    // before any write, and before the transaction even opens, since a
    // failure here never wrote anything and so needs no rollback.
    const activeCount = await this.deps.coordinatorRepository.countActive();
    if (activeCount >= MAX_ACTIVE_COORDINATORS) {
      throw new MaxActiveCoordinatorsError();
    }

    for (const batchId of input.batchIds ?? []) {
      const batch = await this.deps.batchLookup.findById(batchId);
      if (!batch) throw new BatchNotFoundError();
    }

    // Validated before the transaction opens so a bad customPosition never
    // even attempts to provision a User row.
    const { position, customPosition } = normalizeCoordinatorPosition(input.position, input.customPosition, () => {
      throw new InvalidCustomPositionError();
    });

    return this.deps.runCreateCoordinatorTransaction(async (ctx) => {
      let userId: string;
      let tempPassword: string;
      try {
        const provisioned = await ctx.coordinatorUserProvisioner.provisionCoordinatorUser(input.email);
        userId = provisioned.userId;
        tempPassword = provisioned.tempPassword;
      } catch (err) {
        if (isUniqueConstraintViolation(err)) {
          throw new DuplicateEmailError(input.email);
        }
        throw err;
      }

      let coordinator = await ctx.coordinatorRepository.create({
        userId,
        fullName: input.fullName,
        position,
        customPosition,
      });

      for (const batchId of input.batchIds ?? []) {
        coordinator = await ctx.coordinatorRepository.assignBatch(coordinator.id, batchId);
      }

      if (input.maintenanceRole) {
        coordinator = await ctx.assignMaintenanceRole({
          actor: input.actor,
          coordinatorId: coordinator.id,
          maintenanceRole: input.maintenanceRole,
        });
      }

      await ctx.auditRecorder.record({
        actorUserId: input.actor.userId,
        action: AUDIT_ACTIONS.COORDINATOR_CREATED,
        targetEntityType: "User",
        targetEntityId: userId,
        metadata: { coordinatorId: coordinator.id },
      });

      return { coordinator, tempPassword };
    });
  }
}

function isUniqueConstraintViolation(err: unknown): boolean {
  return typeof err === "object" && err !== null && "code" in err && (err as { code?: unknown }).code === "P2002";
}
