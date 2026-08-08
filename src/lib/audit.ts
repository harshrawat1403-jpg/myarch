import type { Prisma, PrismaClient } from "@prisma/client";
import type { AuthenticatedActor } from "@/modules/auth";

/**
 * Cross-cutting audit port, used by every module that performs a
 * security-sensitive action (docs/architecture/05_System_Architecture.md's
 * module map lists `audit` explicitly as "cross-cutting, used by all
 * modules"). Originally implemented inside the auth module (Days 2–3); a
 * second module (profiles, Days 5–6) needing the exact same concept is the
 * signal that it belongs here instead of being duplicated per module.
 */
export interface AuditRecorder {
  record(entry: {
    actorUserId: string;
    action: string;
    targetEntityType: string;
    targetEntityId: string;
    metadata?: Record<string, unknown>;
  }): Promise<void>;
}

export interface AuditLogEntry {
  readonly id: string;
  readonly actorUserId: string;
  readonly action: string;
  readonly targetEntityType: string;
  readonly targetEntityId: string;
  readonly metadata: Record<string, unknown>;
  readonly occurredAt: Date;
}

/**
 * Pure scoping decision for the Day 7 audit-history view — extracted so it
 * can be unit-tested without a database: Secretary sees everything recent;
 * anyone else (in practice, only a Coordinator ever reaches this endpoint —
 * see the route's role gate) sees only their own actions.
 */
export function resolveAuditFilter(actor: Pick<AuthenticatedActor, "role" | "userId">): {
  actorUserId?: string;
} {
  if (actor.role === "SECRETARY") return {};
  return { actorUserId: actor.userId };
}

export class PrismaAuditRecorder implements AuditRecorder {
  constructor(private readonly prisma: PrismaClient) {}

  async record(entry: {
    actorUserId: string;
    action: string;
    targetEntityType: string;
    targetEntityId: string;
    metadata?: Record<string, unknown>;
  }): Promise<void> {
    await this.prisma.auditLog.create({
      data: {
        actorUserId: entry.actorUserId,
        action: entry.action,
        targetEntityType: entry.targetEntityType,
        targetEntityId: entry.targetEntityId,
        metadata: (entry.metadata ?? {}) as Prisma.InputJsonValue,
      },
    });
  }

  /**
   * "Display audit history where appropriate... do not implement advanced
   * filtering yet" (Day 7 scope) — a Secretary sees the most recent system-
   * wide entries; a Coordinator sees only their OWN actions (not yet "and
   * actions within their scope" per docs/security/09_User_Roles_and_Permissions.md,
   * since that requires joining back from arbitrary target entities to a
   * batch, which is exactly the "advanced filtering" this phase defers).
   * This simplification is deliberate and noted in CHANGELOG.md, not a
   * silent gap.
   */
  async listRecent(filter: { actorUserId?: string }, limit: number): Promise<AuditLogEntry[]> {
    const rows = await this.prisma.auditLog.findMany({
      where: filter.actorUserId ? { actorUserId: filter.actorUserId } : undefined,
      orderBy: { occurredAt: "desc" },
      take: limit,
    });

    return rows.map((row) => ({
      id: row.id,
      actorUserId: row.actorUserId,
      action: row.action,
      targetEntityType: row.targetEntityType,
      targetEntityId: row.targetEntityId,
      metadata: row.metadata as Record<string, unknown>,
      occurredAt: row.occurredAt,
    }));
  }

  /**
   * V3.0 Administration Platform: "recent activity" for a single account
   * (Coordinator/Recruiter management's activity panels) — entries where
   * this user is either the actor (things they did, e.g. LOGIN_SUCCESS) or
   * the target (things done to their account, e.g. PASSWORD_RESET).
   * Separate from listRecent (Day 7's role-scoped feed) rather than
   * overloading its filter shape, since the two have different callers and
   * different scoping rules.
   */
  async listForAccount(userId: string, limit: number): Promise<AuditLogEntry[]> {
    const rows = await this.prisma.auditLog.findMany({
      where: { OR: [{ actorUserId: userId }, { targetEntityId: userId }] },
      orderBy: { occurredAt: "desc" },
      take: limit,
    });

    return rows.map((row) => ({
      id: row.id,
      actorUserId: row.actorUserId,
      action: row.action,
      targetEntityType: row.targetEntityType,
      targetEntityId: row.targetEntityId,
      metadata: row.metadata as Record<string, unknown>,
      occurredAt: row.occurredAt,
    }));
  }
}
