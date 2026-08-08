import type { AuthenticatedActor } from "@/modules/auth";
import { canEditPrivateAdminFields } from "@/modules/auth";
import { NotAuthorizedError } from "@/lib/errors";
import type { BulkImportRunRecord } from "../../domain/entities";
import { BulkImportRunNotFoundError } from "../../domain/errors";
import type { BulkImportRunRepository } from "../ports/bulk-import-run-repository";

export interface GetBulkImportRunInput {
  actor: AuthenticatedActor;
  bulkImportRunId: string;
}

export class GetBulkImportRunUseCase {
  constructor(private readonly deps: { bulkImportRunRepository: BulkImportRunRepository }) {}

  async execute(input: GetBulkImportRunInput): Promise<BulkImportRunRecord> {
    const run = await this.deps.bulkImportRunRepository.findById(input.bulkImportRunId);
    if (!run) throw new BulkImportRunNotFoundError();

    if (!canEditPrivateAdminFields(input.actor, run.batchId)) {
      throw new NotAuthorizedError("Not authorized to view this import run");
    }

    return run;
  }
}
