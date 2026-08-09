import type { StudentNameLookup } from "../../../src/modules/recruiters/application/ports/student-name-lookup";

export class FakeStudentNameLookup implements StudentNameLookup {
  private readonly names = new Map<string, string>();
  private readonly userIds = new Map<string, string>();

  seed(studentProfileId: string, fullName: string, userId = `user-${studentProfileId}`): void {
    this.names.set(studentProfileId, fullName);
    this.userIds.set(studentProfileId, userId);
  }

  async findFullNameById(studentProfileId: string): Promise<string | null> {
    return this.names.get(studentProfileId) ?? null;
  }

  async findUserIdById(studentProfileId: string): Promise<string | null> {
    return this.userIds.get(studentProfileId) ?? null;
  }
}
