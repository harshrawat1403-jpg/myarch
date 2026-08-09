import { beforeEach, describe, expect, it } from "vitest";
import type { AuthenticatedActor } from "../../../src/modules/auth";
import type { PlacementDriveRecord } from "../../../src/modules/placements/domain/entities";
import { UpdateApplicationStatusUseCase } from "../../../src/modules/placements/application/use-cases/update-application-status";
import {
  ApplicationNotFoundError,
  InvalidApplicationStatusTransitionError,
} from "../../../src/modules/placements/domain/errors";
import { NotAuthorizedError } from "../../../src/lib/errors";
import { InMemoryPlacementDriveRepository } from "../../support/fakes/in-memory-placement-drive-repository";
import { InMemoryApplicationRepository } from "../../support/fakes/in-memory-application-repository";
import { FakeStudentEligibilityLookup } from "../../support/fakes/fake-student-eligibility-lookup";
import { InMemoryInternshipOutcomeRepository } from "../../support/fakes/in-memory-internship-outcome-repository";
import { FakeAuditRecorder } from "../../support/fakes/fake-audit-recorder";
import { FakeNotificationService } from "../../support/fakes/fake-notification-service";

const secretary: AuthenticatedActor = { userId: "sec-1", role: "SECRETARY" };
const scopedCoordinator: AuthenticatedActor = { userId: "coord-1", role: "COORDINATOR", batchScope: ["batch-a"] };
const unscopedCoordinator: AuthenticatedActor = { userId: "coord-2", role: "COORDINATOR", batchScope: ["batch-z"] };
const student: AuthenticatedActor = { userId: "stu-1", role: "STUDENT", studentProfileId: "s1" };

const DRIVE: PlacementDriveRecord = {
  id: "drive-a",
  companyId: "company-1",
  companyName: "Acme Architects",
  title: "Drive A",
  type: "PLACEMENT",
  eligibility: { eligibleBatchIds: ["batch-a"] },
  packageOrStipend: null,
  description: null,
  status: "ANNOUNCED",
  applicationDeadline: null,
  createdByUserId: "sec-1",
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe("UpdateApplicationStatusUseCase", () => {
  let placementDriveRepository: InMemoryPlacementDriveRepository;
  let applicationRepository: InMemoryApplicationRepository;
  let studentEligibilityLookup: FakeStudentEligibilityLookup;
  let internshipOutcomeRepository: InMemoryInternshipOutcomeRepository;
  let auditRecorder: FakeAuditRecorder;
  let notificationService: FakeNotificationService;
  let useCase: UpdateApplicationStatusUseCase;

  beforeEach(async () => {
    placementDriveRepository = new InMemoryPlacementDriveRepository();
    placementDriveRepository.seed(DRIVE);
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
    internshipOutcomeRepository = new InMemoryInternshipOutcomeRepository();
    auditRecorder = new FakeAuditRecorder();
    notificationService = new FakeNotificationService();
    useCase = new UpdateApplicationStatusUseCase({
      applicationRepository,
      placementDriveRepository,
      studentEligibilityLookup,
      internshipOutcomeRepository,
      auditRecorder,
      notificationService,
    });
  });

  it("moves an application forward through the pipeline and records the transition", async () => {
    const applications = await applicationRepository.listForStudent("s1");
    const applicationId = applications[0]!.id;

    const updated = await useCase.execute({ actor: secretary, applicationId, toStatus: "SHORTLISTED" });
    expect(updated.currentStatus).toBe("SHORTLISTED");

    const events = await applicationRepository.listStatusEvents(applicationId);
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ fromStatus: "APPLIED", toStatus: "SHORTLISTED" });
  });

  it("V4.0 E2 — notifies the applying student of the status change (APPLICATION_STATUS_CHANGED)", async () => {
    const applications = await applicationRepository.listForStudent("s1");
    await useCase.execute({ actor: secretary, applicationId: applications[0]!.id, toStatus: "SHORTLISTED" });

    expect(notificationService.sent).toHaveLength(1);
    expect(notificationService.sent[0]).toMatchObject({
      recipientUserId: "user-batch-a",
      template: "APPLICATION_STATUS_CHANGED",
      context: { companyName: "Acme Architects", title: "Drive A", toStatus: "SHORTLISTED" },
    });
  });

  it("allows a Coordinator scoped to the applicant's batch", async () => {
    const applications = await applicationRepository.listForStudent("s1");
    const updated = await useCase.execute({
      actor: scopedCoordinator,
      applicationId: applications[0]!.id,
      toStatus: "SHORTLISTED",
    });
    expect(updated.currentStatus).toBe("SHORTLISTED");
  });

  it("denies a Coordinator not scoped to the applicant's batch", async () => {
    const applications = await applicationRepository.listForStudent("s1");
    await expect(
      useCase.execute({ actor: unscopedCoordinator, applicationId: applications[0]!.id, toStatus: "SHORTLISTED" }),
    ).rejects.toBeInstanceOf(NotAuthorizedError);
  });

  it("denies a Student", async () => {
    const applications = await applicationRepository.listForStudent("s1");
    await expect(
      useCase.execute({ actor: student, applicationId: applications[0]!.id, toStatus: "SHORTLISTED" }),
    ).rejects.toBeInstanceOf(NotAuthorizedError);
  });

  it("rejects skipping a stage (APPLIED straight to OFFER)", async () => {
    const applications = await applicationRepository.listForStudent("s1");
    await expect(
      useCase.execute({ actor: secretary, applicationId: applications[0]!.id, toStatus: "OFFER" }),
    ).rejects.toBeInstanceOf(InvalidApplicationStatusTransitionError);
  });

  it("rejects moving to ACTIVE on a PLACEMENT drive (internship-only state)", async () => {
    const applications = await applicationRepository.listForStudent("s1");
    const applicationId = applications[0]!.id;
    await useCase.execute({ actor: secretary, applicationId, toStatus: "SHORTLISTED" });
    await useCase.execute({ actor: secretary, applicationId, toStatus: "INTERVIEW" });
    await useCase.execute({ actor: secretary, applicationId, toStatus: "OFFER" });
    await useCase.execute({ actor: secretary, applicationId, toStatus: "ACCEPTED" });
    await expect(
      useCase.execute({ actor: secretary, applicationId, toStatus: "ACTIVE" }),
    ).rejects.toBeInstanceOf(InvalidApplicationStatusTransitionError);
  });

  it("throws ApplicationNotFoundError for an unknown application", async () => {
    await expect(
      useCase.execute({ actor: secretary, applicationId: "unknown", toStatus: "SHORTLISTED" }),
    ).rejects.toBeInstanceOf(ApplicationNotFoundError);
  });

  it("records an APPLICATION_STATUS_CHANGED audit entry", async () => {
    const applications = await applicationRepository.listForStudent("s1");
    await useCase.execute({ actor: secretary, applicationId: applications[0]!.id, toStatus: "SHORTLISTED" });
    expect(auditRecorder.entries[0]).toMatchObject({ action: "APPLICATION_STATUS_CHANGED" });
  });

  describe("InternshipOutcome lifecycle (V4.0 D4)", () => {
    beforeEach(() => {
      placementDriveRepository.seed({ ...DRIVE, id: "drive-internship", type: "INTERNSHIP" });
    });

    async function walkToActive(): Promise<string> {
      const application = await applicationRepository.create("s1", "drive-internship");
      await useCase.execute({ actor: secretary, applicationId: application.id, toStatus: "SHORTLISTED" });
      await useCase.execute({ actor: secretary, applicationId: application.id, toStatus: "INTERVIEW" });
      await useCase.execute({ actor: secretary, applicationId: application.id, toStatus: "OFFER" });
      await useCase.execute({ actor: secretary, applicationId: application.id, toStatus: "ACCEPTED" });
      await useCase.execute({ actor: secretary, applicationId: application.id, toStatus: "ACTIVE" });
      return application.id;
    }

    it("automatically creates an InternshipOutcome once an application reaches ACTIVE", async () => {
      const applicationId = await walkToActive();
      const outcome = await internshipOutcomeRepository.findByApplicationId(applicationId);
      expect(outcome).not.toBeNull();
      expect(outcome!.completedAt).toBeNull();
    });

    it("never creates an InternshipOutcome for a PLACEMENT drive (ACTIVE is unreachable there)", async () => {
      const applications = await applicationRepository.listForStudent("s1");
      const applicationId = applications[0]!.id;
      await useCase.execute({ actor: secretary, applicationId, toStatus: "SHORTLISTED" });
      const outcome = await internshipOutcomeRepository.findByApplicationId(applicationId);
      expect(outcome).toBeNull();
    });

    it("stamps completedAt on the existing InternshipOutcome once the application reaches COMPLETED", async () => {
      const applicationId = await walkToActive();
      const updated = await useCase.execute({ actor: secretary, applicationId, toStatus: "COMPLETED" });
      expect(updated.currentStatus).toBe("COMPLETED");

      const outcome = await internshipOutcomeRepository.findByApplicationId(applicationId);
      expect(outcome!.completedAt).not.toBeNull();
    });
  });
});
