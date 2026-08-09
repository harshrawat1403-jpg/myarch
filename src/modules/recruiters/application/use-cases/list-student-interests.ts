import type { AuthenticatedActor } from "@/modules/auth";
import { NotAuthorizedError } from "@/lib/errors";
import type { StudentInterestDTO } from "../../domain/entities";
import type { RecruiterInterestRepository } from "../ports/recruiter-interest-repository";

/** V4.0 C3 — /student/interests. Self-service only; a student sees only requests directed at them. */
export class ListStudentInterestsUseCase {
  constructor(private readonly deps: { interestRepository: RecruiterInterestRepository }) {}

  async execute(actor: AuthenticatedActor): Promise<StudentInterestDTO[]> {
    if (actor.role !== "STUDENT" || !actor.studentProfileId) {
      throw new NotAuthorizedError("Not authorized to view interest requests");
    }
    return this.deps.interestRepository.listForStudent(actor.studentProfileId);
  }
}
