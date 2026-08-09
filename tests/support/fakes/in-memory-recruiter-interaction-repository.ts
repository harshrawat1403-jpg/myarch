import type {
  RecruiterInteractionRecord,
  RecruiterInteractionRepository,
} from "../../../src/modules/recruiters/application/ports/recruiter-interaction-repository";

export class InMemoryRecruiterInteractionRepository implements RecruiterInteractionRepository {
  private readonly byKey = new Map<string, RecruiterInteractionRecord>();

  private key(recruiterProfileId: string, studentProfileId: string): string {
    return `${recruiterProfileId}:${studentProfileId}`;
  }

  seed(recruiterProfileId: string, record: RecruiterInteractionRecord): void {
    this.byKey.set(this.key(recruiterProfileId, record.studentProfileId), record);
  }

  async findManyForRecruiter(
    recruiterProfileId: string,
    studentProfileIds: readonly string[],
  ): Promise<RecruiterInteractionRecord[]> {
    return studentProfileIds
      .map((id) => this.byKey.get(this.key(recruiterProfileId, id)))
      .filter((r): r is RecruiterInteractionRecord => r !== undefined);
  }

  async findOneForRecruiter(
    recruiterProfileId: string,
    studentProfileId: string,
  ): Promise<RecruiterInteractionRecord | null> {
    return this.byKey.get(this.key(recruiterProfileId, studentProfileId)) ?? null;
  }

  async setSaved(recruiterProfileId: string, studentProfileId: string, saved: boolean): Promise<RecruiterInteractionRecord> {
    const existing = this.byKey.get(this.key(recruiterProfileId, studentProfileId));
    const updated: RecruiterInteractionRecord = {
      studentProfileId,
      isSaved: saved,
      isShortlisted: saved ? (existing?.isShortlisted ?? false) : false,
    };
    this.byKey.set(this.key(recruiterProfileId, studentProfileId), updated);
    return updated;
  }

  async setShortlisted(
    recruiterProfileId: string,
    studentProfileId: string,
    isShortlisted: boolean,
  ): Promise<RecruiterInteractionRecord> {
    const existing = this.byKey.get(this.key(recruiterProfileId, studentProfileId));
    const updated: RecruiterInteractionRecord = {
      studentProfileId,
      isSaved: existing?.isSaved ?? false,
      isShortlisted,
    };
    this.byKey.set(this.key(recruiterProfileId, studentProfileId), updated);
    return updated;
  }

  async listSavedForRecruiter(recruiterProfileId: string): Promise<RecruiterInteractionRecord[]> {
    return [...this.byKey.entries()]
      .filter(([key, record]) => key.startsWith(`${recruiterProfileId}:`) && record.isSaved)
      .map(([, record]) => record);
  }
}
