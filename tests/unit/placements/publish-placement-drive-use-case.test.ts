import { beforeEach, describe, expect, it } from "vitest";
import type { AuthenticatedActor } from "../../../src/modules/auth";
import type { PlacementDriveRecord } from "../../../src/modules/placements/domain/entities";
import { PublishPlacementDriveUseCase } from "../../../src/modules/placements/application/use-cases/publish-placement-drive";
import { DriveNotDraftError, PlacementDriveNotFoundError } from "../../../src/modules/placements/domain/errors";
import { NotAuthorizedError } from "../../../src/lib/errors";
import { InMemoryPlacementDriveRepository } from "../../support/fakes/in-memory-placement-drive-repository";
import { FakeAuditRecorder } from "../../support/fakes/fake-audit-recorder";
import { FakeStudentEligibilityLookup } from "../../support/fakes/fake-student-eligibility-lookup";
import { FakeNotificationService } from "../../support/fakes/fake-notification-service";

const secretary: AuthenticatedActor = { userId: "sec-1", role: "SECRETARY" };
const coordinator: AuthenticatedActor = { userId: "coord-1", role: "COORDINATOR", batchScope: ["batch-a"] };

const DRAFT_DRIVE: PlacementDriveRecord = {
  id: "drive-1",
  companyId: "company-1",
  companyName: "Acme Architects",
  title: "Campus Placement 2026",
  type: "PLACEMENT",
  eligibility: { eligibleBatchIds: ["batch-a"] },
  packageOrStipend: null,
  description: null,
  status: "DRAFT",
  applicationDeadline: null,
  createdByUserId: "sec-1",
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe("PublishPlacementDriveUseCase", () => {
  let placementDriveRepository: InMemoryPlacementDriveRepository;
  let auditRecorder: FakeAuditRecorder;
  let studentEligibilityLookup: FakeStudentEligibilityLookup;
  let notificationService: FakeNotificationService;
  let useCase: PublishPlacementDriveUseCase;

  beforeEach(() => {
    placementDriveRepository = new InMemoryPlacementDriveRepository();
    placementDriveRepository.seed(DRAFT_DRIVE);
    auditRecorder = new FakeAuditRecorder();
    studentEligibilityLookup = new FakeStudentEligibilityLookup();
    studentEligibilityLookup.seed("s1", {
      userId: "user-1",
      batchId: "batch-a",
      batchName: "B.Arch 2026",
      fullName: "Alice Architect",
      cgpa: 8.0,
      hasActiveBacklog: false,
    });
    notificationService = new FakeNotificationService();
    useCase = new PublishPlacementDriveUseCase({ placementDriveRepository, auditRecorder, studentEligibilityLookup, notificationService });
  });

  it("moves a DRAFT drive to ANNOUNCED for a Secretary", async () => {
    const published = await useCase.execute({ actor: secretary, driveId: "drive-1" });
    expect(published.status).toBe("ANNOUNCED");
  });

  it("denies a Coordinator, even one fully scoped to the drive's batches (§4 — 'no publish')", async () => {
    await expect(useCase.execute({ actor: coordinator, driveId: "drive-1" })).rejects.toBeInstanceOf(NotAuthorizedError);
  });

  it("throws DriveNotDraftError for a drive that is already ANNOUNCED", async () => {
    await useCase.execute({ actor: secretary, driveId: "drive-1" });
    await expect(useCase.execute({ actor: secretary, driveId: "drive-1" })).rejects.toBeInstanceOf(DriveNotDraftError);
  });

  it("throws PlacementDriveNotFoundError for an unknown drive", async () => {
    await expect(useCase.execute({ actor: secretary, driveId: "unknown" })).rejects.toBeInstanceOf(
      PlacementDriveNotFoundError,
    );
  });

  it("records a PLACEMENT_DRIVE_PUBLISHED audit entry", async () => {
    await useCase.execute({ actor: secretary, driveId: "drive-1" });
    expect(auditRecorder.entries[0]).toMatchObject({ action: "PLACEMENT_DRIVE_PUBLISHED" });
  });

  it("V4.0 E2 — notifies every student in the drive's eligible batches (PLACEMENT_DRIVE_ANNOUNCED)", async () => {
    await useCase.execute({ actor: secretary, driveId: "drive-1" });

    expect(notificationService.sent).toHaveLength(1);
    expect(notificationService.sent[0]).toMatchObject({
      recipientUserId: "user-1",
      template: "PLACEMENT_DRIVE_ANNOUNCED",
      context: { companyName: "Acme Architects", title: "Campus Placement 2026", type: "PLACEMENT" },
    });
  });
});
