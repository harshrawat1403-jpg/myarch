import type { RegisterableBatchLookup, RegisterableBatchOption } from "../ports/registerable-batch-lookup";

export class ListRegisterableBatchesUseCase {
  constructor(private readonly deps: { registerableBatchLookup: RegisterableBatchLookup }) {}

  async execute(): Promise<RegisterableBatchOption[]> {
    return this.deps.registerableBatchLookup.listOpenBatches();
  }
}
