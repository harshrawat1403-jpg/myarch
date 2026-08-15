import { describe, expect, it } from "vitest";
import { NotAuthorizedError } from "../../../src/lib/errors";
import type { AuthenticatedActor } from "../../../src/modules/auth";
import { EventNotFoundError, NotRegisteredForEventError, type EventRecord } from "../../../src/modules/events";
import { MarkEventAttendanceUseCase } from "../../../src/modules/events/application/use-cases/mark-attendance";
import { InMemoryEventRepository } from "../../support/fakes/in-memory-event-repository";
import { InMemoryEventRegistrationRepository } from "../../support/fakes/in-memory-event-registration-repository";
import { FakeAuditRecorder } from "../../support/fakes/fake-audit-recorder";

const SECRETARY: AuthenticatedActor = { userId: "sec-1", role: "SECRETARY" };
const OUTSIDER_STUDENT: AuthenticatedActor = { userId: "stu-outsider", role: "STUDENT", studentProfileId: "sp-2" };

function record(overrides: Partial<EventRecord> = {}): EventRecord {
  const now = new Date();
  return {
    id: "event-1",
    title: "Tech Fest",
    description: null,
    startAt: new Date("2026-04-01T10:00:00Z"),
    endAt: null,
    venue: null,
    status: "PUBLISHED",
    organizerId: "organizer-1",
    budgetAmount: null,
    budgetNotes: null,
    postEventReport: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function buildContext(seed: EventRecord = record()) {
  const eventRepository = new InMemoryEventRepository();
  eventRepository.seed(seed);
  const eventRegistrationRepository = new InMemoryEventRegistrationRepository();
  const auditRecorder = new FakeAuditRecorder();
  const useCase = new MarkEventAttendanceUseCase({ eventRepository, eventRegistrationRepository, auditRecorder });
  return { useCase, eventRegistrationRepository, auditRecorder };
}

describe("MarkEventAttendanceUseCase", () => {
  it("marks a registered student as attended", async () => {
    const ctx = buildContext();
    await ctx.eventRegistrationRepository.register("event-1", "stu-1");

    const registration = await ctx.useCase.execute({ actor: SECRETARY, eventId: "event-1", userId: "stu-1" });

    expect(registration.attendedAt).not.toBeNull();
    expect(ctx.auditRecorder.entries[0]?.action).toBe("EVENT_ATTENDANCE_MARKED");
  });

  it("rejects marking attendance for someone not registered", async () => {
    const ctx = buildContext();
    await expect(
      ctx.useCase.execute({ actor: SECRETARY, eventId: "event-1", userId: "never-registered" }),
    ).rejects.toBeInstanceOf(NotRegisteredForEventError);
  });

  it("denies an actor who doesn't manage the event", async () => {
    const ctx = buildContext();
    await ctx.eventRegistrationRepository.register("event-1", "stu-1");
    await expect(
      ctx.useCase.execute({ actor: OUTSIDER_STUDENT, eventId: "event-1", userId: "stu-1" }),
    ).rejects.toBeInstanceOf(NotAuthorizedError);
  });

  it("throws EventNotFoundError for an unknown event", async () => {
    const ctx = buildContext();
    await expect(ctx.useCase.execute({ actor: SECRETARY, eventId: "unknown", userId: "stu-1" })).rejects.toBeInstanceOf(
      EventNotFoundError,
    );
  });
});
