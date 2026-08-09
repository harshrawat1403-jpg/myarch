import { beforeEach, describe, expect, it } from "vitest";
import type { AuthenticatedActor } from "../../../src/modules/auth";
import type { RecruiterStudentProfileDTO } from "../../../src/modules/recruiters/domain/entities";
import { ExpressInterestUseCase } from "../../../src/modules/recruiters/application/use-cases/express-interest";
import { ApprovedProfileNotFoundError, RecruiterProfileNotFoundError } from "../../../src/modules/recruiters/domain/errors";
import { NotAuthorizedError } from "../../../src/lib/errors";
import { InMemoryRecruiterDirectoryRepository } from "../../support/fakes/in-memory-recruiter-directory-repository";
import { InMemoryRecruiterInterestRepository } from "../../support/fakes/in-memory-recruiter-interest-repository";
import { FakeRecruiterSelfLookup } from "../../support/fakes/fake-recruiter-self-lookup";
import { FakeStudentNameLookup } from "../../support/fakes/fake-student-name-lookup";
import { FakeNotificationService } from "../../support/fakes/fake-notification-service";

const recruiter: AuthenticatedActor = { userId: "rec-1", role: "RECRUITER" };
const secretary: AuthenticatedActor = { userId: "sec-1", role: "SECRETARY" };
const student: AuthenticatedActor = { userId: "stu-1", role: "STUDENT", studentProfileId: "s1" };

const APPROVED: RecruiterStudentProfileDTO = {
  studentId: "s1",
  fullName: "Alice Architect",
  batchId: "batch-a",
  batchName: "B.Arch 2026",
  bio: null,
  skills: [],
  software: [],
  selectedProjects: [],
  portfolioLinks: [],
  certifications: [],
  internships: [],
  hasResume: false,
  profilePhotoUrl: null,
  isSaved: false,
  isShortlisted: false,
  interestStatus: null,
};

describe("ExpressInterestUseCase", () => {
  let directoryRepository: InMemoryRecruiterDirectoryRepository;
  let interestRepository: InMemoryRecruiterInterestRepository;
  let recruiterSelfLookup: FakeRecruiterSelfLookup;
  let studentNameLookup: FakeStudentNameLookup;
  let notificationService: FakeNotificationService;
  let useCase: ExpressInterestUseCase;

  beforeEach(() => {
    directoryRepository = new InMemoryRecruiterDirectoryRepository();
    directoryRepository.seedApproved(APPROVED);
    interestRepository = new InMemoryRecruiterInterestRepository();
    recruiterSelfLookup = new FakeRecruiterSelfLookup();
    recruiterSelfLookup.seed("rec-1", "recruiter-profile-1", "Acme Architects");
    studentNameLookup = new FakeStudentNameLookup();
    studentNameLookup.seed("s1", "Alice Architect", "user-s1");
    notificationService = new FakeNotificationService();
    useCase = new ExpressInterestUseCase({ directoryRepository, interestRepository, recruiterSelfLookup, studentNameLookup, notificationService });
  });

  it("creates a SENT interest request with the optional message", async () => {
    const result = await useCase.execute({ actor: recruiter, studentId: "s1", message: "Great portfolio!" });
    expect(result.status).toBe("SENT");
    expect(result.message).toBe("Great portfolio!");
  });

  it("creates a request with a null message when none is given", async () => {
    const result = await useCase.execute({ actor: recruiter, studentId: "s1" });
    expect(result.message).toBeNull();
  });

  it("is idempotent — a second attempt returns the SAME row, never creates a duplicate (§8 step 4)", async () => {
    const first = await useCase.execute({ actor: recruiter, studentId: "s1", message: "First message" });
    const second = await useCase.execute({ actor: recruiter, studentId: "s1", message: "Different message" });
    expect(second.id).toBe(first.id);
    expect(second.message).toBe("First message");

    const all = await interestRepository.findManyForRecruiter("recruiter-profile-1", ["s1"]);
    expect(all).toHaveLength(1);
  });

  it("V4.0 E2 — notifies the student on real creation (RECRUITER_INTEREST_RECEIVED)", async () => {
    await useCase.execute({ actor: recruiter, studentId: "s1" });

    expect(notificationService.sent).toHaveLength(1);
    expect(notificationService.sent[0]).toMatchObject({
      recipientUserId: "user-s1",
      template: "RECRUITER_INTEREST_RECEIVED",
      context: { companyName: "Acme Architects" },
    });
  });

  it("V4.0 E2 — does NOT re-notify on an idempotent repeat tap", async () => {
    await useCase.execute({ actor: recruiter, studentId: "s1" });
    await useCase.execute({ actor: recruiter, studentId: "s1" });

    expect(notificationService.sent).toHaveLength(1);
  });

  it("denies a Secretary", async () => {
    await expect(useCase.execute({ actor: secretary, studentId: "s1" })).rejects.toBeInstanceOf(NotAuthorizedError);
  });

  it("denies a Student", async () => {
    await expect(useCase.execute({ actor: student, studentId: "s1" })).rejects.toBeInstanceOf(NotAuthorizedError);
  });

  it("throws ApprovedProfileNotFoundError for a student the recruiter cannot see", async () => {
    await expect(useCase.execute({ actor: recruiter, studentId: "unknown" })).rejects.toBeInstanceOf(
      ApprovedProfileNotFoundError,
    );
  });

  it("throws RecruiterProfileNotFoundError when the actor has no resolvable RecruiterProfile", async () => {
    const orphanRecruiter: AuthenticatedActor = { userId: "rec-orphan", role: "RECRUITER" };
    await expect(useCase.execute({ actor: orphanRecruiter, studentId: "s1" })).rejects.toBeInstanceOf(
      RecruiterProfileNotFoundError,
    );
  });

  it("different recruiters expressing interest in the same student each get their own row", async () => {
    recruiterSelfLookup.seed("rec-2", "recruiter-profile-2");
    const otherRecruiter: AuthenticatedActor = { userId: "rec-2", role: "RECRUITER" };

    const first = await useCase.execute({ actor: recruiter, studentId: "s1" });
    const second = await useCase.execute({ actor: otherRecruiter, studentId: "s1" });
    expect(first.id).not.toBe(second.id);
    expect(first.recruiterProfileId).toBe("recruiter-profile-1");
    expect(second.recruiterProfileId).toBe("recruiter-profile-2");
  });
});
