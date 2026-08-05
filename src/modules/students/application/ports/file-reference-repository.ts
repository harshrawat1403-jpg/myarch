import type { ConfidentialDocumentReference } from "../../domain/entities";

/**
 * Metadata/reference handling only, per this phase's explicit scope — no
 * actual file upload storage is implemented here. A caller has already
 * uploaded bytes to object storage through some other mechanism (not yet
 * built) and is only registering the resulting reference
 * (docs/architecture/06_Technology_Stack.md's object-storage decision).
 */
export interface FileReferenceRepository {
  attachConfidentialDocument(data: {
    /** StudentProfile.id — the repository resolves the linked private profile itself. */
    studentId: string;
    ownerUserId: string;
    storageKey: string;
    mimeType: string;
    sizeBytes: number;
  }): Promise<ConfidentialDocumentReference>;

  listConfidentialDocuments(studentId: string): Promise<ConfidentialDocumentReference[]>;

  removeConfidentialDocument(fileId: string, studentId: string): Promise<boolean>;
}
