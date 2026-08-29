import { describe, expect, it } from "vitest";
import { NotAuthorizedError } from "../../../src/lib/errors";
import type { AuthenticatedActor } from "../../../src/modules/auth";
import { InvalidMeetingTransitionError, MeetingNotFoundError, type MeetingRecord } from "../../../src/modules/meetings";
import { CompleteMeetingUseCase } from "../../../src/modules/meetings/application/use-cases/complete-meeting";
import { InMemoryMeetingRepository } from "../../support/fakes/in-memory-meeting-repository";
import { FakeAuditRecorder } from "../../support/fakes/fake-audit-recorder";

const SECRETARY: AuthenticatedActor = { userId: "sec-1", role: "SECRETARY" };
const OUTSIDER_STUDENT: AuthenticatedActor = { userId: "stu-2", role: "STUDENT", studentProfileId: "sp-2" };

function record(overrides: Partial<MeetingRecord> = {}): MeetingRecord {
  const now = new Date();
  return {
    id: "meeting-1",
    title: "Council Sync",
    agenda: null,
    startAt: new Date("2026-04-01T10:00:00Z"),
    venueOrLink: null,
    status: "SCHEDULED",
    organizerId: "organizer-1",
    committeeId: null,
    notes: null,
    decisions: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function buildContext(seed: MeetingRecord = record()) {
  const meetingRepository = new InMemoryMeetingRepository();
  meetingRepository.seed(seed);
  const auditRecorder = new FakeAuditRecorder();
  const useCase = new CompleteMeetingUseCase({ meetingRepository, auditRecorder });
  return { useCase };
}

describe("CompleteMeetingUseCase", () => {
  it("moves a SCHEDULED meeting to COMPLETED", async () => {
    const ctx = buildContext();
    const meeting = await ctx.useCase.execute({ actor: SECRETARY, meetingId: "meeting-1" });
    expect(meeting.status).toBe("COMPLETED");
  });

  it("rejects completing an already-completed meeting", async () => {
    const ctx = buildContext(record({ status: "COMPLETED" }));
    await expect(ctx.useCase.execute({ actor: SECRETARY, meetingId: "meeting-1" })).rejects.toBeInstanceOf(
      InvalidMeetingTransitionError,
    );
  });

  it("denies an unrelated Student", async () => {
    const ctx = buildContext();
    await expect(ctx.useCase.execute({ actor: OUTSIDER_STUDENT, meetingId: "meeting-1" })).rejects.toBeInstanceOf(
      NotAuthorizedError,
    );
  });

  it("throws MeetingNotFoundError for an unknown meeting", async () => {
    const ctx = buildContext();
    await expect(ctx.useCase.execute({ actor: SECRETARY, meetingId: "unknown" })).rejects.toBeInstanceOf(
      MeetingNotFoundError,
    );
  });
});
