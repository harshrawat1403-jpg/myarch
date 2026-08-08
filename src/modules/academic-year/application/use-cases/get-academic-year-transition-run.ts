import type { AuthenticatedActor } from "@/modules/auth";
import { canChangeBatchLifecycleStatus } from "@/modules/auth";
import { NotAuthorizedError } from "@/lib/errors";
import type { AcademicYearTransitionRunRecord } from "../../domain/entities";
import { AcademicYearTransitionRunNotFoundError } from "../../domain/errors";
import type { AcademicYearTransitionRunRepository } from "../ports/academic-year-transition-run-repository";

export interface GetAcademicYearTransitionRunInput {
  actor: AuthenticatedActor;
  runId: string;
}

export class GetAcademicYearTransitionRunUseCase {
  constructor(private readonly deps: { runRepository: AcademicYearTransitionRunRepository }) {}

  async execute(input: GetAcademicYearTransitionRunInput): Promise<AcademicYearTransitionRunRecord> {
    if (!canChangeBatchLifecycleStatus(input.actor)) {
      throw new NotAuthorizedError("Not authorized to view this transition run");
    }

    const run = await this.deps.runRepository.findById(input.runId);
    if (!run) throw new AcademicYearTransitionRunNotFoundError();
    return run;
  }
}
