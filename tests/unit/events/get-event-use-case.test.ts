import { describe, expect, it } from "vitest";
import { NotAuthorizedError } from "../../../src/lib/errors";
import type { AuthenticatedActor } from "../../../src/modules/auth";
import { EventNotFoundError, type EventRecord } from "../../../src/modules/events";
import { GetEventUseCase } from "../../../src/modules/events/application/use-cases/get-event";
import type { EventParticipantRepository } from "../../../src/modules/events/application/ports/event-participant-repository";
import type { EventChecklistRepository } from "../../../src/modules/events/application/ports/event-checklist-repository";
import type { EventAttachmentRepository } from "../../../src/modules/events/application/ports/event-attachment-repository";
import { InMemoryEventRepository } from "../../support/fakes/in-memory-event-repository";
import { InMemoryEventRegistrationRepository } from "../../support/fakes/in-memory-event-registration-repository";

const SECRETARY: AuthenticatedActor = { userId: "sec-1", role: "SECRETARY" };
const ORGANIZER: AuthenticatedActor = { userId: "organizer-1", role: "COORDINATOR", batchScope: [], permissions: [] };
const SELF_REGISTERED_STUDENT: AuthenticatedActor = { userId: "stu-1", role: "STUDENT", studentProfileId: "sp-1" };

const EMPTY_PARTICIPANTS: EventParticipantRepository = {
  add: async () => {
    throw new Error("not used");
  },
  remove: async () => {},
  findByEventAndUser: async () => null,
  listForEvent: async () => [],
};
const EMPTY_CHECKLIST: EventChecklistRepository = {
  add: async () => {
    throw new Error("not used");
  },
  setDone: async () => {
    throw new Error("not used");
  },
  remove: async () => {},
  findById: async () => null,
  listForEvent: async () => [],
};
const EMPTY_ATTACHMENTS: EventAttachmentRepository = {
  add: async () => {
    throw new Error("not used");
  },
  listForEvent: async () => [],
  findById: async () => null,
};

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

async function buildContext(seed: EventRecord = record()) {
  const eventRepository = new InMemoryEventRepository();
  eventRepository.seed(seed);
  const eventRegistrationRepository = new InMemoryEventRegistrationRepository();
  await eventRegistrationRepository.register(seed.id, "stu-1");
  await eventRegistrationRepository.register(seed.id, "stu-2");

  const useCase = new GetEventUseCase({
    eventRepository,
    eventParticipantRepository: EMPTY_PARTICIPANTS,
    eventChecklistRepository: EMPTY_CHECKLIST,
    eventAttachmentRepository: EMPTY_ATTACHMENTS,
    eventRegistrationRepository,
  });
  return { useCase };
}

describe("GetEventUseCase — registration roster visibility", () => {
  it("returns the full registrant roster to whoever manages the event", async () => {
    const ctx = await buildContext();
    const detail = await ctx.useCase.execute({ actor: SECRETARY, eventId: "event-1" });

    expect(detail.registrationCount).toBe(2);
    expect(detail.registrations.map((r) => r.userId).sort()).toEqual(["stu-1", "stu-2"]);
  });

  it("returns the roster to the organizer too", async () => {
    const ctx = await buildContext();
    const detail = await ctx.useCase.execute({ actor: ORGANIZER, eventId: "event-1" });
    expect(detail.registrations).toHaveLength(2);
  });

  it("hides the roster from a non-manager, even a self-registered attendee", async () => {
    const ctx = await buildContext();
    const detail = await ctx.useCase.execute({ actor: SELF_REGISTERED_STUDENT, eventId: "event-1" });

    expect(detail.registrationCount).toBe(2);
    expect(detail.registrations).toEqual([]);
    expect(detail.isSelfRegistered).toBe(true);
  });

  it("denies viewing a DRAFT event to an unrelated Student", async () => {
    const ctx = await buildContext(record({ status: "DRAFT" }));
    await expect(ctx.useCase.execute({ actor: SELF_REGISTERED_STUDENT, eventId: "event-1" })).rejects.toBeInstanceOf(
      NotAuthorizedError,
    );
  });

  it("throws EventNotFoundError for an unknown event", async () => {
    const ctx = await buildContext();
    await expect(ctx.useCase.execute({ actor: SECRETARY, eventId: "unknown" })).rejects.toBeInstanceOf(EventNotFoundError);
  });
});
