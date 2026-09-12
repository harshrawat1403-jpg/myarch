import { hashPassword } from "@/modules/auth";
import {
  BootstrapInitialSecretaryUseCase,
  InvalidBootstrapAdminInputError,
  parseBootstrapInitialSecretaryInput,
} from "@/modules/auth/application/use-cases/bootstrap-initial-secretary";
import { PrismaBootstrapInitialSecretaryRepository } from "@/modules/auth/infrastructure/prisma-bootstrap-initial-secretary-repository";
import { prisma } from "@/lib/prisma";

async function main(): Promise<void> {
  const input = parseBootstrapInitialSecretaryInput({
    BOOTSTRAP_ADMIN_EMAIL: process.env.BOOTSTRAP_ADMIN_EMAIL,
    BOOTSTRAP_ADMIN_PASSWORD: process.env.BOOTSTRAP_ADMIN_PASSWORD,
    BOOTSTRAP_ADMIN_NAME: process.env.BOOTSTRAP_ADMIN_NAME,
  });
  const bootstrap = new BootstrapInitialSecretaryUseCase({
    repository: new PrismaBootstrapInitialSecretaryRepository(prisma),
    passwordHasher: { hash: hashPassword },
    now: () => new Date(),
  });
  const result = await bootstrap.execute(input);

  if (result.status === "created") {
    console.log(`Initial Secretary account created for ${result.email}.`);
    return;
  }
  if (result.status === "already-exists") {
    console.log(`Initial Secretary account already exists for ${result.email}; no changes made.`);
    return;
  }
  if (result.status === "email-already-exists") {
    console.error("Bootstrap refused: the requested email already belongs to a non-Secretary account.");
    process.exitCode = 1;
    return;
  }

  console.error("Bootstrap refused: an initial Secretary account already exists; no changes made.");
  process.exitCode = 1;
}

main()
  .catch((error: unknown) => {
    if (error instanceof InvalidBootstrapAdminInputError) {
      console.error(`Bootstrap refused: ${error.message}`);
    } else {
      console.error("Admin bootstrap failed. No credentials were logged.");
    }
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
