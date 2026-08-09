import type {
  StudentEligibilityData,
  StudentEligibilityLookup,
} from "../../../src/modules/placements/application/ports/student-eligibility-lookup";

export class FakeStudentEligibilityLookup implements StudentEligibilityLookup {
  private readonly byId = new Map<string, StudentEligibilityData>();

  seed(studentProfileId: string, data: StudentEligibilityData): void {
    this.byId.set(studentProfileId, data);
  }

  async findByStudentProfileId(studentProfileId: string): Promise<StudentEligibilityData | null> {
    return this.byId.get(studentProfileId) ?? null;
  }

  async listUserIdsForBatches(batchIds: readonly string[]): Promise<string[]> {
    const all = [...this.byId.values()];
    const matching = batchIds.length > 0 ? all.filter((s) => batchIds.includes(s.batchId)) : all;
    return matching.map((s) => s.userId);
  }
}
