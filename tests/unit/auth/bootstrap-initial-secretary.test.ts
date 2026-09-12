import { describe, expect, it, vi } from "vitest";
import {
  BootstrapInitialSecretaryUseCase,
  InvalidBootstrapAdminInputError,
  parseBootstrapInitialSecretaryInput,
  type BootstrapInitialSecretaryRepository,
} from "../../../src/modules/auth/application/use-cases/bootstrap-initial-secretary";
import type { PasswordHasher } from "../../../src/modules/auth/application/ports/password-hasher";

const strongEnvironment = {
  BOOTSTRAP_ADMIN_EMAIL: "Secretary@vnit.ac.in",
  BOOTSTRAP_ADMIN_PASSWORD: "StrongBootstrapPassword1!",
  BOOTSTRAP_ADMIN_NAME: "Initial Secretary",
};

function passwordHasher(): PasswordHasher {
  return {
    dummyHash: "unused",
    hash: vi.fn(async () => "hashed-password"),
    compare: vi.fn(async () => false),
  };
}

describe("initial Secretary bootstrap", () => {
  it("parses and normalizes the required secure environment input", () => {
    expect(parseBootstrapInitialSecretaryInput(strongEnvironment)).toEqual({
      email: "secretary@vnit.ac.in",
      password: "StrongBootstrapPassword1!",
      fullName: "Initial Secretary",
    });
  });

  it.each([
    [{ ...strongEnvironment, BOOTSTRAP_ADMIN_PASSWORD: "Password123!" }],
    [{ ...strongEnvironment, BOOTSTRAP_ADMIN_PASSWORD: "weak" }],
    [{ ...strongEnvironment, BOOTSTRAP_ADMIN_EMAIL: "" }],
  ])("refuses missing, weak, and default bootstrap credentials", (environment) => {
    expect(() => parseBootstrapInitialSecretaryInput(environment)).toThrow(InvalidBootstrapAdminInputError);
  });

  it("creates one verified Secretary account with a role profile", async () => {
    const createIfNoSecretary = vi.fn<BootstrapInitialSecretaryRepository["createIfNoSecretary"]>(async (input) => {
      expect(input).toEqual({
        email: "secretary@vnit.ac.in",
        passwordHash: "hashed-password",
        fullName: "Initial Secretary",
        emailVerifiedAt: new Date("2026-09-12T00:00:00.000Z"),
      });
      return { status: "created", email: input.email };
    });
    const hasher = passwordHasher();
    const useCase = new BootstrapInitialSecretaryUseCase({
      repository: { createIfNoSecretary },
      passwordHasher: hasher,
      now: () => new Date("2026-09-12T00:00:00.000Z"),
    });

    await expect(useCase.execute(parseBootstrapInitialSecretaryInput(strongEnvironment))).resolves.toEqual({
      status: "created",
      email: "secretary@vnit.ac.in",
    });
    expect(hasher.hash).toHaveBeenCalledWith("StrongBootstrapPassword1!");
  });

  it("preserves the existing account on a rerun", async () => {
    const createIfNoSecretary = vi.fn<BootstrapInitialSecretaryRepository["createIfNoSecretary"]>(async () => ({
      status: "already-exists",
      email: "secretary@vnit.ac.in",
    }));
    const useCase = new BootstrapInitialSecretaryUseCase({
      repository: { createIfNoSecretary },
      passwordHasher: passwordHasher(),
      now: () => new Date(),
    });

    await expect(useCase.execute(parseBootstrapInitialSecretaryInput(strongEnvironment))).resolves.toEqual({
      status: "already-exists",
      email: "secretary@vnit.ac.in",
    });
    expect(createIfNoSecretary).toHaveBeenCalledTimes(1);
  });
});
