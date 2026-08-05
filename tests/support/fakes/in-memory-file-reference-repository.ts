import crypto from "node:crypto";
import type { ConfidentialDocumentReference } from "../../../src/modules/students/domain/entities";
import type { FileReferenceRepository } from "../../../src/modules/students/application/ports/file-reference-repository";

interface StoredReference extends ConfidentialDocumentReference {
  studentId: string;
}

export class InMemoryFileReferenceRepository implements FileReferenceRepository {
  private readonly byId = new Map<string, StoredReference>();

  async attachConfidentialDocument(data: {
    studentId: string;
    ownerUserId: string;
    storageKey: string;
    mimeType: string;
    sizeBytes: number;
  }): Promise<ConfidentialDocumentReference> {
    const row: StoredReference = {
      id: crypto.randomUUID(),
      studentId: data.studentId,
      storageKey: data.storageKey,
      mimeType: data.mimeType,
      sizeBytes: data.sizeBytes,
      createdAt: new Date(),
    };
    this.byId.set(row.id, row);
    return row;
  }

  async listConfidentialDocuments(studentId: string): Promise<ConfidentialDocumentReference[]> {
    return [...this.byId.values()].filter((r) => r.studentId === studentId);
  }

  async removeConfidentialDocument(fileId: string, studentId: string): Promise<boolean> {
    const row = this.byId.get(fileId);
    if (!row || row.studentId !== studentId) return false;
    this.byId.delete(fileId);
    return true;
  }
}
