import type { PrismaTransactionClient } from "@/lib/prisma";
import type { AuthenticatedActor } from "../domain/entities";
import type { AuthUserRecord, UserRepository } from "../application/ports/user-repository";

export class PrismaUserRepository implements UserRepository {
  constructor(private readonly prisma: PrismaTransactionClient) {}

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
  ): Promise<Pick<AuthenticatedActor, "batchScope" | "permissions" | "studentProfileId">> {
    if (user.role === "COORDINATOR") {
      const coordinatorProfile = await this.prisma.coordinatorProfile.findUnique({
        where: { userId: user.id },
        include: { batchScopes: true },
      });
      return {
        batchScope: coordinatorProfile?.batchScopes.map((scope) => scope.batchId) ?? [],
        permissions: coordinatorProfile?.permissions ?? [],
      };
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

  async recordSuccessfulLogin(userId: string, at: Date): Promise<void> {
    await this.prisma.user.update({ where: { id: userId }, data: { lastLoginAt: at } });
  }

  async setPasswordAndForceChange(userId: string, passwordHash: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash, mustChangePassword: true },
    });
  }

  async setPassword(userId: string, passwordHash: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash, mustChangePassword: false },
    });
  }

  async updateEmail(userId: string, email: string): Promise<void> {
    await this.prisma.user.update({ where: { id: userId }, data: { email } });
  }

  async setAvatarFileId(userId: string, avatarFileId: string | null): Promise<void> {
    await this.prisma.user.update({ where: { id: userId }, data: { avatarFileId } });
  }

  async markEmailVerified(userId: string): Promise<void> {
    await this.prisma.user.update({ where: { id: userId }, data: { emailVerifiedAt: new Date() } });
  }
}

function toAuthUserRecord(user: {
  id: string;
  email: string;
  passwordHash: string;
  role: AuthUserRecord["role"];
  isActive: boolean;
  mustChangePassword: boolean;
  avatarFileId: string | null;
}): AuthUserRecord {
  return {
    id: user.id,
    email: user.email,
    passwordHash: user.passwordHash,
    role: user.role,
    isActive: user.isActive,
    mustChangePassword: user.mustChangePassword,
    avatarFileId: user.avatarFileId,
  };
}
