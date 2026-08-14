import { beforeEach, describe, expect, it, vi } from "vitest";
import { AddMaintenanceAttachmentUseCase } from "../../../src/modules/maintenance/application/use-cases/add-attachment";
import { InvalidMaintenanceAttachmentError, MaintenanceIssueNotFoundError } from "../../../src/modules/maintenance";
import { NotAuthorizedError } from "../../../src/lib/errors";
import { InMemoryMaintenanceIssueRepository } from "../../support/fakes/in-memory-maintenance-issue-repository";
import { InMemoryMaintenanceAttachmentRepository } from "../../support/fakes/in-memory-maintenance-attachment-repository";
import { FakeAuditRecorder } from "../../support/fakes/fake-audit-recorder";
import type { AuthenticatedActor } from "../../../src/modules/auth";
import type { MaintenanceIssueRecord } from "../../../src/modules/maintenance";

const STUDENT: AuthenticatedActor = { userId: "stu-1", role: "STUDENT", studentProfileId: "sp-1" };
const OTHER_STUDENT: AuthenticatedActor = { userId: "stu-2", role: "STUDENT", studentProfileId: "sp-2" };

function buildContext() {
  const maintenanceIssueRepository = new InMemoryMaintenanceIssueRepository();
  maintenanceIssueRepository.seed({
    id: "issue-1",
    category: "EQUIPMENT",
    location: "Lab 1",
    description: "Broken printer",
    priority: "LOW",
    status: "SUBMITTED",
    requesterId: "stu-1",
    assigneeId: null,
    deadline: null,
    taskId: null,
    resolutionDetails: null,
    acknowledgedAt: null,
    resolvedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  } satisfies MaintenanceIssueRecord);
  const maintenanceAttachmentRepository = new InMemoryMaintenanceAttachmentRepository();
  const auditRecorder = new FakeAuditRecorder();
  const saveFile = vi.fn().mockResolvedValue(undefined);
  const useCase = new AddMaintenanceAttachmentUseCase({
    maintenanceIssueRepository,
    maintenanceAttachmentRepository,
    auditRecorder,
    saveFile,
  });
  return { useCase, saveFile };
}

describe("AddMaintenanceAttachmentUseCase", () => {
  let ctx: ReturnType<typeof buildContext>;

  beforeEach(() => {
    ctx = buildContext();
  });

  it("stores a valid JPEG attachment", async () => {
    const attachment = await ctx.useCase.execute({
      actor: STUDENT,
      issueId: "issue-1",
      data: Buffer.from("fake-image"),
      mimeType: "image/jpeg",
      sizeBytes: 1024,
    });
    expect(attachment.mimeType).toBe("image/jpeg");
    expect(ctx.saveFile).toHaveBeenCalledOnce();
  });

  it("rejects an unsupported mime type", async () => {
    await expect(
      ctx.useCase.execute({ actor: STUDENT, issueId: "issue-1", data: Buffer.from("x"), mimeType: "video/mp4", sizeBytes: 10 }),
    ).rejects.toBeInstanceOf(InvalidMaintenanceAttachmentError);
  });

  it("rejects an oversized file", async () => {
    await expect(
      ctx.useCase.execute({
        actor: STUDENT,
        issueId: "issue-1",
        data: Buffer.from("x"),
        mimeType: "image/png",
        sizeBytes: 10 * 1024 * 1024,
      }),
    ).rejects.toBeInstanceOf(InvalidMaintenanceAttachmentError);
  });

  it("denies a Student with no view access to the issue", async () => {
    await expect(
      ctx.useCase.execute({ actor: OTHER_STUDENT, issueId: "issue-1", data: Buffer.from("x"), mimeType: "image/png", sizeBytes: 10 }),
    ).rejects.toBeInstanceOf(NotAuthorizedError);
  });

  it("throws MaintenanceIssueNotFoundError for an unknown issue", async () => {
    await expect(
      ctx.useCase.execute({ actor: STUDENT, issueId: "unknown", data: Buffer.from("x"), mimeType: "image/png", sizeBytes: 10 }),
    ).rejects.toBeInstanceOf(MaintenanceIssueNotFoundError);
  });
});
