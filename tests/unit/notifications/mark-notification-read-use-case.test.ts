import { describe, expect, it } from "vitest";
import { MarkNotificationReadUseCase } from "../../../src/modules/notifications/application/use-cases/mark-notification-read";
import { NotificationNotFoundError } from "../../../src/modules/notifications/domain/errors";
import { InMemoryNotificationRepository } from "../../support/fakes/in-memory-notification-repository";
import type { AuthenticatedActor } from "../../../src/modules/auth";

const OWNER: AuthenticatedActor = { userId: "user-1", role: "STUDENT", studentProfileId: "student-1" };
const OTHER: AuthenticatedActor = { userId: "user-2", role: "STUDENT", studentProfileId: "student-2" };

describe("MarkNotificationReadUseCase — V4.0 E1", () => {
  it("marks the caller's own notification read", async () => {
    const repo = new InMemoryNotificationRepository();
    const { id } = await repo.create({ recipientUserId: OWNER.userId, channel: "IN_APP", template: "PROFILE_APPROVED", payload: {} });
    const useCase = new MarkNotificationReadUseCase({ notificationRepository: repo });

    await useCase.execute(OWNER, id);

    expect(repo.records.find((r) => r.id === id)!.readAt).not.toBeNull();
  });

  it("throws NotificationNotFoundError for a nonexistent id", async () => {
    const repo = new InMemoryNotificationRepository();
    const useCase = new MarkNotificationReadUseCase({ notificationRepository: repo });

    await expect(useCase.execute(OWNER, "nope")).rejects.toThrow(NotificationNotFoundError);
  });

  it("throws NotificationNotFoundError when the notification belongs to a different user (no cross-user read/leak)", async () => {
    const repo = new InMemoryNotificationRepository();
    const { id } = await repo.create({ recipientUserId: OWNER.userId, channel: "IN_APP", template: "PROFILE_APPROVED", payload: {} });
    const useCase = new MarkNotificationReadUseCase({ notificationRepository: repo });

    await expect(useCase.execute(OTHER, id)).rejects.toThrow(NotificationNotFoundError);
    expect(repo.records.find((r) => r.id === id)!.readAt).toBeNull();
  });
});
