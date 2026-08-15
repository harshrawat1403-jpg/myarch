/**
 * Core identity/role types for the auth module's Domain layer.
 * Framework-free per docs/architecture/05_System_Architecture.md — no Prisma
 * or Next.js imports belong here.
 */

export type Role = "SECRETARY" | "COORDINATOR" | "STUDENT" | "RECRUITER" | "ALUMNI";

/**
 * MYARCH Maintenance functional hierarchy — deliberately NOT a Role. A
 * Coordinator carrying this is still, in every other respect, an ordinary
 * Coordinator (peer-only, no account-management power over other
 * Coordinators, no cross-domain access beyond what any Coordinator already
 * has). See src/modules/maintenance/domain/permissions.ts for the only
 * place MAINTENANCE_SECRETARY is treated as unconditional access, and
 * src/modules/coordinators's SetCoordinatorMaintenanceRoleUseCase/
 * UpdateMaintenanceCoordinatorPermissionsUseCase for the two narrow
 * capabilities this unlocks. Never checked by any permission function
 * outside those two modules.
 */
export type MaintenanceCoordinatorRole = "MAINTENANCE_SECRETARY" | "MAINTENANCE_COORDINATOR";

/**
 * The authenticated caller, resolved from a verified access token, carrying
 * exactly the scope information authorization checks need. Coordinators
 * always carry their assigned batch IDs explicitly (never inferred) per
 * docs/security/09_User_Roles_and_Permissions.md — "a Coordinator with zero
 * rows [in CoordinatorBatchScope] has zero batch access."
 */
export interface AuthenticatedActor {
  readonly userId: string;
  readonly role: Role;
  /** Populated only for COORDINATOR; empty array means no batch access. */
  readonly batchScope?: readonly string[];
  /**
   * MYARCH Phase 1: populated only for COORDINATOR — the granular
   * capabilities the Technical Secretary has delegated (roadmap §2.3), read
   * from CoordinatorProfile.permissions at login/refresh (see
   * PrismaUserRepository.loadActorScope) exactly like batchScope. The
   * Technical Secretary (SECRETARY role) never carries this — see
   * hasCoordinatorPermission's own doc comment for why it implicitly has
   * every capability regardless.
   */
  readonly permissions?: readonly string[];
  /**
   * MYARCH Maintenance functional hierarchy — populated only for a
   * COORDINATOR explicitly designated MAINTENANCE_SECRETARY or
   * MAINTENANCE_COORDINATOR (see MaintenanceCoordinatorRole's own doc
   * comment). Undefined for every other Coordinator, and for every other
   * role.
   */
  readonly maintenanceRole?: MaintenanceCoordinatorRole;
  /** Populated only for STUDENT; used for "own data" checks. */
  readonly studentProfileId?: string;
  /**
   * True when this session must change its password before doing anything
   * else (temp password issued at account creation or an admin reset — see
   * admin-reset-password.ts). Present for every role, not role-conditional
   * like batchScope/studentProfileId. Enforced by with-auth.ts's
   * `allowMustChangePassword` gate.
   */
  readonly mustChangePassword?: boolean;
}
