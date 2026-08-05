import type { AuthenticatedActor } from "@/modules/auth";
import { NotAuthorizedError } from "@/lib/errors";
import type { BatchReportRow } from "../../domain/entities";
import type { BatchReportExportRepository } from "../ports/batch-report-export-repository";
import { resolveBatchScopedExportAccess } from "../authorize-export-scope";

export interface GenerateBatchReportExportInput {
  actor: AuthenticatedActor;
}

export class GenerateBatchReportExportUseCase {
  constructor(private readonly deps: { repository: BatchReportExportRepository }) {}

  async execute(input: GenerateBatchReportExportInput): Promise<BatchReportRow[]> {
    const scope = resolveBatchScopedExportAccess(input.actor);
    if (!scope) {
      throw new NotAuthorizedError("Not authorized to export the batch report");
    }

    return this.deps.repository.fetch(scope);
  }
}
