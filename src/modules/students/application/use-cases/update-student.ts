import type { AuthenticatedActor } from "@/modules/auth";
import { canEditPrivateAdminFields } from "@/modules/auth";
import { NotAuthorizedError } from "@/lib/errors";
import type { StudentPrivateFields, StudentRecord } from "../../domain/entities";
import { BatchNotAssignableError, BatchNotFoundError, StudentNotFoundError } from "../../domain/errors";
import type { BatchLookup } from "../ports/batch-lookup";
import type { StudentRepository } from "../ports/student-repository";

export interface UpdateStudentInput {
  actor: AuthenticatedActor;
  studentId: string;
  fullName?: string;
  /** Reassign the student to a different batch — validated the same way as at creation. */
  batchId?: string;
  private?: Partial<StudentPrivateFields>;
}

export class UpdateStudentUseCase {
  constructor(
    private readonly deps: { studentRepository: StudentRepository; batchLookup: BatchLookup },
  ) {}

  async execute(input: UpdateStudentInput): Promise<StudentRecord> {
    const existing = await this.deps.studentRepository.findById(input.studentId);
    if (!existing) {
      throw new StudentNotFoundError();
    }

    // Authorized against the student's CURRENT batch — a Coordinator cannot
    // reach a student outside their scope just to reassign them elsewhere.
    if (!canEditPrivateAdminFields(input.actor, existing.batchId)) {
      throw new NotAuthorizedError("Not authorized to update this student");
    }

    if (input.batchId && input.batchId !== existing.batchId) {
      // Reassignment must ALSO be authorized against the destination batch —
      // a Coordinator cannot move a student into a batch outside their scope.
      if (!canEditPrivateAdminFields(input.actor, input.batchId)) {
        throw new NotAuthorizedError("Not authorized to assign students to the destination batch");
      }

      const destinationBatch = await this.deps.batchLookup.findById(input.batchId);
      if (!destinationBatch) {
        throw new BatchNotFoundError();
      }
      if (destinationBatch.status === "ARCHIVED") {
        throw new BatchNotAssignableError("the destination batch is archived");
      }
    }

    return this.deps.studentRepository.update(input.studentId, {
      fullName: input.fullName,
      batchId: input.batchId,
      private: input.private,
      actorUserId: input.actor.userId,
    });
  }
}
