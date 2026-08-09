export interface RegisterableBatchOption {
  readonly id: string;
  readonly name: string;
}

/** Public, unauthenticated — deliberately returns only id/name for ACTIVE batches, never the full Batch shape the authenticated /api/batches endpoint returns. */
export interface RegisterableBatchLookup {
  listOpenBatches(): Promise<RegisterableBatchOption[]>;
}
