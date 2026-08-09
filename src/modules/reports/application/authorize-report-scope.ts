import type { AuthenticatedActor } from "@/modules/auth";

/**
 * Institutional-report scoping (Placements/Internships funnel) — "Secretary:
 * Full. Coordinator: Scoped." (PRD §4's Reports row). Mirrors
 * exports/application/authorize-export-scope.ts's identical shape
 * (per-module idiom, not shared across module boundaries — same reasoning
 * as that file's own doc comment). Returns `undefined` batchIds for an
 * unrestricted Secretary, `null` for any role with no institutional-report
 * access at all (Student/Recruiter get their own, separate "my activity"
 * use cases instead — never this one).
 */
export function resolveInstitutionalReportScope(actor: AuthenticatedActor): { batchIds?: readonly string[] } | null {
  if (actor.role === "SECRETARY") return {};
  if (actor.role === "COORDINATOR") return { batchIds: actor.batchScope ?? [] };
  return null;
}
