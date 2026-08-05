import type { AuthenticatedActor } from "@/modules/auth";
import { canViewPrivateProfile } from "@/modules/auth";
import { NotAuthorizedError } from "@/lib/errors";
import type { ConfidentialDocumentReference } from "../../domain/entities";
import { StudentNotFoundError } from "../../domain/errors";
import type { FileReferenceRepository } from "../ports/file-reference-repository";
import type { StudentRepository } from "../ports/student-repository";

export interface ListConfidentialDocumentsInput {
  actor: AuthenticatedActor;
  studentId: string;
}

export class ListConfidentialDocumentsUseCase {
  constructor(
    private readonly deps: {
      studentRepository: StudentRepository;
      fileReferenceRepository: FileReferenceRepository;
    },
  ) {}

  async execute(
    input: ListConfidentialDocumentsInput,
  ): Promise<ConfidentialDocumentReference[]> {
    const student = await this.deps.studentRepository.findById(input.studentId);
    if (!student) {
      throw new StudentNotFoundError();
    }

    if (!canViewPrivateProfile(input.actor, student.batchId, student.id)) {
      throw new NotAuthorizedError("Not authorized to view documents for this student");
    }

    return this.deps.fileReferenceRepository.listConfidentialDocuments(student.id);
  }
}
