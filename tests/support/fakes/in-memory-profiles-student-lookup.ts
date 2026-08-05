import type { StudentLookup } from "../../../src/modules/profiles/application/ports/student-lookup";

export class InMemoryProfilesStudentLookup implements StudentLookup {
  private readonly byId = new Map<string, { id: string; batchId: string; userId: string; fullName: string }>();

  seed(student: { id: string; batchId: string; userId: string; fullName?: string }): void {
    this.byId.set(student.id, { fullName: "Test Student", ...student });
  }

  async findById(id: string): Promise<{ id: string; batchId: string; userId: string; fullName: string } | null> {
    return this.byId.get(id) ?? null;
  }
}
