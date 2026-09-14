import { describe, expect, it, vi } from "vitest";
import { CoreCommitteeSelectionUseCases } from "../../../src/modules/selections/application/core-committee-selection-use-cases";
import { NotAuthorizedError } from "../../../src/lib/errors";
import type { CoreCommitteeSelectionRepository } from "../../../src/modules/selections/application/ports/core-committee-selection-repository";
const secretary = { role: "SECRETARY" as const, userId: "secretary" };
const councilMember = { role: "STUDENT" as const, userId: "council-member" };
const selection = {
  id: "selection",
  title: "Core",
  brief: "Core Committee recruitment",
  academicYear: "2026-2027",
  status: "COUNCIL_REVIEW" as const,
  applicationOpenAt: new Date("2026-09-01"),
  applicationCloseAt: new Date("2026-09-10"),
  correctionOpenAt: null,
  correctionCloseAt: null,
  maxPositionsPerCandidate: 1,
  configurationLockedAt: new Date(),
  createdAt: new Date(),
  positions: [],
  applicationForm: null,
};
function setup(currentCouncil: string | null = "council") {
  const repository = {
    list: vi.fn().mockResolvedValue([]),
    get: vi.fn().mockResolvedValue(selection),
    create: vi.fn(),
    update: vi.fn(),
    savePosition: vi.fn(),
    extendDeadline: vi.fn(),
    linkForm: vi.fn(),
    transition: vi.fn(),
    candidates: vi.fn(),
    shortlist: vi.fn(),
    publishShortlist: vi.fn(),
    createInterview: vi.fn(),
    rescheduleInterview: vi.fn(),
    cancelInterview: vi.fn(),
    completeInterview: vi.fn(),
    currentCouncilCommittee: vi.fn().mockResolvedValue(currentCouncil),
    recordCouncilReview: vi.fn(),
    recordDecision: vi.fn(),
    finalizeDecision: vi.fn(),
    internalProcessing: vi.fn(),
    councilProcessing: vi.fn(),
    publish: vi.fn(),
    publishedResults: vi.fn(),
    appointmentPreview: vi.fn(),
    confirmAppointments: vi.fn(),
    archive: vi.fn(),
    delete: vi.fn(),
  };
  const notifications = { notify: vi.fn().mockResolvedValue(undefined) };
  return {
    repository,
    notifications,
    useCases: new CoreCommitteeSelectionUseCases(
      repository as unknown as CoreCommitteeSelectionRepository,
      notifications,
    ),
  };
}
describe("Core Committee selection authority", () => {
  it("lets the Secretary administer configuration and finalization", async () => {
    const { useCases, repository } = setup();
    await useCases.create(secretary, {
      title: "Core",
      brief: "Core Committee recruitment",
      academicYear: "2026-2027",
      applicationOpenAt: "2026-09-01",
      applicationCloseAt: "2026-09-10",
    });
    await useCases.finalizeDecision(secretary, "selection", "00000000-0000-4000-8000-000000000001");
    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Core" }),
      "secretary",
    );
    expect(repository.finalizeDecision).toHaveBeenCalled();
  });
  it("records Council review and decision only with resolved current Council authority", async () => {
    const { useCases, repository } = setup();
    const input = {
      candidateId: "00000000-0000-4000-8000-000000000002",
      positionId: "00000000-0000-4000-8000-000000000003",
      note: "Interview and record reviewed.",
    };
    await useCases.review(councilMember, "selection", input);
    await useCases.decision(councilMember, "selection", {
      candidateId: input.candidateId,
      positionId: input.positionId,
      outcome: "SELECTED",
      internalNote: "Council decision.",
    });
    expect(repository.recordCouncilReview).toHaveBeenCalledWith(
      expect.objectContaining({
        councilCommitteeId: "council",
        councilMemberUserId: "council-member",
      }),
    );
    expect(repository.recordDecision).toHaveBeenCalledWith(
      expect.objectContaining({ outcome: "SELECTED" }),
    );
  });
  it("denies non-Council students and all non-Secretary administrators", async () => {
    const { useCases, repository } = setup(null);
    await expect(
      useCases.review(councilMember, "selection", {
        candidateId: "00000000-0000-4000-8000-000000000002",
        positionId: "00000000-0000-4000-8000-000000000003",
        note: "No authority",
      }),
    ).rejects.toBeInstanceOf(NotAuthorizedError);
    await expect(
      useCases.create({ role: "COORDINATOR", userId: "coordinator" }, {}),
    ).rejects.toBeInstanceOf(NotAuthorizedError);
    expect(repository.recordCouncilReview).not.toHaveBeenCalled();
  });
  it("reserves permanent Core selection deletion for the Secretary", async () => {
    const { useCases, repository } = setup();
    await useCases.delete(secretary, "selection", { confirmation: "DELETE CORE SELECTION" });
    expect(repository.delete).toHaveBeenCalledWith({
      selectionId: "selection",
      actorUserId: "secretary",
      confirmation: "DELETE CORE SELECTION",
    });
    await expect(
      useCases.delete(councilMember, "selection", { confirmation: "DELETE CORE SELECTION" }),
    ).rejects.toBeInstanceOf(NotAuthorizedError);
  });
  it("uses the internal projection only for the Secretary and the safe projection for current Council", async () => {
    const { useCases, repository } = setup();
    repository.internalProcessing.mockResolvedValue({ candidates: [{ decisions: [{ internalNote: "internal" }] }] });
    repository.councilProcessing.mockResolvedValue({ candidates: [{ decisions: [{ outcome: "SELECTED" }] }] });
    await expect(useCases.processing(secretary, "selection")).resolves.toEqual({
      candidates: [{ decisions: [{ internalNote: "internal" }] }],
    });
    await expect(useCases.processing(councilMember, "selection")).resolves.toEqual({
      candidates: [{ decisions: [{ outcome: "SELECTED" }] }],
    });
    expect(repository.internalProcessing).toHaveBeenCalledWith("selection");
    expect(repository.councilProcessing).toHaveBeenCalledWith("selection");
    const denied = setup(null);
    await expect(denied.useCases.processing(councilMember, "selection")).rejects.toBeInstanceOf(
      NotAuthorizedError,
    );
  });
  it("notifies each recipient once after committed publication and membership confirmation", async () => {
    const { useCases, repository, notifications } = setup();
    repository.publish.mockResolvedValue({
      published: true,
      idempotent: false,
      notificationRecipients: {
        selectionId: "selection",
        selectionTitle: "Core",
        candidateUserIds: ["selected", "selected", "not-selected"],
        selectedCandidateUserIds: ["selected"],
        notSelectedCandidateUserIds: ["selected", "not-selected"],
      },
    });
    repository.confirmAppointments.mockResolvedValue({
      confirmed: true,
      idempotent: false,
      notificationRecipients: {
        selectionId: "selection",
        selectionTitle: "Core",
        selectedCandidateUserIds: ["selected", "selected"],
      },
    });
    await useCases.publish(secretary, "selection");
    await useCases.confirmAppointments(secretary, "selection");
    expect(notifications.notify).toHaveBeenCalledTimes(5);
    expect(notifications.notify).toHaveBeenCalledWith(
      expect.objectContaining({ recipientUserId: "selected", template: "CORE_COMMITTEE_SELECTION_SELECTED" }),
    );
    expect(notifications.notify).toHaveBeenCalledWith(
      expect.objectContaining({ recipientUserId: "not-selected", template: "CORE_COMMITTEE_SELECTION_NOT_SELECTED" }),
    );
    expect(notifications.notify).toHaveBeenCalledWith(
      expect.objectContaining({ recipientUserId: "selected", template: "CORE_COMMITTEE_SELECTION_MEMBERSHIP_CONFIRMED" }),
    );
    repository.publish.mockResolvedValue({ published: true, idempotent: true });
    await useCases.publish(secretary, "selection");
    expect(notifications.notify).toHaveBeenCalledTimes(5);
  });
  it("notifies candidates about shortlist and interview changes without confidential notes", async () => {
    const { useCases, repository, notifications } = setup();
    repository.shortlist.mockResolvedValue({ candidateId: "candidate", candidateUserId: "student", selectionTitle: "Core" });
    repository.publishShortlist.mockResolvedValue({
      published: true,
      idempotent: false,
      notificationRecipients: {
        selectionId: "selection",
        selectionTitle: "Core",
        candidateUserIds: ["student"],
        shortlistedCandidateUserIds: ["student"],
        notShortlistedCandidateUserIds: [],
      },
    });
    repository.createInterview.mockResolvedValue({ interviewId: "interview", candidateUserId: "student", selectionTitle: "Core" });
    repository.rescheduleInterview.mockResolvedValue({ interviewId: "interview", candidateUserId: "student", selectionTitle: "Core" });
    repository.cancelInterview.mockResolvedValue({ interviewId: "interview", candidateUserId: "student", selectionTitle: "Core" });
    const candidateId = "00000000-0000-4000-8000-000000000002";
    const positionId = "00000000-0000-4000-8000-000000000003";
    const interviewId = "00000000-0000-4000-8000-000000000004";
    await useCases.shortlist(secretary, "selection", { candidateId, positionIds: [positionId] });
    await useCases.publishShortlist(secretary, "selection");
    await useCases.interview(secretary, "selection", { candidateId, positionId, scheduledAt: "2099-09-12T10:00:00.000Z", durationMinutes: 30, mode: "ONLINE", location: "https://meet.example.com/core", internalNotes: "private" });
    await useCases.rescheduleInterview(secretary, "selection", interviewId, { scheduledAt: "2099-09-12T11:00:00.000Z", durationMinutes: 30, mode: "ONLINE", location: "https://meet.example.com/core", internalNotes: "private" });
    await useCases.cancelInterview(secretary, "selection", interviewId, { reason: "Venue changed" });
    expect(notifications.notify).toHaveBeenCalledWith(expect.objectContaining({ template: "CORE_COMMITTEE_SELECTION_SHORTLISTED" }));
    expect(notifications.notify).toHaveBeenCalledWith(expect.objectContaining({ template: "CORE_COMMITTEE_SELECTION_INTERVIEW_SCHEDULED" }));
    expect(notifications.notify).toHaveBeenCalledWith(expect.objectContaining({ template: "CORE_COMMITTEE_SELECTION_INTERVIEW_RESCHEDULED" }));
    expect(notifications.notify).toHaveBeenCalledWith(expect.objectContaining({ template: "CORE_COMMITTEE_SELECTION_INTERVIEW_CANCELLED" }));
    for (const call of notifications.notify.mock.calls) expect(JSON.stringify(call[0])).not.toContain("private");
  });
});
