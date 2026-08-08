import type { AdminResetPasswordInput, AdminResetPasswordResult, AuthenticatedActor } from "@/modules/auth";
import { StudentNotFoundError } from "../../domain/errors";
import type { StudentRepository } from "../ports/student-repository";

export interface ResetStudentPasswordInput {
  actor: AuthenticatedActor;
  studentId: string;
}

export interface ResetStudentPasswordResult {
  tempPassword: string;
}

export interface ResetStudentPasswordUseCaseDeps {
  studentRepository: StudentRepository;
  /** Injected — see ResetCoordinatorPasswordUseCase's identical dependency for the reasoning. */
  resetPassword: (input: AdminResetPasswordInput) => Promise<AdminResetPasswordResult>;
}

/** Thin wrapper delegating to auth's single shared AdminResetPasswordUseCase — mirrors coordinators'/recruiters' reset-password.ts. */
export class ResetStudentPasswordUseCase {
  constructor(private readonly deps: ResetStudentPasswordUseCaseDeps) {}

  async execute(input: ResetStudentPasswordInput): Promise<ResetStudentPasswordResult> {
    const student = await this.deps.studentRepository.findById(input.studentId);
    if (!student) throw new StudentNotFoundError();

    const result = await this.deps.resetPassword({
      actor: input.actor,
      targetUserId: student.userId,
      targetRole: "STUDENT",
      targetBatchId: student.batchId,
      recipientName: student.fullName,
    });

    return { tempPassword: result.tempPassword };
  }
}
