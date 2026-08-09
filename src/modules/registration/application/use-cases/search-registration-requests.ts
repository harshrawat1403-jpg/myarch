import type { AuthenticatedActor } from "@/modules/auth";
import { NotAuthorizedError } from "@/lib/errors";
import type { RegistrationRequestRecord, RegistrationRequestSearchFilters } from "../../domain/entities";
import type { RegistrationRequestRepository } from "../ports/registration-request-repository";

export interface SearchRegistrationRequestsInput {
  actor: AuthenticatedActor;
  filters: Pick<RegistrationRequestSearchFilters, "status" | "batchId">;
}

/**
 * Secretary sees every request (unscoped); a Coordinator only sees requests
 * for batches within their own scope (§4's "Mark ... Scoped" row) — applied
 * here as a repository-level allow-list, the same "scope filters the query,
 * never a post-fetch check" discipline PrismaStudentRepository.search
 * already established, not a permission function called once per row.
 */
export class SearchRegistrationRequestsUseCase {
  constructor(private readonly deps: { registrationRequestRepository: RegistrationRequestRepository }) {}

  async execute(input: SearchRegistrationRequestsInput): Promise<RegistrationRequestRecord[]> {
    if (input.actor.role !== "SECRETARY" && input.actor.role !== "COORDINATOR") {
      throw new NotAuthorizedError("Not authorized to view registration requests");
    }

    const batchIds = input.actor.role === "COORDINATOR" ? (input.actor.batchScope ?? []) : undefined;
    return this.deps.registrationRequestRepository.search({ ...input.filters, batchIds });
  }
}
