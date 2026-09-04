export interface CommitteeLookup {
  exists(id: string): Promise<boolean>;
}

