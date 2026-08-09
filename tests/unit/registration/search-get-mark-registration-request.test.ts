import { beforeEach, describe, expect, it } from "vitest";
import { SearchRegistrationRequestsUseCase } from "../../../src/modules/registration/application/use-cases/search-registration-requests";
import { GetRegistrationRequestUseCase } from "../../../src/modules/registration/application/use-cases/get-registration-request";
import { MarkRegistrationRequestUseCase } from "../../../src/modules/registration/application/use-cases/mark-registration-request";
import {
  InvalidRegistrationTransitionError,
  RegistrationRequestNotFoundError,
} from "../../../src/modules/registration/domain/errors";
import { NotAuthorizedError } from "../../../src/lib/errors";
import { InMemoryRegistrationRequestRepository } from "../../support/fakes/in-memory-registration-request-repository";
import { FakeAuditRecorder } from "../../support/fakes/fake-audit-recorder";
import { FakeRegistrationReviewerLookup } from "../../support/fakes/fake-registration-reviewer-lookup";
import { FakeNotificationService } from "../../support/fakes/fake-notification-service";
import type { AuthenticatedActor } from "../../../src/modules/auth";
import type { RegistrationRequestRecord } from "../../../src/modules/registration";

const BATCH_A = "batch-a";
const BATCH_B = "batch-b";
const SECRETARY: AuthenticatedActor = { userId: "sec-1", role: "SECRETARY" };
const COORDINATOR_A: AuthenticatedActor = { userId: "coord-a", role: "COORDINATOR", batchScope: [BATCH_A] };
const COORDINATOR_B: AuthenticatedActor = { userId: "coord-b", role: "COORDINATOR", batchScope: [BATCH_B] };
const STUDENT: AuthenticatedActor = { userId: "stu-1", role: "STUDENT", studentProfileId: "s-1" };

function makeRecord(overrides: Partial<RegistrationRequestRecord> = {}): RegistrationRequestRecord {
  const now = new Date();
  return {
    id: overrides.id ?? "req-1",
    email: "prospective@example.com",
    fullName: "Priya New Student",
    rollNumber: "BA2027099",
    batchId: BATCH_A,
    submittedData: {},
    status: "SUBMITTED",
    coordinatorComment: null,
    reviewedByUserId: null,
    reviewedAt: null,
    decidedByUserId: null,
    decidedAt: null,
    rejectionReason: null,
    resultingStudentProfileId: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

describe("SearchRegistrationRequestsUseCase", () => {
  let repo: InMemoryRegistrationRequestRepository;
  let useCase: SearchRegistrationRequestsUseCase;

  beforeEach(() => {
    repo = new InMemoryRegistrationRequestRepository();
    repo.seed(makeRecord({ id: "a1", batchId: BATCH_A }));
    repo.seed(makeRecord({ id: "b1", batchId: BATCH_B }));
    useCase = new SearchRegistrationRequestsUseCase({ registrationRequestRepository: repo });
  });

  it("Secretary sees requests across every batch", async () => {
    const results = await useCase.execute({ actor: SECRETARY, filters: {} });
    expect(results.map((r) => r.id).sort()).toEqual(["a1", "b1"]);
  });

  it("Coordinator only sees requests within their own batch scope", async () => {
    const results = await useCase.execute({ actor: COORDINATOR_A, filters: {} });
    expect(results.map((r) => r.id)).toEqual(["a1"]);
  });

  it("denies a Student", async () => {
    await expect(useCase.execute({ actor: STUDENT, filters: {} })).rejects.toBeInstanceOf(NotAuthorizedError);
  });
});

describe("GetRegistrationRequestUseCase", () => {
  let repo: InMemoryRegistrationRequestRepository;
  let useCase: GetRegistrationRequestUseCase;

  beforeEach(() => {
    repo = new InMemoryRegistrationRequestRepository();
    repo.seed(makeRecord({ id: "a1", batchId: BATCH_A }));
    useCase = new GetRegistrationRequestUseCase({ registrationRequestRepository: repo });
  });

  it("allows the Secretary and an in-scope Coordinator, denies an out-of-scope Coordinator", async () => {
    await expect(useCase.execute({ actor: SECRETARY, requestId: "a1" })).resolves.toMatchObject({ id: "a1" });
    await expect(useCase.execute({ actor: COORDINATOR_A, requestId: "a1" })).resolves.toMatchObject({ id: "a1" });
    await expect(useCase.execute({ actor: COORDINATOR_B, requestId: "a1" })).rejects.toBeInstanceOf(
      NotAuthorizedError,
    );
  });

  it("throws RegistrationRequestNotFoundError for an unknown id", async () => {
    await expect(useCase.execute({ actor: SECRETARY, requestId: "missing" })).rejects.toBeInstanceOf(
      RegistrationRequestNotFoundError,
    );
  });
});

describe("MarkRegistrationRequestUseCase", () => {
  let repo: InMemoryRegistrationRequestRepository;
  let auditRecorder: FakeAuditRecorder;
  let reviewerLookup: FakeRegistrationReviewerLookup;
  let notificationService: FakeNotificationService;
  let useCase: MarkRegistrationRequestUseCase;

  beforeEach(() => {
    repo = new InMemoryRegistrationRequestRepository();
    repo.seed(makeRecord({ id: "a1", batchId: BATCH_A }));
    auditRecorder = new FakeAuditRecorder();
    reviewerLookup = new FakeRegistrationReviewerLookup();
    reviewerLookup.seedSecretaries(["sec-1"]);
    notificationService = new FakeNotificationService();
    useCase = new MarkRegistrationRequestUseCase({ registrationRequestRepository: repo, auditRecorder, reviewerLookup, notificationService });
  });

  it("records a REGISTRATION_REQUEST_MARKED audit entry", async () => {
    await useCase.execute({ actor: SECRETARY, requestId: "a1", status: "REVIEWED", comment: "fine" });
    expect(auditRecorder.entries).toContainEqual(
      expect.objectContaining({ actorUserId: "sec-1", action: "REGISTRATION_REQUEST_MARKED" }),
    );
  });

  it("V4.0 E2 — notifies every Secretary once reviewed (REGISTRATION_REVIEWED)", async () => {
    await useCase.execute({ actor: COORDINATOR_A, requestId: "a1", status: "REVIEWED", comment: "Looks good." });
    expect(notificationService.sent).toContainEqual(
      expect.objectContaining({
        recipientUserId: "sec-1",
        template: "REGISTRATION_REVIEWED",
        context: { applicantName: "Priya New Student", status: "REVIEWED", requestId: "a1" },
      }),
    );
  });

  it("an in-scope Coordinator can mark REVIEWED with a comment", async () => {
    const updated = await useCase.execute({
      actor: COORDINATOR_A,
      requestId: "a1",
      status: "REVIEWED",
      comment: "Looks good.",
    });
    expect(updated.status).toBe("REVIEWED");
    expect(updated.coordinatorComment).toBe("Looks good.");
    expect(updated.reviewedByUserId).toBe("coord-a");
  });

  it("an in-scope Coordinator can mark NEEDS_ATTENTION", async () => {
    const updated = await useCase.execute({
      actor: COORDINATOR_A,
      requestId: "a1",
      status: "NEEDS_ATTENTION",
      comment: "Roll number looks off.",
    });
    expect(updated.status).toBe("NEEDS_ATTENTION");
  });

  it("denies an out-of-scope Coordinator", async () => {
    await expect(
      useCase.execute({ actor: COORDINATOR_B, requestId: "a1", status: "REVIEWED", comment: "x" }),
    ).rejects.toBeInstanceOf(NotAuthorizedError);
  });

  it("denies a Student", async () => {
    await expect(
      useCase.execute({ actor: STUDENT, requestId: "a1", status: "REVIEWED", comment: "x" }),
    ).rejects.toBeInstanceOf(NotAuthorizedError);
  });

  it("rejects an empty comment", async () => {
    await expect(
      useCase.execute({ actor: SECRETARY, requestId: "a1", status: "REVIEWED", comment: "   " }),
    ).rejects.toBeInstanceOf(InvalidRegistrationTransitionError);
  });

  it("rejects marking a request that has already been decided", async () => {
    repo.seed(makeRecord({ id: "decided-1", batchId: BATCH_A, status: "APPROVED" }));
    await expect(
      useCase.execute({ actor: SECRETARY, requestId: "decided-1", status: "REVIEWED", comment: "x" }),
    ).rejects.toBeInstanceOf(InvalidRegistrationTransitionError);
  });

  it("throws RegistrationRequestNotFoundError for an unknown id", async () => {
    await expect(
      useCase.execute({ actor: SECRETARY, requestId: "missing", status: "REVIEWED", comment: "x" }),
    ).rejects.toBeInstanceOf(RegistrationRequestNotFoundError);
  });

  it("the Secretary can also mark (unscoped)", async () => {
    const updated = await useCase.execute({
      actor: SECRETARY,
      requestId: "a1",
      status: "REVIEWED",
      comment: "Secretary comment.",
    });
    expect(updated.reviewedByUserId).toBe("sec-1");
  });
});
