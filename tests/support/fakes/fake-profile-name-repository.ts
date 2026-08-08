import type { Role } from "../../../src/modules/auth";
import type { ProfileNameRepository } from "../../../src/modules/auth/application/ports/profile-name-repository";

export class FakeProfileNameRepository implements ProfileNameRepository {
  readonly updates: { userId: string; role: Role; fullName: string }[] = [];
  private readonly namesByUserId = new Map<string, string>();

  seedFullName(userId: string, fullName: string): void {
    this.namesByUserId.set(userId, fullName);
  }

  async updateFullName(userId: string, role: Role, fullName: string): Promise<void> {
    this.updates.push({ userId, role, fullName });
    this.namesByUserId.set(userId, fullName);
  }

  async getFullName(userId: string): Promise<string | null> {
    return this.namesByUserId.get(userId) ?? null;
  }
}
