import type { AuthenticatedActor } from "@/modules/auth";
import type { ExportScope } from "../domain/entities";

/**
 * Shared scoping decision for the three batch-affiliated exports (Student
 * Directory, Batch Report, Public Placement Dataset) — "Secretary: all
 * exports. Coordinator: batch-scoped exports only." Returns `null` for any
 * other role, which the calling use case turns into a NotAuthorizedError.
 * Not shared across module boundaries (only within this one module, unlike
 * the cross-module reuse this project deliberately avoids per Days 8–9's
 * precedent) — this is the same lightweight, per-module scoping idiom
 * every other module (students, batches, profiles) already repeats
 * independently rather than sharing.
 */
export function resolveBatchScopedExportAccess(actor: AuthenticatedActor): ExportScope | null {
  if (actor.role === "SECRETARY") return {};
  if (actor.role === "COORDINATOR") return { batchIds: actor.batchScope ?? [] };
  return null;
}
