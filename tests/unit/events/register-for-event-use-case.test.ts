import { describe, expect, it } from "vitest";
import { NotAuthorizedError } from "../../../src/lib/errors";
import type { AuthenticatedActor } from "../../../src/modules/auth";
import { AlreadyRegisteredForEventError, EventNotRegistrableError, type EventRecord } from "../../../src/modules/events";
import { RegisterForEventUseCase } from "../../../src/modules/events/application/use-cases/register-for-event";
import { InMemoryEventRepository } from "../../support/fakes/in-memory-event-repository";
import { InMemoryEventRegistrationRepository } from "../../support/fakes/in-memory-event-registration-repository";
import { FakeAuditRecorder } from "../../support/fakes/fake-audit-recorder";

const STUDENT: AuthenticatedActor = { userId: "stu-1", role: "STUDENT", studentProfileId: "sp-1" };
const SECRETARY: AuthenticatedActor = { userId: "sec-1", role: "SECRETARY" };

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
  const useCase = new RegisterForEventUseCase({ eventRepository, eventRegistrationRepository, auditRecorder });
  return { useCase, eventRegistrationRepository };
}

describe("RegisterForEventUseCase", () => {
  it("registers a Student for a PUBLISHED event", async () => {
    const ctx = buildContext();
    const registration = await ctx.useCase.execute({ actor: STUDENT, eventId: "event-1" });
    expect(registration.userId).toBe(STUDENT.userId);
    expect(await ctx.eventRegistrationRepository.countForEvent("event-1")).toBe(1);
  });

  it("rejects registering for a DRAFT event", async () => {
    const ctx = buildContext(record({ status: "DRAFT" }));
    await expect(ctx.useCase.execute({ actor: STUDENT, eventId: "event-1" })).rejects.toBeInstanceOf(EventNotRegistrableError);
  });

  it("rejects a duplicate registration", async () => {
    const ctx = buildContext();
    await ctx.useCase.execute({ actor: STUDENT, eventId: "event-1" });
    await expect(ctx.useCase.execute({ actor: STUDENT, eventId: "event-1" })).rejects.toBeInstanceOf(
      AlreadyRegisteredForEventError,
    );
  });

  it("denies a Secretary from self-registering (staff manage, they don't attend as registrants)", async () => {
    const ctx = buildContext();
    await expect(ctx.useCase.execute({ actor: SECRETARY, eventId: "event-1" })).rejects.toBeInstanceOf(NotAuthorizedError);
  });
});
