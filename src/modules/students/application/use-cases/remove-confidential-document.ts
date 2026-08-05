import type { AuthenticatedActor } from "@/modules/auth";
import { canEditPrivateAdminFields } from "@/modules/auth";
import { NotAuthorizedError } from "@/lib/errors";
import { ConfidentialDocumentNotFoundError, StudentNotFoundError } from "../../domain/errors";
import type { FileReferenceRepository } from "../ports/file-reference-repository";
import type { StudentRepository } from "../ports/student-repository";

export interface RemoveConfidentialDocumentInput {
  actor: AuthenticatedActor;
  studentId: string;
  fileId: string;
}

export class RemoveConfidentialDocumentUseCase {
  constructor(
    private readonly deps: {
      studentRepository: StudentRepository;
      fileReferenceRepository: FileReferenceRepository;
    },
  ) {}

  async execute(input: RemoveConfidentialDocumentInput): Promise<void> {
    const student = await this.deps.studentRepository.findById(input.studentId);
    if (!student) {
      throw new StudentNotFoundError();
    }

    if (!canEditPrivateAdminFields(input.actor, student.batchId)) {
      throw new NotAuthorizedError("Not authorized to remove documents for this student");
    }

    const removed = await this.deps.fileReferenceRepository.removeConfidentialDocument(
      input.fileId,
      student.id,
    );
    if (!removed) {
      throw new ConfidentialDocumentNotFoundError();
    }
  }
}
