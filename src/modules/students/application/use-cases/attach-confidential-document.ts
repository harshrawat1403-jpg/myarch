import type { AuthenticatedActor } from "@/modules/auth";
import { canEditPrivateAdminFields } from "@/modules/auth";
import { NotAuthorizedError } from "@/lib/errors";
import type { ConfidentialDocumentReference } from "../../domain/entities";
import { StudentNotFoundError } from "../../domain/errors";
import type { FileReferenceRepository } from "../ports/file-reference-repository";
import type { StudentRepository } from "../ports/student-repository";

export interface AttachConfidentialDocumentInput {
  actor: AuthenticatedActor;
  studentId: string;
  storageKey: string;
  mimeType: string;
  sizeBytes: number;
}

/**
 * Registers a reference to a file already uploaded to object storage by
 * some other, not-yet-built mechanism — metadata only, per this phase's
 * explicit scope (no upload storage implemented here).
 */
export class AttachConfidentialDocumentUseCase {
  constructor(
    private readonly deps: {
      studentRepository: StudentRepository;
      fileReferenceRepository: FileReferenceRepository;
    },
  ) {}

  async execute(input: AttachConfidentialDocumentInput): Promise<ConfidentialDocumentReference> {
    const student = await this.deps.studentRepository.findById(input.studentId);
    if (!student) {
      throw new StudentNotFoundError();
    }

    if (!canEditPrivateAdminFields(input.actor, student.batchId)) {
      throw new NotAuthorizedError("Not authorized to attach documents for this student");
    }

    return this.deps.fileReferenceRepository.attachConfidentialDocument({
      studentId: student.id,
      ownerUserId: student.userId,
      storageKey: input.storageKey,
      mimeType: input.mimeType,
      sizeBytes: input.sizeBytes,
    });
  }
}
