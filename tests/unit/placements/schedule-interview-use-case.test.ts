import { beforeEach, describe, expect, it } from "vitest";
import type { AuthenticatedActor } from "../../../src/modules/auth";
import { ScheduleInterviewUseCase } from "../../../src/modules/placements/application/use-cases/schedule-interview";
import { ApplicationNotFoundError, InterviewNotSchedulableError } from "../../../src/modules/placements/domain/errors";
import { NotAuthorizedError } from "../../../src/lib/errors";
import { InMemoryApplicationRepository } from "../../support/fakes/in-memory-application-repository";
import { FakeStudentEligibilityLookup } from "../../support/fakes/fake-student-eligibility-lookup";

const secretary: AuthenticatedActor = { userId: "sec-1", role: "SECRETARY" };
const scopedCoordinator: AuthenticatedActor = { userId: "coord-1", role: "COORDINATOR", batchScope: ["batch-a"] };
const unscopedCoordinator: AuthenticatedActor = { userId: "coord-2", role: "COORDINATOR", batchScope: ["batch-z"] };
const student: AuthenticatedActor = { userId: "stu-1", role: "STUDENT", studentProfileId: "s1" };

describe("ScheduleInterviewUseCase", () => {
  let applicationRepository: InMemoryApplicationRepository;
  let studentEligibilityLookup: FakeStudentEligibilityLookup;
  let useCase: ScheduleInterviewUseCase;

  beforeEach(async () => {
    applicationRepository = new InMemoryApplicationRepository();
    await applicationRepository.create("s1", "drive-a");
    studentEligibilityLookup = new FakeStudentEligibilityLookup();
    studentEligibilityLookup.seed("s1", {
      userId: "user-batch-a",
      batchId: "batch-a",
      batchName: "B.Arch 2026",
      fullName: "Test Student",
      cgpa: 8.0,
      hasActiveBacklog: false,
    });
    useCase = new ScheduleInterviewUseCase({ applicationRepository, studentEligibilityLookup });
  });

  it("schedules an interview for a Secretary", async () => {
    const applications = await applicationRepository.listForStudent("s1");
    const scheduledAt = new Date("2026-02-01T10:00:00.000Z");
    const updated = await useCase.execute({ actor: secretary, applicationId: applications[0]!.id, scheduledAt, mode: "ONLINE" });
    expect(updated.interviewScheduledAt).toEqual(scheduledAt);
    expect(updated.interviewMode).toBe("ONLINE");
  });

  it("allows a Coordinator scoped to the applicant's batch", async () => {
    const applications = await applicationRepository.listForStudent("s1");
    const updated = await useCase.execute({
      actor: scopedCoordinator,
      applicationId: applications[0]!.id,
      scheduledAt: new Date(),
      mode: "IN_PERSON",
    });
    expect(updated.interviewMode).toBe("IN_PERSON");
  });

  it("denies a Coordinator not scoped to the applicant's batch", async () => {
    const applications = await applicationRepository.listForStudent("s1");
    await expect(
      useCase.execute({ actor: unscopedCoordinator, applicationId: applications[0]!.id, scheduledAt: new Date(), mode: "PHONE" }),
    ).rejects.toBeInstanceOf(NotAuthorizedError);
  });

  it("denies a Student", async () => {
    const applications = await applicationRepository.listForStudent("s1");
    await expect(
      useCase.execute({ actor: student, applicationId: applications[0]!.id, scheduledAt: new Date(), mode: "PHONE" }),
    ).rejects.toBeInstanceOf(NotAuthorizedError);
  });

  it("can reschedule an already-scheduled interview", async () => {
    const applications = await applicationRepository.listForStudent("s1");
    await useCase.execute({ actor: secretary, applicationId: applications[0]!.id, scheduledAt: new Date("2026-02-01T10:00:00.000Z"), mode: "ONLINE" });
    const rescheduled = await useCase.execute({
      actor: secretary,
      applicationId: applications[0]!.id,
      scheduledAt: new Date("2026-02-05T14:00:00.000Z"),
      mode: "IN_PERSON",
    });
    expect(rescheduled.interviewMode).toBe("IN_PERSON");
    expect(rescheduled.interviewScheduledAt).toEqual(new Date("2026-02-05T14:00:00.000Z"));
  });

  it("rejects scheduling for an application already in a terminal state", async () => {
    const applications = await applicationRepository.listForStudent("s1");
    await applicationRepository.transitionStatus(applications[0]!.id, "APPLIED", "REJECTED", "sec-1", null);
    await expect(
      useCase.execute({ actor: secretary, applicationId: applications[0]!.id, scheduledAt: new Date(), mode: "ONLINE" }),
    ).rejects.toBeInstanceOf(InterviewNotSchedulableError);
  });

  it("throws ApplicationNotFoundError for an unknown application", async () => {
    await expect(
      useCase.execute({ actor: secretary, applicationId: "unknown", scheduledAt: new Date(), mode: "ONLINE" }),
    ).rejects.toBeInstanceOf(ApplicationNotFoundError);
  });
});
