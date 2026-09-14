import { beforeEach, describe, expect, it, vi } from "vitest";
import { UploadAvatarUseCase } from "../../../src/modules/auth/application/use-cases/upload-avatar";
import { InvalidAvatarFileError } from "../../../src/modules/auth/domain/errors";
import { InMemoryUserRepository } from "../../support/fakes/in-memory-user-repository";
import { FakeAvatarFileRepository } from "../../support/fakes/fake-avatar-file-repository";
import { FakeAuditRecorder } from "../../support/fakes/fake-audit-recorder";
import type { AuthenticatedActor } from "../../../src/modules/auth";

const ACTOR: AuthenticatedActor = { userId: "sec-1", role: "SECRETARY" };

function buildUseCase() {
  const userRepository = new InMemoryUserRepository();
  const avatarFileRepository = new FakeAvatarFileRepository();
  const auditRecorder = new FakeAuditRecorder();
  const savedFiles = new Map<string, Buffer>();
  const saveFile = vi.fn(async (storageKey: string, data: Buffer) => {
    savedFiles.set(storageKey, data);
  });
  const deleteFile = vi.fn(async (storageKey: string) => {
    savedFiles.delete(storageKey);
  });

  const useCase = new UploadAvatarUseCase({
    userRepository,
    avatarFileRepository,
    auditRecorder,
    saveFile,
    deleteFile,
  });

  return { useCase, userRepository, avatarFileRepository, auditRecorder, saveFile, deleteFile, savedFiles };
}

describe("UploadAvatarUseCase", () => {
  let ctx: ReturnType<typeof buildUseCase>;

  beforeEach(() => {
    ctx = buildUseCase();
    ctx.userRepository.seed({
      id: "sec-1",
      email: "secretary@myarch.in",
      passwordHash: "irrelevant",
      role: "SECRETARY",
      isActive: true,
      mustChangePassword: false,
      avatarFileId: null,
    });
  });

  it("rejects a disallowed MIME type", async () => {
    await expect(
      ctx.useCase.execute({ actor: ACTOR, data: Buffer.from("x"), mimeType: "application/pdf", sizeBytes: 100 }),
    ).rejects.toBeInstanceOf(InvalidAvatarFileError);
  });

  it("rejects a file over the size ceiling", async () => {
    await expect(
      ctx.useCase.execute({
        actor: ACTOR,
        data: Buffer.from("x"),
        mimeType: "image/png",
        sizeBytes: 3 * 1024 * 1024,
      }),
    ).rejects.toBeInstanceOf(InvalidAvatarFileError);
  });

  it("saves the file, creates a FileAsset, and sets it as the user's avatar", async () => {
    const result = await ctx.useCase.execute({
      actor: ACTOR,
      data: Buffer.from("fake-png-bytes"),
      mimeType: "image/png",
      sizeBytes: 14,
    });

    expect(ctx.saveFile).toHaveBeenCalledTimes(1);
    expect(ctx.userRepository.getAvatarFileId("sec-1")).toBe(result.fileId);

    const created = ctx.avatarFileRepository.all().find((f) => f.id === result.fileId);
    expect(created).toBeDefined();
    expect(created!.mimeType).toBe("image/png");
  });

  it("uses the correct file extension per MIME type", async () => {
    await ctx.useCase.execute({ actor: ACTOR, data: Buffer.from("x"), mimeType: "image/jpeg", sizeBytes: 1 });
    const [storageKey] = ctx.saveFile.mock.calls[0]!;
    expect(storageKey).toMatch(/\.jpg$/);
  });

  it("deletes the previous avatar file and FileAsset row when replacing an existing avatar", async () => {
    const first = await ctx.useCase.execute({
      actor: ACTOR,
      data: Buffer.from("first"),
      mimeType: "image/png",
      sizeBytes: 5,
    });

    await ctx.useCase.execute({
      actor: ACTOR,
      data: Buffer.from("second"),
      mimeType: "image/png",
      sizeBytes: 6,
    });

    expect(ctx.deleteFile).toHaveBeenCalledTimes(1);
    expect(await ctx.avatarFileRepository.findById(first.fileId)).toBeNull();
  });

  it("records an ACCOUNT_SETTINGS_UPDATED audit entry", async () => {
    await ctx.useCase.execute({ actor: ACTOR, data: Buffer.from("x"), mimeType: "image/webp", sizeBytes: 1 });
    expect(ctx.auditRecorder.entries).toContainEqual(
      expect.objectContaining({ actorUserId: "sec-1", action: "ACCOUNT_SETTINGS_UPDATED" }),
    );
  });
});
