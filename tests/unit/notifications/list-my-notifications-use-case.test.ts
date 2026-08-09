import { describe, expect, it } from "vitest";
import { ListMyNotificationsUseCase } from "../../../src/modules/notifications/application/use-cases/list-my-notifications";
import { InMemoryNotificationRepository } from "../../support/fakes/in-memory-notification-repository";
import type { AuthenticatedActor } from "../../../src/modules/auth";

const STUDENT: AuthenticatedActor = { userId: "user-1", role: "STUDENT", studentProfileId: "student-1" };
const OTHER: AuthenticatedActor = { userId: "user-2", role: "STUDENT", studentProfileId: "student-2" };

describe("ListMyNotificationsUseCase — V4.0 E1", () => {
  it("returns only the caller's own IN_APP notifications, rendered with title/message", async () => {
    const repo = new InMemoryNotificationRepository();
    await repo.create({ recipientUserId: STUDENT.userId, channel: "IN_APP", template: "PROFILE_APPROVED", payload: { studentName: "Alice" } });
    await repo.create({ recipientUserId: STUDENT.userId, channel: "EMAIL", template: "PROFILE_APPROVED", payload: { studentName: "Alice" } });
    await repo.create({ recipientUserId: OTHER.userId, channel: "IN_APP", template: "PROFILE_APPROVED", payload: { studentName: "Bilal" } });

    const useCase = new ListMyNotificationsUseCase({ notificationRepository: repo });
    const result = await useCase.execute(STUDENT);

    expect(result).toHaveLength(1);
    expect(result[0]!.title).toBe("Profile approved");
    expect(result[0]!.message).toContain("approved");
    expect(result[0]!.isRead).toBe(false);
  });

  it("V4.0 UX fix — includes a resolved destination for templates that have one", async () => {
    const repo = new InMemoryNotificationRepository();
    await repo.create({ recipientUserId: STUDENT.userId, channel: "IN_APP", template: "PROFILE_APPROVED", payload: { studentName: "Alice" } });

    const useCase = new ListMyNotificationsUseCase({ notificationRepository: repo });
    const result = await useCase.execute(STUDENT);

    expect(result[0]!.destination).toBe("/student/profile");
  });

  it("V4.0 UX fix — destination is null for templates with no meaningful owning page", async () => {
    const repo = new InMemoryNotificationRepository();
    await repo.create({
      recipientUserId: STUDENT.userId,
      channel: "IN_APP",
      template: "ACCOUNT_CREDENTIALS_ISSUED",
      payload: { reason: "account_created" },
    });

    const useCase = new ListMyNotificationsUseCase({ notificationRepository: repo });
    const result = await useCase.execute(STUDENT);

    expect(result[0]!.destination).toBeNull();
  });

  it("marks isRead true once readAt is set", async () => {
    const repo = new InMemoryNotificationRepository();
    const { id } = await repo.create({ recipientUserId: STUDENT.userId, channel: "IN_APP", template: "PROFILE_APPROVED", payload: {} });
    await repo.markRead(id, STUDENT.userId);

    const useCase = new ListMyNotificationsUseCase({ notificationRepository: repo });
    const result = await useCase.execute(STUDENT);

    expect(result[0]!.isRead).toBe(true);
  });

  it("returns an empty list for a user with no notifications", async () => {
    const repo = new InMemoryNotificationRepository();
    const useCase = new ListMyNotificationsUseCase({ notificationRepository: repo });

    expect(await useCase.execute(STUDENT)).toEqual([]);
  });
});
