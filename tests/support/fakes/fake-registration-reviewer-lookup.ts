import type { RegistrationReviewerLookup } from "../../../src/modules/registration/application/ports/registration-reviewer-lookup";

export class FakeRegistrationReviewerLookup implements RegistrationReviewerLookup {
  private readonly reviewersByBatch = new Map<string, string[]>();
  private secretaries: string[] = [];

  seedReviewers(batchId: string, userIds: string[]): void {
    this.reviewersByBatch.set(batchId, userIds);
  }

  seedSecretaries(userIds: string[]): void {
    this.secretaries = userIds;
  }

  async listReviewerUserIds(batchId: string): Promise<string[]> {
    return this.reviewersByBatch.get(batchId) ?? [];
  }

  async listSecretaryUserIds(): Promise<string[]> {
    return this.secretaries;
  }
}
