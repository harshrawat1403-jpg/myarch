import { describe, expect, it } from "vitest";
import { NotAuthorizedError } from "../../../src/lib/errors";
import type { AuthenticatedActor } from "../../../src/modules/auth";
import { EventNotFoundError, InvalidEventTransitionError, type EventRecord } from "../../../src/modules/events";
import { PublishEventUseCase } from "../../../src/modules/events/application/use-cases/publish-event";
import { InMemoryEventRepository } from "../../support/fakes/in-memory-event-repository";
import { FakeAuditRecorder } from "../../support/fakes/fake-audit-recorder";

const SECRETARY: AuthenticatedActor = { userId: "sec-1", role: "SECRETARY" };
const OUTSIDER_STUDENT: AuthenticatedActor = { userId: "stu-2", role: "STUDENT", studentProfileId: "sp-2" };

function record(overrides: Partial<EventRecord> = {}): EventRecord {
  const now = new Date();
  return {
    id: "event-1",
    title: "Tech Fest",
    description: null,
    startAt: new Date("2026-04-01T10:00:00Z"),
    endAt: null,
    venue: null,
    status: "DRAFT",
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
  const auditRecorder = new FakeAuditRecorder();
  const useCase = new PublishEventUseCase({ eventRepository, auditRecorder });
  return { useCase, eventRepository, auditRecorder };
}

describe("PublishEventUseCase", () => {
  it("moves a DRAFT event to PUBLISHED", async () => {
    const ctx = buildContext();
    const event = await ctx.useCase.execute({ actor: SECRETARY, eventId: "event-1" });
    expect(event.status).toBe("PUBLISHED");
    expect(ctx.auditRecorder.entries[0]?.action).toBe("EVENT_PUBLISHED");
  });

  it("rejects publishing an already-published event", async () => {
    const ctx = buildContext(record({ status: "PUBLISHED" }));
    await expect(ctx.useCase.execute({ actor: SECRETARY, eventId: "event-1" })).rejects.toBeInstanceOf(
      InvalidEventTransitionError,
    );
  });

  it("denies a Student unrelated to the event", async () => {
    const ctx = buildContext();
    await expect(ctx.useCase.execute({ actor: OUTSIDER_STUDENT, eventId: "event-1" })).rejects.toBeInstanceOf(
      NotAuthorizedError,
    );
  });

  it("throws EventNotFoundError for an unknown event", async () => {
    const ctx = buildContext();
    await expect(ctx.useCase.execute({ actor: SECRETARY, eventId: "unknown" })).rejects.toBeInstanceOf(EventNotFoundError);
  });
});
