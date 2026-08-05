import type { AuthenticatedActor } from "@/modules/auth";
import { canViewPrivateProfile } from "@/modules/auth";
import { NotAuthorizedError } from "@/lib/errors";
import type { StudentRecord } from "../../domain/entities";
import { StudentNotFoundError } from "../../domain/errors";
import type { StudentRepository } from "../ports/student-repository";

export interface GetStudentInput {
  actor: AuthenticatedActor;
  studentId: string;
}

export class GetStudentUseCase {
  constructor(private readonly deps: { studentRepository: StudentRepository }) {}

  async execute(input: GetStudentInput): Promise<StudentRecord> {
    const student = await this.deps.studentRepository.findById(input.studentId);
    if (!student) {
      throw new StudentNotFoundError();
    }

    if (!canViewPrivateProfile(input.actor, student.batchId, student.id)) {
      throw new NotAuthorizedError("Not authorized to view this student");
    }

    return student;
  }
}
