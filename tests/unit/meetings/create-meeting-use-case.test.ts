import { describe, expect, it } from "vitest";
import { NotAuthorizedError } from "../../../src/lib/errors";
import type { AuthenticatedActor } from "../../../src/modules/auth";
import { CreateMeetingUseCase } from "../../../src/modules/meetings/application/use-cases/create-meeting";
import { InMemoryMeetingRepository } from "../../support/fakes/in-memory-meeting-repository";
import { FakeAuditRecorder } from "../../support/fakes/fake-audit-recorder";

const SECRETARY: AuthenticatedActor = { userId: "sec-1", role: "SECRETARY" };
const STUDENT: AuthenticatedActor = { userId: "stu-1", role: "STUDENT", studentProfileId: "sp-1" };

function buildContext() {
  const meetingRepository = new InMemoryMeetingRepository();
  const auditRecorder = new FakeAuditRecorder();
  const useCase = new CreateMeetingUseCase({ meetingRepository, auditRecorder });
  return { useCase, auditRecorder };
}

describe("CreateMeetingUseCase", () => {
  it("creates a SCHEDULED meeting owned by the creator by default", async () => {
    const ctx = buildContext();
    const meeting = await ctx.useCase.execute({ actor: SECRETARY, title: "Council Sync", startAt: new Date("2026-04-01T10:00:00Z") });
    expect(meeting.status).toBe("SCHEDULED");
    expect(meeting.organizerId).toBe(SECRETARY.userId);
    expect(ctx.auditRecorder.entries[0]?.action).toBe("MEETING_CREATED");
  });

  it("denies a Student from creating a meeting", async () => {
    const ctx = buildContext();
    await expect(
      ctx.useCase.execute({ actor: STUDENT, title: "Council Sync", startAt: new Date("2026-04-01T10:00:00Z") }),
    ).rejects.toBeInstanceOf(NotAuthorizedError);
  });
});
