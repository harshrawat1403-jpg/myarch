import type { AuthenticatedActor } from "@/modules/auth";
import { canEditPrivateAdminFields } from "@/modules/auth";
import { NotAuthorizedError } from "@/lib/errors";
import type { StudentRecord } from "../../domain/entities";
import { StudentAlreadyArchivedError, StudentNotFoundError } from "../../domain/errors";
import type { StudentRepository } from "../ports/student-repository";

export interface ArchiveStudentInput {
  actor: AuthenticatedActor;
  studentId: string;
}

/**
 * Soft-delete only — never a hard delete (docs/database/08_Database_Design.md
 * retention model, `03_Functional_Requirements.md` FR-STUD-01/FR-STUD-06).
 * Also deactivates the student's login (User.isActive), so an archived
 * roster record can't keep editing its own profile — see the module's
 * infrastructure layer for why this is a single transaction.
 */
export class ArchiveStudentUseCase {
  constructor(private readonly deps: { studentRepository: StudentRepository }) {}

  async execute(input: ArchiveStudentInput): Promise<StudentRecord> {
    const existing = await this.deps.studentRepository.findById(input.studentId);
    if (!existing) {
      throw new StudentNotFoundError();
    }

    if (!canEditPrivateAdminFields(input.actor, existing.batchId)) {
      throw new NotAuthorizedError("Not authorized to archive this student");
    }

    if (!existing.isActive) {
      throw new StudentAlreadyArchivedError();
    }

    return this.deps.studentRepository.setActive(input.studentId, false);
  }
}
