import type { PrismaClient } from "@prisma/client";
import type { AuthenticatedActor } from "../domain/entities";
import type { AuthUserRecord, UserRepository } from "../application/ports/user-repository";

export class PrismaUserRepository implements UserRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findByEmail(email: string): Promise<AuthUserRecord | null> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    return user ? toAuthUserRecord(user) : null;
  }

  async findById(id: string): Promise<AuthUserRecord | null> {
    const user = await this.prisma.user.findUnique({ where: { id } });
    return user ? toAuthUserRecord(user) : null;
  }

  async loadActorScope(
    user: AuthUserRecord,
  ): Promise<Pick<AuthenticatedActor, "batchScope" | "studentProfileId">> {
    if (user.role === "COORDINATOR") {
      const coordinatorProfile = await this.prisma.coordinatorProfile.findUnique({
        where: { userId: user.id },
        include: { batchScopes: true },
      });
      return { batchScope: coordinatorProfile?.batchScopes.map((scope) => scope.batchId) ?? [] };
    }

    if (user.role === "STUDENT") {
      const studentProfile = await this.prisma.studentProfile.findUnique({
        where: { userId: user.id },
      });
      return { studentProfileId: studentProfile?.id };
    }

    // SECRETARY is unscoped by design; RECRUITER carries no batch/profile scope in Phase 1.
    return {};
  }
}

function toAuthUserRecord(user: {
  id: string;
  email: string;
  passwordHash: string;
  role: AuthUserRecord["role"];
  isActive: boolean;
}): AuthUserRecord {
  return {
    id: user.id,
    email: user.email,
    passwordHash: user.passwordHash,
    role: user.role,
    isActive: user.isActive,
  };
}
