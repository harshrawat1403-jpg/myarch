import type { AuthenticatedActor } from "@/modules/auth";

/**
 * MYARCH Phase 1 — the fixed catalog of granular capabilities the Technical
 * Secretary can delegate to a Coordinator (roadmap §2.3). A capability key
 * existing here does NOT imply a feature exists yet to check it — most of
 * these belong to domains later roadmap phases haven't built (maintenance,
 * events, projects, ...). The grant itself is real today (persisted,
 * Secretary-editable, audited); a later phase's module simply starts
 * calling hasCoordinatorPermission with the matching key once it exists,
 * rather than inventing its own delegation storage — this catalog is
 * intentionally forward-declared so that happens without a schema change.
 *
 * Grouped by the roadmap domain each key belongs to. Adding a key here is
 * additive and safe (String[] storage, no enum/migration needed) — do this
 * once a real phase actually needs a new capability, not speculatively.
 */
export const COORDINATOR_PERMISSION_KEYS = [
  "maintenance.view",
  "maintenance.create",
  "maintenance.assign",
  "maintenance.manage",

  // MYARCH Phase 2 (§3.7) — Generic Request System, added now that a real
  // phase needs it (not speculative — see this file's own doc comment).
  "requests.view",
  "requests.manage",

  "events.view",
  "events.create",
  "events.manage",

  // MYARCH Phase 3 (§4.4) — Meeting Management, added now that a real phase
  // needs it (not speculative — see this file's own doc comment). No
  // granular split requested for meetings, mirroring announcements.manage's
  // own single-key shape.
  "meetings.manage",

  "applications.view",
  "applications.review",
  "applications.shortlist",

  "interviews.manage",

  "projects.manage",

  "resources.manage",

  "facilities.manage",

  "assets.manage",

  "inventory.manage",

  "announcements.manage",
] as const;

export type CoordinatorPermissionKey = (typeof COORDINATOR_PERMISSION_KEYS)[number];

export function isCoordinatorPermissionKey(value: string): value is CoordinatorPermissionKey {
  return (COORDINATOR_PERMISSION_KEYS as readonly string[]).includes(value);
}

/**
 * The Technical Secretary (SECRETARY role) implicitly holds every
 * capability regardless of any stored grant — matching how every other
 * permission function in src/modules/auth/domain/permissions.ts treats
 * SECRETARY as unscoped/unconditional. A Coordinator holds exactly the
 * capabilities explicitly delegated to them (empty array = none), the same
 * "zero rows = zero access" convention batchScope already established.
 */
export function hasCoordinatorPermission(
  actor: AuthenticatedActor,
  key: CoordinatorPermissionKey,
): boolean {
  if (actor.role === "SECRETARY") return true;
  if (actor.role !== "COORDINATOR") return false;
  return (actor.permissions ?? []).includes(key);
}
