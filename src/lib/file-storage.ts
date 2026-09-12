import { DeleteObjectCommand, GetObjectCommand, NoSuchKey, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import fs from "node:fs/promises";
import path from "node:path";
import { getEnv } from "@/config/env";

function assertSafeStorageKey(storageKey: string): void {
  if (!storageKey || storageKey.startsWith("/") || storageKey.includes("\\") || storageKey.split("/").some((part) => !part || part === "." || part === "..")) {
    throw new Error("Invalid storage key");
  }
}

function localPath(storageKey: string): string {
  assertSafeStorageKey(storageKey);
  const root = getEnv().FILE_STORAGE_ROOT!;
  const absoluteRoot = path.isAbsolute(root) ? root : path.join(/* turbopackIgnore: true */ process.cwd(), root);
  const resolved = path.resolve(absoluteRoot, storageKey);
  if (!resolved.startsWith(`${absoluteRoot}${path.sep}`)) throw new Error("Storage key resolves outside the storage root");
  return resolved;
}

let r2Client: S3Client | undefined;
function getR2Client(): S3Client {
  const env = getEnv();
  if (!r2Client) r2Client = new S3Client({ region: env.STORAGE_REGION!, endpoint: env.STORAGE_ENDPOINT!, credentials: { accessKeyId: env.STORAGE_ACCESS_KEY_ID!, secretAccessKey: env.STORAGE_SECRET_ACCESS_KEY! } });
  return r2Client;
}

function isNotFound(error: unknown): boolean {
  return error instanceof NoSuchKey || (typeof error === "object" && error !== null && "$metadata" in error && (error as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode === 404);
}

export async function saveFile(storageKey: string, data: Buffer): Promise<void> {
  assertSafeStorageKey(storageKey);
  const env = getEnv();
  if (env.FILE_STORAGE_DRIVER === "local") {
    const filePath = localPath(storageKey);
    const directory = path.dirname(filePath);
    await fs.mkdir(/* turbopackIgnore: true */ directory, { recursive: true });
    await fs.writeFile(/* turbopackIgnore: true */ filePath, data);
    return;
  }
  await getR2Client().send(new PutObjectCommand({ Bucket: env.STORAGE_BUCKET!, Key: storageKey, Body: data }));
}

export async function readFile(storageKey: string): Promise<Buffer> {
  assertSafeStorageKey(storageKey);
  const env = getEnv();
  if (env.FILE_STORAGE_DRIVER === "local") {
    const filePath = localPath(storageKey);
    return fs.readFile(/* turbopackIgnore: true */ filePath);
  }
  try {
    const body = (await getR2Client().send(new GetObjectCommand({ Bucket: env.STORAGE_BUCKET!, Key: storageKey }))).Body;
    if (!body) throw new Error("Stored object has no body");
    return Buffer.from(await body.transformToByteArray());
  } catch (error) {
    if (isNotFound(error)) throw new Error("Stored file not found");
    throw error;
  }
}

export async function deleteFile(storageKey: string): Promise<void> {
  assertSafeStorageKey(storageKey);
  const env = getEnv();
  if (env.FILE_STORAGE_DRIVER === "local") {
    const filePath = localPath(storageKey);
    await fs.rm(/* turbopackIgnore: true */ filePath, { force: true });
    return;
  }
  await getR2Client().send(new DeleteObjectCommand({ Bucket: env.STORAGE_BUCKET!, Key: storageKey }));
}
