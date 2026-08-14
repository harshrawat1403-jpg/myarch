import { describe, expect, it, vi } from "vitest";
import type { AuthenticatedActor } from "../../../src/modules/auth";
import { ResetCoordinatorPasswordUseCase } from "../../../src/modules/coordinators/application/use-cases/reset-password";
import { CoordinatorNotFoundError } from "../../../src/modules/coordinators/domain/errors";
import { InMemoryCoordinatorRepository } from "../../support/fakes/in-memory-coordinator-repository";
import type { CoordinatorRecord } from "../../../src/modules/coordinators";

const SECRETARY: AuthenticatedActor = { userId: "sec-1", role: "SECRETARY" };

function record(overrides: Partial<CoordinatorRecord> = {}): CoordinatorRecord {
  return {
    id: "coord-1",
    userId: "user-1",
    email: "alice@tnparch.in",
    fullName: "Alice Coordinator",
    isActive: true,
    position: null,
    batchIds: [],
    permissions: [],
    createdAt: new Date(),
    ...overrides,
  };
}

describe("ResetCoordinatorPasswordUseCase", () => {
  it("throws CoordinatorNotFoundError for an unknown id, without ever calling resetPassword", async () => {
    const coordinatorRepository = new InMemoryCoordinatorRepository();
    const resetPassword = vi.fn();
    const useCase = new ResetCoordinatorPasswordUseCase({ coordinatorRepository, resetPassword });

    await expect(useCase.execute({ actor: SECRETARY, coordinatorId: "missing" })).rejects.toBeInstanceOf(
      CoordinatorNotFoundError,
    );
    expect(resetPassword).not.toHaveBeenCalled();
  });

  it("resolves the coordinator's userId/fullName and delegates to the shared reset primitive", async () => {
    const coordinatorRepository = new InMemoryCoordinatorRepository();
    coordinatorRepository.seed(record());
    const resetPassword = vi.fn().mockResolvedValue({ tempPassword: "generated-temp-pw" });
    const useCase = new ResetCoordinatorPasswordUseCase({ coordinatorRepository, resetPassword });

    const result = await useCase.execute({ actor: SECRETARY, coordinatorId: "coord-1" });

    expect(result).toEqual({ tempPassword: "generated-temp-pw" });
    expect(resetPassword).toHaveBeenCalledWith({
      actor: SECRETARY,
      targetUserId: "user-1",
      targetRole: "COORDINATOR",
      recipientName: "Alice Coordinator",
    });
  });

  it("propagates an error thrown by the shared reset primitive (e.g. permission denial)", async () => {
    const coordinatorRepository = new InMemoryCoordinatorRepository();
    coordinatorRepository.seed(record());
    const resetPassword = vi.fn().mockRejectedValue(new Error("Not authorized"));
    const useCase = new ResetCoordinatorPasswordUseCase({ coordinatorRepository, resetPassword });

    await expect(useCase.execute({ actor: SECRETARY, coordinatorId: "coord-1" })).rejects.toThrow("Not authorized");
  });
});
