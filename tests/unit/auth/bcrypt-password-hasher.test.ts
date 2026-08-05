import { describe, expect, it } from "vitest";
import { BcryptPasswordHasher } from "../../../src/modules/auth/infrastructure/bcrypt-password-hasher";

describe("BcryptPasswordHasher", () => {
  it("rejects a cost factor below 12 (docs/security/14_Security_Architecture.md)", () => {
    expect(() => new BcryptPasswordHasher(11)).toThrow(/cost factor must be >= 12/);
    expect(() => new BcryptPasswordHasher(4)).toThrow();
  });

  it("accepts a cost factor of exactly 12", () => {
    expect(() => new BcryptPasswordHasher(12)).not.toThrow();
  });

  it("never returns the plaintext as its own hash", async () => {
    const hasher = new BcryptPasswordHasher(12);
    const hash = await hasher.hash("correct horse battery staple");
    expect(hash).not.toBe("correct horse battery staple");
    expect(hash).toMatch(/^\$2[aby]\$12\$/); // bcrypt hash shape, cost 12 encoded in the hash itself
  });

  it("round-trips: compare() succeeds for the correct password and fails for a wrong one", async () => {
    const hasher = new BcryptPasswordHasher(12);
    const hash = await hasher.hash("correct-password");

    await expect(hasher.compare("correct-password", hash)).resolves.toBe(true);
    await expect(hasher.compare("wrong-password", hash)).resolves.toBe(false);
  });

  it("produces a dummyHash that is a validly-shaped, cost-matched bcrypt hash", async () => {
    const hasher = new BcryptPasswordHasher(12);
    expect(hasher.dummyHash).toMatch(/^\$2[aby]\$12\$/);
    // It must behave like a real hash for compare() — just never match any real password.
    await expect(hasher.compare("anything", hasher.dummyHash)).resolves.toBe(false);
  });
});
