import { describe, expect, it } from "vitest";
import { NotAuthorizedError } from "../../../src/lib/errors";
import type { AuthenticatedActor } from "../../../src/modules/auth";
import { CreateEventUseCase } from "../../../src/modules/events/application/use-cases/create-event";
import { InMemoryEventRepository } from "../../support/fakes/in-memory-event-repository";
import { FakeAuditRecorder } from "../../support/fakes/fake-audit-recorder";

const SECRETARY: AuthenticatedActor = { userId: "sec-1", role: "SECRETARY" };
const STUDENT: AuthenticatedActor = { userId: "stu-1", role: "STUDENT", studentProfileId: "sp-1" };

function buildContext() {
  const eventRepository = new InMemoryEventRepository();
  const auditRecorder = new FakeAuditRecorder();
  const useCase = new CreateEventUseCase({ eventRepository, auditRecorder });
  return { useCase, eventRepository, auditRecorder };
}

describe("CreateEventUseCase", () => {
  it("creates a DRAFT event owned by the creator by default", async () => {
    const ctx = buildContext();
    const event = await ctx.useCase.execute({ actor: SECRETARY, title: "Tech Fest", startAt: new Date("2026-04-01T10:00:00Z") });

    expect(event.status).toBe("DRAFT");
    expect(event.organizerId).toBe(SECRETARY.userId);
    expect(ctx.auditRecorder.entries).toHaveLength(1);
    expect(ctx.auditRecorder.entries[0]?.action).toBe("EVENT_CREATED");
  });

  it("lets the creator name a different organizer", async () => {
    const ctx = buildContext();
    const event = await ctx.useCase.execute({
      actor: SECRETARY,
      title: "Tech Fest",
      startAt: new Date("2026-04-01T10:00:00Z"),
      organizerId: "coord-9",
    });
    expect(event.organizerId).toBe("coord-9");
  });

  it("denies a Student from creating an event", async () => {
    const ctx = buildContext();
    await expect(
      ctx.useCase.execute({ actor: STUDENT, title: "Tech Fest", startAt: new Date("2026-04-01T10:00:00Z") }),
    ).rejects.toBeInstanceOf(NotAuthorizedError);
  });
});
