import type { AuthenticatedActor } from "@/modules/auth";
import type { AuthUserRecord, UserRepository } from "../../../src/modules/auth/application/ports/user-repository";

export class InMemoryUserRepository implements UserRepository {
  private readonly usersById = new Map<string, AuthUserRecord>();
  private readonly scopesById = new Map<
    string,
    Pick<AuthenticatedActor, "batchScope" | "studentProfileId">
  >();

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
}
