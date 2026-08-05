import type { AuthenticatedActor } from "@/modules/auth";
import { canEditPrivateAdminFields } from "@/modules/auth";
import { NotAuthorizedError } from "@/lib/errors";
import type { StudentRecord } from "../../domain/entities";
import { StudentAlreadyActiveError, StudentNotFoundError } from "../../domain/errors";
import type { StudentRepository } from "../ports/student-repository";

export interface RestoreStudentInput {
  actor: AuthenticatedActor;
  studentId: string;
}

export class RestoreStudentUseCase {
  constructor(private readonly deps: { studentRepository: StudentRepository }) {}

  async execute(input: RestoreStudentInput): Promise<StudentRecord> {
    const existing = await this.deps.studentRepository.findById(input.studentId);
    if (!existing) {
      throw new StudentNotFoundError();
    }

    if (!canEditPrivateAdminFields(input.actor, existing.batchId)) {
      throw new NotAuthorizedError("Not authorized to restore this student");
    }

    if (existing.isActive) {
      throw new StudentAlreadyActiveError();
    }

    return this.deps.studentRepository.setActive(input.studentId, true);
  }
}
