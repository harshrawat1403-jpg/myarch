import { Prisma, type PrismaClient } from "@prisma/client";
import type {
  BootstrapInitialSecretaryRepository,
  BootstrapInitialSecretaryResult,
} from "../application/use-cases/bootstrap-initial-secretary";

/**
 * The administrative bootstrap is intentionally the only writer of the
 * initial Secretary. Serializable retries make concurrent invocations settle
 * on one committed account, while the nested profile write remains atomic.
 */
export class PrismaBootstrapInitialSecretaryRepository implements BootstrapInitialSecretaryRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async createIfNoSecretary(input: {
    readonly email: string;
    readonly passwordHash: string;
    readonly fullName: string;
    readonly emailVerifiedAt: Date;
  }): Promise<BootstrapInitialSecretaryResult> {
    let lastError: unknown;

    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        return await this.prisma.$transaction(
          async (tx) => {
            const existingEmail = await tx.user.findUnique({
              where: { email: input.email },
              select: { email: true, role: true },
            });
            if (existingEmail) {
              return existingEmail.role === "SECRETARY"
                ? { status: "already-exists", email: existingEmail.email }
                : { status: "email-already-exists", email: existingEmail.email };
            }

            const existingSecretary = await tx.user.findFirst({
              where: { role: "SECRETARY" },
              select: { email: true },
            });
            if (existingSecretary) return { status: "secretary-already-exists", email: existingSecretary.email };

            await tx.user.create({
              data: {
                email: input.email,
                passwordHash: input.passwordHash,
                role: "SECRETARY",
                emailVerifiedAt: input.emailVerifiedAt,
                secretaryProfile: { create: { fullName: input.fullName } },
              },
            });
            return { status: "created", email: input.email };
          },
          { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
        );
      } catch (error) {
        const retryable =
          error instanceof Prisma.PrismaClientKnownRequestError &&
          (error.code === "P2034" || (error.code === "P2010" && error.message.includes("Code: `40001`")));
        if (!retryable || attempt === 2) throw error;
        lastError = error;
        await new Promise<void>((resolve) => setTimeout(resolve, 25 * (attempt + 1)));
      }
    }

    throw lastError;
  }
}
