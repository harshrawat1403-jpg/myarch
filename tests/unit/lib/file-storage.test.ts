import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import os from "node:os";
import fs from "node:fs/promises";
import path from "node:path";

let tempRoot: string;

vi.mock("@/config/env", () => ({
  getEnv: () => ({ FILE_STORAGE_ROOT: tempRoot }),
}));

describe("file-storage", () => {
  beforeEach(async () => {
    tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "tnparch-file-storage-test-"));
  });

  afterEach(async () => {
    await fs.rm(tempRoot, { recursive: true, force: true });
  });

  it("round-trips a saved file through readFile", async () => {
    const { saveFile, readFile } = await import("../../../src/lib/file-storage");
    await saveFile("avatars/user-1.png", Buffer.from("fake-png-bytes"));
    const read = await readFile("avatars/user-1.png");
    expect(read.toString()).toBe("fake-png-bytes");
  });

  it("creates intermediate directories as needed", async () => {
    const { saveFile } = await import("../../../src/lib/file-storage");
    await expect(saveFile("a/b/c/deep.txt", Buffer.from("x"))).resolves.not.toThrow();
  });

  it("deleteFile removes a saved file", async () => {
    const { saveFile, deleteFile, readFile } = await import("../../../src/lib/file-storage");
    await saveFile("avatars/user-2.png", Buffer.from("bytes"));
    await deleteFile("avatars/user-2.png");
    await expect(readFile("avatars/user-2.png")).rejects.toThrow();
  });

  it("deleteFile does not throw for a non-existent file", async () => {
    const { deleteFile } = await import("../../../src/lib/file-storage");
    await expect(deleteFile("never-existed.txt")).resolves.not.toThrow();
  });

  it("rejects a storage key that attempts to escape the storage root", async () => {
    const { saveFile } = await import("../../../src/lib/file-storage");
    await expect(saveFile("../../../etc/passwd", Buffer.from("x"))).rejects.toThrow(/outside the storage root/);
  });
});
