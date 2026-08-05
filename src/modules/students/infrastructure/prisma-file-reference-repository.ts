import type { FileAsset, PrismaClient } from "@prisma/client";
import type { ConfidentialDocumentReference } from "../domain/entities";
import type { FileReferenceRepository } from "../application/ports/file-reference-repository";

export class PrismaFileReferenceRepository implements FileReferenceRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async attachConfidentialDocument(data: {
    studentId: string;
    ownerUserId: string;
    storageKey: string;
    mimeType: string;
    sizeBytes: number;
  }): Promise<ConfidentialDocumentReference> {
    const privateProfile = await this.prisma.studentPrivateProfile.findUniqueOrThrow({
      where: { studentProfileId: data.studentId },
      select: { id: true },
    });

    const row = await this.prisma.fileAsset.create({
      data: {
        ownerUserId: data.ownerUserId,
        storageKey: data.storageKey,
        mimeType: data.mimeType,
        sizeBytes: data.sizeBytes,
        classification: "PRIVATE",
        confidentialOfPrivateProfileId: privateProfile.id,
      },
    });
    return toDomain(row);
  }

  async listConfidentialDocuments(studentId: string): Promise<ConfidentialDocumentReference[]> {
    const rows = await this.prisma.fileAsset.findMany({
      where: { confidentialOfPrivateProfile: { studentProfileId: studentId } },
      orderBy: { createdAt: "desc" },
    });
    return rows.map(toDomain);
  }

  async removeConfidentialDocument(fileId: string, studentId: string): Promise<boolean> {
    const result = await this.prisma.fileAsset.deleteMany({
      where: { id: fileId, confidentialOfPrivateProfile: { studentProfileId: studentId } },
    });
    return result.count > 0;
  }
}

function toDomain(row: FileAsset): ConfidentialDocumentReference {
  return {
    id: row.id,
    storageKey: row.storageKey,
    mimeType: row.mimeType,
    sizeBytes: row.sizeBytes,
    createdAt: row.createdAt,
  };
}
