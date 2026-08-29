import type { AuthenticatedActor } from "@/modules/auth";

/**
 * Edit Mode is strictly SECRETARY-only — no delegated Coordinator
 * permission, no SUPER_ADMIN role (there isn't one in this app). Every
 * mutating use case re-derives this server-side regardless of what the UI
 * shows or hides.
 */
export function canManageContentOverrides(actor: AuthenticatedActor): boolean {
  return actor.role === "SECRETARY";
}
