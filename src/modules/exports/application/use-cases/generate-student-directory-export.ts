import type { AuthenticatedActor } from "@/modules/auth";
import { NotAuthorizedError } from "@/lib/errors";
import type { StudentDirectoryRow } from "../../domain/entities";
import type { StudentDirectoryExportRepository } from "../ports/student-directory-export-repository";
import { resolveBatchScopedExportAccess } from "../authorize-export-scope";

export interface GenerateStudentDirectoryExportInput {
  actor: AuthenticatedActor;
}

export class GenerateStudentDirectoryExportUseCase {
  constructor(private readonly deps: { repository: StudentDirectoryExportRepository }) {}

  async execute(input: GenerateStudentDirectoryExportInput): Promise<StudentDirectoryRow[]> {
    const scope = resolveBatchScopedExportAccess(input.actor);
    if (!scope) {
      throw new NotAuthorizedError("Not authorized to export the student directory");
    }

    return this.deps.repository.fetch(scope);
  }
}
