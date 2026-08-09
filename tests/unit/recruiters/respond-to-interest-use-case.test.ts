import { beforeEach, describe, expect, it } from "vitest";
import type { AuthenticatedActor } from "../../../src/modules/auth";
import { RespondToInterestUseCase } from "../../../src/modules/recruiters/application/use-cases/respond-to-interest";
import {
  InterestRequestAlreadyRespondedError,
  InterestRequestNotFoundError,
} from "../../../src/modules/recruiters/domain/errors";
import { NotAuthorizedError } from "../../../src/lib/errors";
import { InMemoryRecruiterInterestRepository } from "../../support/fakes/in-memory-recruiter-interest-repository";
import { InMemoryRecruiterAccountRepository } from "../../support/fakes/in-memory-recruiter-account-repository";
import { FakeStudentNameLookup } from "../../support/fakes/fake-student-name-lookup";
import { FakeSecretaryRecipientLookup } from "../../support/fakes/fake-secretary-recipient-lookup";
import { FakeNotificationService } from "../../support/fakes/fake-notification-service";

const student: AuthenticatedActor = { userId: "stu-1", role: "STUDENT", studentProfileId: "s1" };
const otherStudent: AuthenticatedActor = { userId: "stu-2", role: "STUDENT", studentProfileId: "s2" };
const recruiterActor: AuthenticatedActor = { userId: "rec-1", role: "RECRUITER" };

describe("RespondToInterestUseCase", () => {
  let interestRepository: InMemoryRecruiterInterestRepository;
  let recruiterAccountRepository: InMemoryRecruiterAccountRepository;
  let studentNameLookup: FakeStudentNameLookup;
  let secretaryRecipientLookup: FakeSecretaryRecipientLookup;
  let notificationService: FakeNotificationService;
  let useCase: RespondToInterestUseCase;

  beforeEach(() => {
    interestRepository = new InMemoryRecruiterInterestRepository();
    interestRepository.seed({
      id: "int-1",
      recruiterProfileId: "rec-profile-1",
      studentProfileId: "s1",
      message: "Loved your portfolio.",
      status: "SENT",
      sentAt: new Date("2026-01-01"),
      respondedAt: null,
      completedAt: null,
    });

    recruiterAccountRepository = new InMemoryRecruiterAccountRepository();
    recruiterAccountRepository.seed({
      id: "rec-profile-1",
      userId: "rec-1",
      email: "rec1@example.com",
      fullName: "Rita Recruiter",
      companyName: "Acme Architects",
      isActive: true,
      approvalStatus: "APPROVED",
      createdAt: new Date(),
    });

    studentNameLookup = new FakeStudentNameLookup();
    studentNameLookup.seed("s1", "Alice Architect");

    secretaryRecipientLookup = new FakeSecretaryRecipientLookup(["sec-1", "sec-2"]);
    notificationService = new FakeNotificationService();

    useCase = new RespondToInterestUseCase({
      interestRepository,
      recruiterAccountRepository,
      studentNameLookup,
      secretaryRecipientLookup,
      notificationService,
    });
  });

  it("accepts a SENT request, sets respondedAt, and notifies every active Secretary", async () => {
    const result = await useCase.execute({ actor: student, interestId: "int-1", decision: "ACCEPT" });

    expect(result.status).toBe("ACCEPTED");
    expect(result.respondedAt).not.toBeNull();

    const facilitationNotifications = notificationService.sent.filter((n) => n.template === "INTEREST_FACILITATION_REQUIRED");
    expect(facilitationNotifications).toHaveLength(2);
    expect(facilitationNotifications.map((n) => n.recipientUserId).sort()).toEqual(["sec-1", "sec-2"]);
    for (const notification of facilitationNotifications) {
      expect(notification.context).toEqual({ studentName: "Alice Architect", companyName: "Acme Architects" });
    }
  });

  it("V4.0 E2 — declines a SENT request and notifies the recruiter (no Secretary facilitation needed)", async () => {
    const result = await useCase.execute({ actor: student, interestId: "int-1", decision: "DECLINE" });

    expect(result.status).toBe("DECLINED");
    expect(result.respondedAt).not.toBeNull();
    expect(notificationService.sent).toHaveLength(1);
    expect(notificationService.sent[0]).toMatchObject({
      recipientUserId: "rec-1",
      template: "RECRUITER_INTEREST_RESPONDED",
      context: { studentName: "Alice Architect", decision: "DECLINED" },
    });
  });

  it("V4.0 E2 — notifies the recruiter of the outcome on ACCEPT too", async () => {
    await useCase.execute({ actor: student, interestId: "int-1", decision: "ACCEPT" });

    expect(notificationService.sent).toContainEqual(
      expect.objectContaining({
        recipientUserId: "rec-1",
        template: "RECRUITER_INTEREST_RESPONDED",
        context: { studentName: "Alice Architect", decision: "ACCEPTED" },
      }),
    );
  });

  it("rejects a second response to the same request", async () => {
    await useCase.execute({ actor: student, interestId: "int-1", decision: "ACCEPT" });
    await expect(
      useCase.execute({ actor: student, interestId: "int-1", decision: "DECLINE" }),
    ).rejects.toBeInstanceOf(InterestRequestAlreadyRespondedError);
  });

  it("throws InterestRequestNotFoundError for an unknown id", async () => {
    await expect(
      useCase.execute({ actor: student, interestId: "unknown", decision: "ACCEPT" }),
    ).rejects.toBeInstanceOf(InterestRequestNotFoundError);
  });

  it("denies a student responding to another student's interest request", async () => {
    await expect(
      useCase.execute({ actor: otherStudent, interestId: "int-1", decision: "ACCEPT" }),
    ).rejects.toBeInstanceOf(NotAuthorizedError);
  });

  it("denies a non-Student actor", async () => {
    await expect(
      useCase.execute({ actor: recruiterActor, interestId: "int-1", decision: "ACCEPT" }),
    ).rejects.toBeInstanceOf(NotAuthorizedError);
  });
});
