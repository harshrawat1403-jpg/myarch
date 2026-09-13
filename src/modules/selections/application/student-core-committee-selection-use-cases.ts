import type { AuthenticatedActor } from "@/modules/auth";
import { NotAuthorizedError } from "@/lib/errors";
import type { FormApplicationRecord } from "@/modules/applications/domain/entities";
import { CoreCommitteeSelectionError } from "../domain/core-committee-selection";
import type {
  StudentCoreCommitteeSelectionDetail,
  StudentCoreCommitteeSelectionSummary,
} from "../domain/entities";
import type { CoreCommitteeSelectionRepository } from "./ports/core-committee-selection-repository";

interface CoreCommitteeApplicationSubmitter {
  execute(input: {
    actor: AuthenticatedActor;
    formId: string;
    answers: Record<string, unknown>;
    coreCommitteeSelectionPositionIds: readonly string[];
    allowCoreCommitteeSelectionForm: true;
  }): Promise<FormApplicationRecord>;
}

function requireStudent(actor: AuthenticatedActor): void {
  if (actor.role !== "STUDENT")
    throw new NotAuthorizedError("Only students may access Core Committee applications");
}

/** Student-only projection and submission boundary for Core-owned intake forms. */
export class StudentCoreCommitteeSelectionUseCases {
  constructor(
    private readonly repository: CoreCommitteeSelectionRepository,
    private readonly submitter: CoreCommitteeApplicationSubmitter,
  ) {}

  async list(actor: AuthenticatedActor): Promise<StudentCoreCommitteeSelectionSummary[]> {
    requireStudent(actor);
    return this.repository.listForStudent(actor.userId);
  }

  async get(actor: AuthenticatedActor, selectionId: string): Promise<StudentCoreCommitteeSelectionDetail> {
    requireStudent(actor);
    const selection = await this.repository.getForStudent(selectionId, actor.userId);
    if (!selection) throw new CoreCommitteeSelectionError("Core Committee selection not found", "notFound");
    return selection;
  }

  async submit(input: {
    actor: AuthenticatedActor;
    selectionId: string;
    positionId: string;
    answers: Record<string, unknown>;
  }): Promise<FormApplicationRecord> {
    requireStudent(input.actor);
    const formId = await this.repository.getStudentApplicationFormId(input.selectionId);
    if (!formId)
      throw new CoreCommitteeSelectionError("Core Committee application is not available", "notFound");
    return this.submitter.execute({
      actor: input.actor,
      formId,
      answers: input.answers,
      coreCommitteeSelectionPositionIds: [input.positionId],
      allowCoreCommitteeSelectionForm: true,
    });
  }
}
