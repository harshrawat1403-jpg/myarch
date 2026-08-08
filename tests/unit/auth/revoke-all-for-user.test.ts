import { beforeEach, describe, expect, it } from "vitest";
import { InMemoryRefreshTokenRepository } from "../../support/fakes/in-memory-refresh-token-repository";

describe("RefreshTokenRepository.revokeAllForUser", () => {
  let repository: InMemoryRefreshTokenRepository;

  beforeEach(() => {
    repository = new InMemoryRefreshTokenRepository();
  });

  it("revokes every unrevoked token across every family for a user", async () => {
    await repository.create({
      userId: "user-1",
      tokenHash: "hash-family-a",
      familyId: "family-a",
      expiresAt: new Date(Date.now() + 1000 * 60 * 60),
    });
    await repository.create({
      userId: "user-1",
      tokenHash: "hash-family-b",
      familyId: "family-b",
      expiresAt: new Date(Date.now() + 1000 * 60 * 60),
    });

    await repository.revokeAllForUser("user-1");

    const stillActive = repository.all().filter((t) => t.userId === "user-1" && !t.revokedAt);
    expect(stillActive).toHaveLength(0);
  });

  it("never touches another user's tokens", async () => {
    await repository.create({
      userId: "user-1",
      tokenHash: "hash-user-1",
      familyId: "family-1",
      expiresAt: new Date(Date.now() + 1000 * 60 * 60),
    });
    await repository.create({
      userId: "user-2",
      tokenHash: "hash-user-2",
      familyId: "family-2",
      expiresAt: new Date(Date.now() + 1000 * 60 * 60),
    });

    await repository.revokeAllForUser("user-1");

    const user2Token = repository.all().find((t) => t.userId === "user-2");
    expect(user2Token!.revokedAt).toBeNull();
  });

  it("is idempotent — revoking an already-revoked token does not throw", async () => {
    await repository.create({
      userId: "user-1",
      tokenHash: "hash-1",
      familyId: "family-1",
      expiresAt: new Date(Date.now() + 1000 * 60 * 60),
    });

    await repository.revokeAllForUser("user-1");
    await expect(repository.revokeAllForUser("user-1")).resolves.not.toThrow();
  });

  it("does not throw for a user with no tokens", async () => {
    await expect(repository.revokeAllForUser("no-such-user")).resolves.not.toThrow();
  });
});
