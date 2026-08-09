import type { AuthenticatedActor } from "@/modules/auth";
import { canManageAlumni } from "@/modules/auth";
import { NotAuthorizedError } from "@/lib/errors";
import type { AlumniRecord } from "../../domain/entities";
import { AlumniNotFoundError } from "../../domain/errors";
import type { AlumniRepository } from "../ports/alumni-repository";

export interface GetAlumniInput {
  actor: AuthenticatedActor;
  alumniId: string;
}

export class GetAlumniUseCase {
  constructor(private readonly deps: { alumniRepository: AlumniRepository }) {}

  async execute(input: GetAlumniInput): Promise<AlumniRecord> {
    if (!canManageAlumni(input.actor)) {
      throw new NotAuthorizedError("Not authorized to view this alumni record");
    }
    const alumni = await this.deps.alumniRepository.findById(input.alumniId);
    if (!alumni) throw new AlumniNotFoundError();
    return alumni;
  }
}
