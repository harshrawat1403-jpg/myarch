import type { RecruiterSelfLookup } from "../../../src/modules/recruiters/application/ports/recruiter-self-lookup";

export class FakeRecruiterSelfLookup implements RecruiterSelfLookup {
  private readonly byUserId = new Map<string, { id: string; companyName: string }>();

  seed(userId: string, recruiterProfileId: string, companyName = "Acme Architects"): void {
    this.byUserId.set(userId, { id: recruiterProfileId, companyName });
  }

  async findByUserId(userId: string): Promise<{ id: string; companyName: string } | null> {
    return this.byUserId.get(userId) ?? null;
  }
}
