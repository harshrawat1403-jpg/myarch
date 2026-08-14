import { beforeEach, describe, expect, it, vi } from "vitest";
import { InMemoryRequestRepository } from "../../support/fakes/in-memory-request-repository";
import { FakeAuditRecorder } from "../../support/fakes/fake-audit-recorder";
import { FakeNotificationService } from "../../support/fakes/fake-notification-service";
import { FakeUserRoleLookup } from "../../support/fakes/fake-user-role-lookup";
import type { AuthenticatedActor } from "../../../src/modules/auth";
import type { RequestRecord } from "../../../src/modules/requests";
import { RequestAlreadyDecidedError, RequestNotApprovedError } from "../../../src/modules/requests";
import { NotAuthorizedError } from "../../../src/lib/errors";
import { StartRequestReviewUseCase } from "../../../src/modules/requests/application/use-cases/start-review";
import { DecideRequestUseCase } from "../../../src/modules/requests/application/use-cases/decide-request";
import { AssignRequestUseCase } from "../../../src/modules/requests/application/use-cases/assign-request";
import { StartRequestProgressUseCase } from "../../../src/modules/requests/application/use-cases/start-progress";
import { CompleteRequestUseCase } from "../../../src/modules/requests/application/use-cases/complete-request";
import { CloseRequestUseCase } from "../../../src/modules/requests/application/use-cases/close-request";
import * as taskEngineBridge from "../../../src/modules/requests/application/task-engine-bridge";

vi.mock("../../../src/modules/requests/application/task-engine-bridge", () => ({
  createLinkedTask: vi.fn().mockResolvedValue({ id: "task-1" }),
  setLinkedTaskStatus: vi.fn().mockResolvedValue({ id: "task-1" }),
  reassignLinkedTask: vi.fn().mockResolvedValue({ id: "task-1" }),
  updateLinkedTaskDeadline: vi.fn().mockResolvedValue({ id: "task-1" }),
}));

const SECRETARY: AuthenticatedActor = { userId: "sec-1", role: "SECRETARY" };

function record(overrides: Partial<RequestRecord> = {}): RequestRecord {
  const now = new Date();
  return {
    id: "req-1",
    type: "Equipment loan",
    description: "Need a DSLR for the exhibition",
    priority: "MEDIUM",
    status: "SUBMITTED",
    requesterId: "stu-1",
    ownerId: null,
    deadline: null,
    taskId: null,
    decision: null,
    decisionReason: null,
    decidedAt: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

describe("Request workflow — full lifecycle end to end", () => {
  let repo: InMemoryRequestRepository;
  let userRoleLookup: FakeUserRoleLookup;
  let auditRecorder: FakeAuditRecorder;
  let notificationService: FakeNotificationService;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(taskEngineBridge.createLinkedTask).mockResolvedValue({ id: "task-1" } as never);
    repo = new InMemoryRequestRepository();
    repo.seed(record());
    userRoleLookup = new FakeUserRoleLookup();
    userRoleLookup.seed("coord-1", "COORDINATOR");
    auditRecorder = new FakeAuditRecorder();
    notificationService = new FakeNotificationService();
  });

  it("SUBMITTED → REVIEW → (approve) → ASSIGNED → IN_PROGRESS → COMPLETED → CLOSED", async () => {
    const review = new StartRequestReviewUseCase({ requestRepository: repo, auditRecorder });
    const decide = new DecideRequestUseCase({ requestRepository: repo, notificationService, auditRecorder });
    const assign = new AssignRequestUseCase({ requestRepository: repo, userRoleLookup, auditRecorder });
    const startProgress = new StartRequestProgressUseCase({ requestRepository: repo, auditRecorder });
    const complete = new CompleteRequestUseCase({ requestRepository: repo, auditRecorder });
    const close = new CloseRequestUseCase({ requestRepository: repo, auditRecorder });

    let request = await review.execute({ actor: SECRETARY, requestId: "req-1" });
    expect(request.status).toBe("REVIEW");

    request = await decide.execute({ actor: SECRETARY, requestId: "req-1", decision: "APPROVED" });
    expect(request.decision).toBe("APPROVED");
    expect(request.status).toBe("REVIEW");
    expect(notificationService.sent).toContainEqual(
      expect.objectContaining({ recipientUserId: "stu-1", template: "REQUEST_DECIDED", context: expect.objectContaining({ decision: "APPROVED" }) }),
    );

    request = await assign.execute({ actor: SECRETARY, requestId: "req-1", ownerId: "coord-1" });
    expect(request.status).toBe("ASSIGNED");
    expect(request.taskId).toBe("task-1");

    request = await startProgress.execute({ actor: SECRETARY, requestId: "req-1" });
    expect(request.status).toBe("IN_PROGRESS");

    request = await complete.execute({ actor: SECRETARY, requestId: "req-1" });
    expect(request.status).toBe("COMPLETED");
    expect(taskEngineBridge.setLinkedTaskStatus).toHaveBeenCalledWith(SECRETARY, "task-1", "DONE");

    request = await close.execute({ actor: SECRETARY, requestId: "req-1" });
    expect(request.status).toBe("CLOSED");
  });

  it("REVIEW + reject closes the request immediately without ever assigning an owner", async () => {
    const review = new StartRequestReviewUseCase({ requestRepository: repo, auditRecorder });
    const decide = new DecideRequestUseCase({ requestRepository: repo, notificationService, auditRecorder });

    await review.execute({ actor: SECRETARY, requestId: "req-1" });
    const request = await decide.execute({ actor: SECRETARY, requestId: "req-1", decision: "REJECTED", decisionReason: "Not in budget" });

    expect(request.decision).toBe("REJECTED");
    expect(request.status).toBe("CLOSED");
    expect(notificationService.sent).toContainEqual(
      expect.objectContaining({ recipientUserId: "stu-1", template: "REQUEST_DECIDED", context: expect.objectContaining({ decision: "REJECTED" }) }),
    );
  });

  it("rejects assigning a request that hasn't been approved", async () => {
    const review = new StartRequestReviewUseCase({ requestRepository: repo, auditRecorder });
    const assign = new AssignRequestUseCase({ requestRepository: repo, userRoleLookup, auditRecorder });

    await review.execute({ actor: SECRETARY, requestId: "req-1" });
    await expect(assign.execute({ actor: SECRETARY, requestId: "req-1", ownerId: "coord-1" })).rejects.toBeInstanceOf(
      RequestNotApprovedError,
    );
  });

  it("rejects deciding an already-decided request", async () => {
    const review = new StartRequestReviewUseCase({ requestRepository: repo, auditRecorder });
    const decide = new DecideRequestUseCase({ requestRepository: repo, notificationService, auditRecorder });

    await review.execute({ actor: SECRETARY, requestId: "req-1" });
    await decide.execute({ actor: SECRETARY, requestId: "req-1", decision: "APPROVED" });
    await expect(decide.execute({ actor: SECRETARY, requestId: "req-1", decision: "APPROVED" })).rejects.toBeInstanceOf(
      RequestAlreadyDecidedError,
    );
  });

  it("denies a Student from deciding a request", async () => {
    const STUDENT: AuthenticatedActor = { userId: "stu-1", role: "STUDENT", studentProfileId: "sp-1" };
    const review = new StartRequestReviewUseCase({ requestRepository: repo, auditRecorder });
    const decide = new DecideRequestUseCase({ requestRepository: repo, notificationService, auditRecorder });

    await review.execute({ actor: SECRETARY, requestId: "req-1" });
    await expect(decide.execute({ actor: STUDENT, requestId: "req-1", decision: "APPROVED" })).rejects.toBeInstanceOf(
      NotAuthorizedError,
    );
  });
});
