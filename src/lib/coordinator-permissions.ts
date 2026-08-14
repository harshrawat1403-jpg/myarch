import type { CoordinatorPermissionKey } from "@/modules/coordinators";

/**
 * Client-safe mirror of coordinators/domain/permissions.ts's
 * COORDINATOR_PERMISSION_KEYS — deliberately duplicated here rather than
 * imported from the module barrel. Importing any runtime (non-type) export
 * from `@/modules/coordinators` in a "use client" file pulls in that
 * barrel's route-handler/container re-exports, which transitively reach
 * Prisma/node:fs — breaking the client bundle. Same precedent as
 * coordinator-position.ts's own COORDINATOR_POSITION_OPTIONS.
 */
export const COORDINATOR_PERMISSION_KEYS: readonly CoordinatorPermissionKey[] = [
  "maintenance.view",
  "maintenance.create",
  "maintenance.assign",
  "maintenance.manage",

  "events.view",
  "events.create",
  "events.manage",

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
];

export function coordinatorPermissionLabel(key: string): string {
  const [, action] = key.split(".");
  return action ? action.charAt(0).toUpperCase() + action.slice(1) : key;
}
