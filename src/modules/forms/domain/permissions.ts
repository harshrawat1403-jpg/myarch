import type { AuthenticatedActor } from "@/modules/auth";

export function canManageForms(actor: AuthenticatedActor): boolean {
  return actor.role === "SECRETARY";
}

export function canViewForms(actor: AuthenticatedActor): boolean {
  return actor.role === "SECRETARY" || actor.role === "COORDINATOR" || actor.role === "STUDENT";
}

