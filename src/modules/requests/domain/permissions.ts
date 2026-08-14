import type { AuthenticatedActor } from "@/modules/auth";
import { hasCoordinatorPermission } from "@/modules/coordinators";
import type { RequestRecord } from "./entities";

/** Anyone with an on-campus account may submit a request — Recruiter/Alumni excluded (not applicable to their role). */
export function canSubmitRequest(actor: AuthenticatedActor): boolean {
  return actor.role === "SECRETARY" || actor.role === "COORDINATOR" || actor.role === "STUDENT";
}

/** Secretary unscoped. Coordinator: delegated `requests.view` sees every request, otherwise only ones they own. Student (the requester): only their own. */
export function canViewRequest(actor: AuthenticatedActor, request: Pick<RequestRecord, "requesterId" | "ownerId">): boolean {
  if (actor.role === "SECRETARY") return true;
  if (actor.role === "COORDINATOR") {
    return hasCoordinatorPermission(actor, "requests.view") || actor.userId === request.ownerId;
  }
  if (actor.role === "STUDENT") return actor.userId === request.requesterId;
  return false;
}

/** Decide/assign/reassign/progress/complete/close — delegated `requests.manage`, or the Coordinator currently owning it. */
export function canManageRequest(actor: AuthenticatedActor, request: Pick<RequestRecord, "ownerId">): boolean {
  if (actor.role === "SECRETARY") return true;
  if (actor.role === "COORDINATOR") {
    return hasCoordinatorPermission(actor, "requests.manage") || actor.userId === request.ownerId;
  }
  return false;
}
