export interface BulkOperationResult<Id extends string = string> {
  readonly succeeded: readonly Id[];
  readonly failed: readonly { id: Id; error: string }[];
}

/**
 * Runs `op` for every id sequentially, collecting per-id success/failure
 * rather than failing the whole batch on the first error — used inside
 * Application-layer bulk use cases (BulkSetStudentsActiveUseCase,
 * BulkAssignCoordinatorBatchesUseCase, etc.), never called directly from a
 * route handler, so each use case still owns its own permission check and
 * audit record per id. Sequential rather than `Promise.all` so failures are
 * cleanly attributable to one id at a time and a slow/failing row can't
 * starve unrelated concurrent writes to the same tables.
 */
export async function runBulkOperation<Id extends string>(
  ids: readonly Id[],
  op: (id: Id) => Promise<void>,
): Promise<BulkOperationResult<Id>> {
  const succeeded: Id[] = [];
  const failed: { id: Id; error: string }[] = [];

  for (const id of ids) {
    try {
      await op(id);
      succeeded.push(id);
    } catch (err) {
      failed.push({ id, error: err instanceof Error ? err.message : "Unknown error" });
    }
  }

  return { succeeded, failed };
}
