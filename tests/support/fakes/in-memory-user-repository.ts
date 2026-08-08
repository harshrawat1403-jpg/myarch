import type { AuthenticatedActor } from "@/modules/auth";
import type { AuthUserRecord, UserRepository } from "../../../src/modules/auth/application/ports/user-repository";

export class InMemoryUserRepository implements UserRepository {
  private readonly usersById = new Map<string, AuthUserRecord>();
  private readonly scopesById = new Map<
    string,
    Pick<AuthenticatedActor, "batchScope" | "studentProfileId">
  >();
  private readonly lastLoginByUserId = new Map<string, Date>();

  seed(
    user: AuthUserRecord,
    scope: Pick<AuthenticatedActor, "batchScope" | "studentProfileId"> = {},
  ): void {
    this.usersById.set(user.id, user);
    this.scopesById.set(user.id, scope);
  }

  async findByEmail(email: string): Promise<AuthUserRecord | null> {
    for (const user of this.usersById.values()) {
      if (user.email === email) return user;
    }
    return null;
  }

  async findById(id: string): Promise<AuthUserRecord | null> {
    return this.usersById.get(id) ?? null;
  }

  async loadActorScope(
    user: AuthUserRecord,
  ): Promise<Pick<AuthenticatedActor, "batchScope" | "studentProfileId">> {
    return this.scopesById.get(user.id) ?? {};
  }

  async recordSuccessfulLogin(userId: string, at: Date): Promise<void> {
    this.lastLoginByUserId.set(userId, at);
  }

  /** Test-only accessor for asserting a login was recorded. */
  getLastLoginAt(userId: string): Date | undefined {
    return this.lastLoginByUserId.get(userId);
  }

  async setPasswordAndForceChange(userId: string, passwordHash: string): Promise<void> {
    const user = this.usersById.get(userId);
    if (!user) return;
    this.usersById.set(userId, { ...user, passwordHash, mustChangePassword: true });
  }

  async setPassword(userId: string, passwordHash: string): Promise<void> {
    const user = this.usersById.get(userId);
    if (!user) return;
    this.usersById.set(userId, { ...user, passwordHash, mustChangePassword: false });
  }

  async updateEmail(userId: string, email: string): Promise<void> {
    const user = this.usersById.get(userId);
    if (!user) return;
    this.usersById.set(userId, { ...user, email });
  }

  async setAvatarFileId(userId: string, avatarFileId: string | null): Promise<void> {
    const user = this.usersById.get(userId);
    if (!user) return;
    this.usersById.set(userId, { ...user, avatarFileId });
  }

  /** Test-only accessor. */
  getAvatarFileId(userId: string): string | null | undefined {
    return this.usersById.get(userId)?.avatarFileId;
  }
}
