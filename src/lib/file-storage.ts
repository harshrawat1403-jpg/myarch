import fs from "node:fs/promises";
import path from "node:path";
import { getEnv } from "@/config/env";

/**
 * Local-disk storage behind an authenticated API route, per the V3.0
 * Administration Platform's file-storage decision — no object-storage
 * service exists yet in this deployment, and this is a single-instance
 * department app, so a Docker volume plus this thin read/write/delete
 * wrapper is the correct-scale choice. Generic on purpose (not
 * avatar-specific): the future CMS Media Library extends this same module
 * rather than introducing a second storage path.
 */

function storageRoot(): string {
  const configured = getEnv().FILE_STORAGE_ROOT;
  // turbopackIgnore: this join's second argument is config-derived, not a
  // literal — without the hint, Turbopack's static analysis conservatively
  // traces (and bundles) the entire project on every build. The path itself
  // is safe: it's the storage root directory, read only at request time,
  // never a value used to select which source files to include.
  return path.isAbsolute(configured) ? configured : path.join(/* turbopackIgnore: true */ process.cwd(), configured);
}

/**
 * Resolves a storage key to an absolute path, rejecting any key that would
 * escape the storage root (path traversal) — a storage key is always
 * server-generated (never taken verbatim from user input), but this stays
 * defensive regardless.
 */
function resolveStoragePath(storageKey: string): string {
  const root = storageRoot();
  const resolved = path.resolve(root, storageKey);
  if (resolved !== root && !resolved.startsWith(root + path.sep)) {
    throw new Error(`Storage key resolves outside the storage root: ${storageKey}`);
  }
  return resolved;
}

export async function saveFile(storageKey: string, data: Buffer): Promise<void> {
  const filePath = resolveStoragePath(storageKey);
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, data);
}

export async function readFile(storageKey: string): Promise<Buffer> {
  return fs.readFile(resolveStoragePath(storageKey));
}

export async function deleteFile(storageKey: string): Promise<void> {
  await fs.rm(resolveStoragePath(storageKey), { force: true });
}
