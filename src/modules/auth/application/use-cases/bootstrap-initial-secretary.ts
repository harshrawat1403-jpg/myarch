import { z } from "zod";
import { isStrongEnoughPassword, PASSWORD_STRENGTH_MESSAGE } from "../../domain/password-policy";
import type { PasswordHasher } from "../ports/password-hasher";

const DEFAULT_BOOTSTRAP_PASSWORDS = new Set([
  "password",
  "password123",
  "password123!",
  "admin",
  "admin123",
  "admin123!",
  "changeme",
  "changeme123",
  "changeme123!",
  "secretary",
  "myarch",
  "tnparch",
]);

const bootstrapInputSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().refine(isStrongEnoughPassword, { message: PASSWORD_STRENGTH_MESSAGE }),
  fullName: z.string().trim().min(1).max(200),
});

export interface BootstrapInitialSecretaryInput {
  readonly email: string;
  readonly password: string;
  readonly fullName: string;
}

export interface BootstrapInitialSecretaryRepository {
  createIfNoSecretary(input: {
    readonly email: string;
    readonly passwordHash: string;
    readonly fullName: string;
    readonly emailVerifiedAt: Date;
  }): Promise<BootstrapInitialSecretaryResult>;
}

export type BootstrapInitialSecretaryResult =
  | { readonly status: "created"; readonly email: string }
  | { readonly status: "already-exists"; readonly email: string }
  | { readonly status: "secretary-already-exists"; readonly email: string }
  | { readonly status: "email-already-exists"; readonly email: string };

export class InvalidBootstrapAdminInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidBootstrapAdminInputError";
  }
}

/**
 * Parses the one-time bootstrap variables without ever returning or logging
 * their plaintext password outside the command's in-memory execution path.
 */
export function parseBootstrapInitialSecretaryInput(
  environment: Readonly<
    Partial<Record<"BOOTSTRAP_ADMIN_EMAIL" | "BOOTSTRAP_ADMIN_PASSWORD" | "BOOTSTRAP_ADMIN_NAME", string>>
  >,
): BootstrapInitialSecretaryInput {
  const email = environment.BOOTSTRAP_ADMIN_EMAIL;
  const password = environment.BOOTSTRAP_ADMIN_PASSWORD;
  const fullName = environment.BOOTSTRAP_ADMIN_NAME;

  if (!email || !password || !fullName) {
    throw new InvalidBootstrapAdminInputError(
      "BOOTSTRAP_ADMIN_EMAIL, BOOTSTRAP_ADMIN_PASSWORD, and BOOTSTRAP_ADMIN_NAME are required",
    );
  }

  const parsed = bootstrapInputSchema.safeParse({ email, password, fullName });
  if (!parsed.success) {
    throw new InvalidBootstrapAdminInputError("Bootstrap admin email, password, or name is invalid");
  }
  if (DEFAULT_BOOTSTRAP_PASSWORDS.has(parsed.data.password.toLowerCase())) {
    throw new InvalidBootstrapAdminInputError("BOOTSTRAP_ADMIN_PASSWORD must not use a known default password");
  }

  return {
    email: parsed.data.email.toLowerCase(),
    password: parsed.data.password,
    fullName: parsed.data.fullName,
  };
}

export class BootstrapInitialSecretaryUseCase {
  constructor(
    private readonly deps: {
      readonly repository: BootstrapInitialSecretaryRepository;
      readonly passwordHasher: Pick<PasswordHasher, "hash">;
      readonly now: () => Date;
    },
  ) {}

  async execute(input: BootstrapInitialSecretaryInput): Promise<BootstrapInitialSecretaryResult> {
    const passwordHash = await this.deps.passwordHasher.hash(input.password);
    return this.deps.repository.createIfNoSecretary({
      email: input.email,
      passwordHash,
      fullName: input.fullName,
      emailVerifiedAt: this.deps.now(),
    });
  }
}
