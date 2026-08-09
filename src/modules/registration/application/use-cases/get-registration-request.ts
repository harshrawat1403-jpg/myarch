import type { AuthenticatedActor } from "@/modules/auth";
import { canReviewRegistrationRequest } from "@/modules/auth";
import { NotAuthorizedError } from "@/lib/errors";
import type { RegistrationRequestRecord } from "../../domain/entities";
import { RegistrationRequestNotFoundError } from "../../domain/errors";
import type { RegistrationRequestRepository } from "../ports/registration-request-repository";

export interface GetRegistrationRequestInput {
  actor: AuthenticatedActor;
  requestId: string;
}

export class GetRegistrationRequestUseCase {
  constructor(private readonly deps: { registrationRequestRepository: RegistrationRequestRepository }) {}

  async execute(input: GetRegistrationRequestInput): Promise<RegistrationRequestRecord> {
    const request = await this.deps.registrationRequestRepository.findById(input.requestId);
    if (!request) throw new RegistrationRequestNotFoundError();

    if (!canReviewRegistrationRequest(input.actor, request.batchId)) {
      throw new NotAuthorizedError("Not authorized to view this registration request");
    }

    return request;
  }
}
