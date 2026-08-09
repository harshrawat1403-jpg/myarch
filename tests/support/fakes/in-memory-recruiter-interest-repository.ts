import crypto from "node:crypto";
import type { RecruiterInterestRequestRecord, StudentInterestDTO } from "../../../src/modules/recruiters";
import type { RecruiterInterestRepository } from "../../../src/modules/recruiters/application/ports/recruiter-interest-repository";

export class InMemoryRecruiterInterestRepository implements RecruiterInterestRepository {
  private readonly byId = new Map<string, RecruiterInterestRequestRecord>();
  private readonly companyNameByRecruiterId = new Map<string, string>();

  seed(record: RecruiterInterestRequestRecord): void {
    this.byId.set(record.id, record);
  }

  /** V4.0 C3 — listForStudent's company-name join has no source row in this fake; tests that care about the value seed it here. */
  seedCompanyName(recruiterProfileId: string, companyName: string): void {
    this.companyNameByRecruiterId.set(recruiterProfileId, companyName);
  }

  async create(
    recruiterProfileId: string,
    studentProfileId: string,
    message: string | null,
  ): Promise<RecruiterInterestRequestRecord> {
    const record: RecruiterInterestRequestRecord = {
      id: crypto.randomUUID(),
      recruiterProfileId,
      studentProfileId,
      message,
      status: "SENT",
      sentAt: new Date(),
      respondedAt: null,
      completedAt: null,
    };
    this.byId.set(record.id, record);
    return record;
  }

  async findByRecruiterAndStudent(
    recruiterProfileId: string,
    studentProfileId: string,
  ): Promise<RecruiterInterestRequestRecord | null> {
    return (
      [...this.byId.values()].find(
        (r) => r.recruiterProfileId === recruiterProfileId && r.studentProfileId === studentProfileId,
      ) ?? null
    );
  }

  async findManyForRecruiter(
    recruiterProfileId: string,
    studentProfileIds: readonly string[],
  ): Promise<RecruiterInterestRequestRecord[]> {
    return [...this.byId.values()].filter(
      (r) => r.recruiterProfileId === recruiterProfileId && studentProfileIds.includes(r.studentProfileId),
    );
  }

  async listForRecruiter(recruiterProfileId: string): Promise<RecruiterInterestRequestRecord[]> {
    return [...this.byId.values()]
      .filter((r) => r.recruiterProfileId === recruiterProfileId)
      .sort((a, b) => b.sentAt.getTime() - a.sentAt.getTime());
  }

  async findById(id: string): Promise<RecruiterInterestRequestRecord | null> {
    return this.byId.get(id) ?? null;
  }

  async listForStudent(studentProfileId: string): Promise<StudentInterestDTO[]> {
    return [...this.byId.values()]
      .filter((r) => r.studentProfileId === studentProfileId)
      .sort((a, b) => b.sentAt.getTime() - a.sentAt.getTime())
      .map((r) => ({
        id: r.id,
        companyName: this.companyNameByRecruiterId.get(r.recruiterProfileId) ?? "Unknown Company",
        message: r.message,
        status: r.status,
        sentAt: r.sentAt,
        respondedAt: r.respondedAt,
      }));
  }

  async respond(id: string, status: "ACCEPTED" | "DECLINED", respondedAt: Date): Promise<RecruiterInterestRequestRecord> {
    const existing = this.byId.get(id);
    if (!existing) throw new Error(`No interest request with id ${id}`);
    const updated: RecruiterInterestRequestRecord = { ...existing, status, respondedAt };
    this.byId.set(id, updated);
    return updated;
  }
}
