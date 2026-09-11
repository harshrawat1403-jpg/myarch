import { randomUUID } from "node:crypto";
import type { AuthenticatedActor } from "@/modules/auth";
import { prisma } from "@/lib/prisma";
import { NotAuthorizedError } from "@/lib/errors";
import { DraftLockedForReviewError } from "../../domain/errors";

export const PORTFOLIO_IMAGE_LIMIT = 10;
export const PORTFOLIO_IMAGE_MAX_BYTES = 5 * 1024 * 1024;
export const RESUME_MAX_BYTES = 3 * 1024 * 1024;
export const PROFILE_IMAGE_MIME_TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

export async function getEditableDraft(actor: AuthenticatedActor, studentId: string) {
  if (actor.role !== "STUDENT" || actor.studentProfileId !== studentId) throw new NotAuthorizedError("Only the student may manage these files");
  const student = await prisma.studentProfile.findUnique({ where: { id: studentId }, select: { id: true } });
  if (!student) return null;
  let draft = await prisma.studentPublicProfileDraft.findUnique({ where: { studentProfileId: studentId } });
  if (!draft) draft = await prisma.studentPublicProfileDraft.create({ data: { studentProfileId: studentId } });
  if (draft.status === "PENDING_REVIEW") throw new DraftLockedForReviewError();
  if (draft.status === "APPROVED") draft = await prisma.studentPublicProfileDraft.update({ where: { id: draft.id }, data: { status: "DRAFT" } });
  return draft;
}

export function generatedStorageKey(prefix: string, studentId: string, extension: string): string {
  return `${prefix}/${studentId}/${randomUUID()}.${extension}`;
}

export function optionalText(value: FormDataEntryValue | null, maxLength: number): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.length > maxLength) throw new Error("Text is too long");
  return trimmed;
}
