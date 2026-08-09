import type { RecruiterInterestRequestRecord, StudentInterestDTO } from "../../domain/entities";

export interface RecruiterInterestRepository {
  /** Idempotent from the caller's point of view — ExpressInterestUseCase decides whether to call this or just return the existing row (see its own doc comment). */
  create(recruiterProfileId: string, studentProfileId: string, message: string | null): Promise<RecruiterInterestRequestRecord>;
  findByRecruiterAndStudent(
    recruiterProfileId: string,
    studentProfileId: string,
  ): Promise<RecruiterInterestRequestRecord | null>;
  findManyForRecruiter(
    recruiterProfileId: string,
    studentProfileIds: readonly string[],
  ): Promise<RecruiterInterestRequestRecord[]>;
  /** For /recruiter/interests (C4). */
  listForRecruiter(recruiterProfileId: string): Promise<RecruiterInterestRequestRecord[]>;
  /** V4.0 C3 — RespondToInterestUseCase's ownership/status check reads the raw record (not the student-facing DTO) before mutating. */
  findById(id: string): Promise<RecruiterInterestRequestRecord | null>;
  /** V4.0 C3 — the student's own inbox at /student/interests, pre-joined to the recruiter's company name (see StudentInterestDTO's doc comment on why never more than that). */
  listForStudent(studentProfileId: string): Promise<StudentInterestDTO[]>;
  /** V4.0 C3 — accept/decline transition. Caller (the use case) is responsible for enforcing the SENT-only precondition; this method just performs the write. */
  respond(id: string, status: "ACCEPTED" | "DECLINED", respondedAt: Date): Promise<RecruiterInterestRequestRecord>;
}
