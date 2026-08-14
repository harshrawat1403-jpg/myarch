import { beforeEach, describe, expect, it, vi } from "vitest";
import { AddRequestAttachmentUseCase } from "../../../src/modules/requests/application/use-cases/add-attachment";
import { InvalidRequestAttachmentError, RequestNotFoundError } from "../../../src/modules/requests";
import { NotAuthorizedError } from "../../../src/lib/errors";
import { InMemoryRequestRepository } from "../../support/fakes/in-memory-request-repository";
import { InMemoryRequestAttachmentRepository } from "../../support/fakes/in-memory-request-attachment-repository";
import { FakeAuditRecorder } from "../../support/fakes/fake-audit-recorder";
import type { AuthenticatedActor } from "../../../src/modules/auth";
import type { RequestRecord } from "../../../src/modules/requests";

const STUDENT: AuthenticatedActor = { userId: "stu-1", role: "STUDENT", studentProfileId: "sp-1" };
const OTHER_STUDENT: AuthenticatedActor = { userId: "stu-2", role: "STUDENT", studentProfileId: "sp-2" };

function buildContext() {
  const requestRepository = new InMemoryRequestRepository();
  requestRepository.seed({
    id: "req-1",
    type: "Equipment loan",
    description: "Need a DSLR",
    priority: "MEDIUM",
    status: "SUBMITTED",
    requesterId: "stu-1",
    ownerId: null,
    deadline: null,
    taskId: null,
    decision: null,
    decisionReason: null,
    decidedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  } satisfies RequestRecord);
  const requestAttachmentRepository = new InMemoryRequestAttachmentRepository();
  const auditRecorder = new FakeAuditRecorder();
  const saveFile = vi.fn().mockResolvedValue(undefined);
  const useCase = new AddRequestAttachmentUseCase({ requestRepository, requestAttachmentRepository, auditRecorder, saveFile });
  return { useCase, saveFile };
}

describe("AddRequestAttachmentUseCase", () => {
  let ctx: ReturnType<typeof buildContext>;

  beforeEach(() => {
    ctx = buildContext();
  });

  it("stores a valid PDF attachment", async () => {
    const attachment = await ctx.useCase.execute({
      actor: STUDENT,
      requestId: "req-1",
      data: Buffer.from("fake-pdf"),
      mimeType: "application/pdf",
      sizeBytes: 2048,
    });
    expect(attachment.mimeType).toBe("application/pdf");
    expect(ctx.saveFile).toHaveBeenCalledOnce();
  });

  it("rejects an unsupported mime type", async () => {
    await expect(
      ctx.useCase.execute({ actor: STUDENT, requestId: "req-1", data: Buffer.from("x"), mimeType: "video/mp4", sizeBytes: 10 }),
    ).rejects.toBeInstanceOf(InvalidRequestAttachmentError);
  });

  it("denies a Student with no view access", async () => {
    await expect(
      ctx.useCase.execute({ actor: OTHER_STUDENT, requestId: "req-1", data: Buffer.from("x"), mimeType: "image/png", sizeBytes: 10 }),
    ).rejects.toBeInstanceOf(NotAuthorizedError);
  });

  it("throws RequestNotFoundError for an unknown request", async () => {
    await expect(
      ctx.useCase.execute({ actor: STUDENT, requestId: "unknown", data: Buffer.from("x"), mimeType: "image/png", sizeBytes: 10 }),
    ).rejects.toBeInstanceOf(RequestNotFoundError);
  });
});
