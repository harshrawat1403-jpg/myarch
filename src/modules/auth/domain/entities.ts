/**
 * Core identity/role types for the auth module's Domain layer.
 * Framework-free per docs/architecture/05_System_Architecture.md — no Prisma
 * or Next.js imports belong here.
 */

export type Role = "SECRETARY" | "COORDINATOR" | "STUDENT" | "RECRUITER";

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
  /**
   * True only for a session issued by DemoLoginUseCase (the public MYARCH
   * showcase's "Visit as Student/Recruiter/Admin" entry points — see
   * domain/demo-accounts.ts). with-auth.ts rejects every non-GET request
   * for such a session, platform-wide, regardless of role — a demo visitor
   * can look around the real dashboards but never create, change, or
   * delete anything.
   */
  readonly isDemo?: boolean;
}
