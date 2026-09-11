import { afterEach, describe, expect, it, vi } from "vitest";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const send = vi.fn();
vi.mock("@aws-sdk/client-s3", () => ({
  S3Client: class { send = send; },
  PutObjectCommand: class { constructor(readonly input: unknown) {} },
  GetObjectCommand: class { constructor(readonly input: unknown) {} },
  DeleteObjectCommand: class { constructor(readonly input: unknown) {} },
  NoSuchKey: class extends Error {},
}));

const original = { ...process.env };
afterEach(async () => {
  process.env = { ...original };
  vi.resetModules();
  send.mockReset();
});

function baseEnv(): void {
  process.env.DATABASE_URL = "postgresql://test";
  process.env.JWT_ACCESS_SECRET = "a".repeat(32);
  process.env.JWT_REFRESH_SECRET = "b".repeat(32);
}

describe("file storage drivers", () => {
  it("round-trips and safely deletes local files", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "myarch-storage-"));
    baseEnv();
    process.env.FILE_STORAGE_DRIVER = "local";
    process.env.FILE_STORAGE_ROOT = root;
    const storage = await import("@/lib/file-storage");
    await storage.saveFile("avatars/student/image.jpg", Buffer.from("image"));
    await expect(storage.readFile("avatars/student/image.jpg")).resolves.toEqual(Buffer.from("image"));
    await storage.deleteFile("avatars/student/image.jpg");
    await expect(storage.readFile("avatars/student/image.jpg")).rejects.toThrow();
    await fs.rm(root, { recursive: true, force: true });
  });

  it("uses R2 S3 commands and rejects unsafe object keys", async () => {
    baseEnv();
    Object.assign(process.env, { FILE_STORAGE_DRIVER: "r2", STORAGE_ENDPOINT: "https://account.r2.cloudflarestorage.com", STORAGE_REGION: "auto", STORAGE_BUCKET: "myarch", STORAGE_ACCESS_KEY_ID: "key", STORAGE_SECRET_ACCESS_KEY: "secret" });
    send.mockResolvedValueOnce({}).mockResolvedValueOnce({ Body: { transformToByteArray: async () => new Uint8Array([1, 2]) } }).mockResolvedValueOnce({});
    const storage = await import("@/lib/file-storage");
    await storage.saveFile("portfolio-images/student/file.png", Buffer.from([1]));
    await expect(storage.readFile("portfolio-images/student/file.png")).resolves.toEqual(Buffer.from([1, 2]));
    await storage.deleteFile("portfolio-images/student/file.png");
    expect(send).toHaveBeenCalledTimes(3);
    await expect(storage.saveFile("../escape", Buffer.from([]))).rejects.toThrow("Invalid storage key");
  });

  it("maps an R2 missing object to the common storage error", async () => {
    baseEnv();
    Object.assign(process.env, { FILE_STORAGE_DRIVER: "r2", STORAGE_ENDPOINT: "https://account.r2.cloudflarestorage.com", STORAGE_REGION: "auto", STORAGE_BUCKET: "myarch", STORAGE_ACCESS_KEY_ID: "key", STORAGE_SECRET_ACCESS_KEY: "secret" });
    send.mockRejectedValueOnce({ $metadata: { httpStatusCode: 404 } });
    const storage = await import("@/lib/file-storage");
    await expect(storage.readFile("portfolio-images/student/missing.png")).rejects.toThrow("Stored file not found");
  });

  it("rejects incomplete R2 configuration before storage is used", async () => {
    baseEnv();
    process.env.FILE_STORAGE_DRIVER = "r2";
    const { getEnv } = await import("@/config/env");
    expect(() => getEnv()).toThrow("STORAGE_ENDPOINT is required when FILE_STORAGE_DRIVER=r2");
  });
});
