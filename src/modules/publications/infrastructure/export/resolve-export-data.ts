import type { PrismaClient } from "@prisma/client";
import { readFile } from "@/lib/file-storage";
import type { PublicationResolvedData } from "@/components/publications/publication-renderer";
import type { PublicationContent } from "../../domain/blocks";
import { resolveContentData } from "../../application/resolve-content-data";

/** Resolves every data-bound block's real, live record — the same shared helper GetPreviewDataUseCase uses for the editor's own Preview, applied here for the export job so both paths can never drift apart. */
export const resolvePublicationData = resolveContentData;

function collectImageFileIds(content: PublicationContent, resolvedData: PublicationResolvedData): string[] {
  const ids = new Set<string>();
  for (const b of content.blocks) {
    if (b.type === "COVER" && b.data.imageFileId) ids.add(b.data.imageFileId);
    if (b.type === "IMAGE" && b.data.fileId) ids.add(b.data.fileId);
  }
  for (const student of Object.values(resolvedData.students)) if (student.photoFileId) ids.add(student.photoFileId);
  for (const company of Object.values(resolvedData.companies)) if (company.logoFileId) ids.add(company.logoFileId);
  return [...ids];
}

/**
 * The export renderer runs standalone (Playwright `page.setContent`, or
 * pptxgenjs building slides directly) — neither can make an authenticated
 * HTTP round-trip back into the running app the way the live editor's
 * `<img src="/api/files/...">` does. Embedding every referenced image as a
 * `data:` URI up front makes the render fully self-contained: no network
 * calls during rendering at all, and it's the exact same
 * `resolveImageSrc(fileId) => string` contract `PublicationRenderer`
 * already expects, so the component itself needs no export-specific branch.
 */
export async function buildDataUriResolver(prisma: PrismaClient, content: PublicationContent, resolvedData: PublicationResolvedData): Promise<(fileId: string) => string> {
  const fileIds = collectImageFileIds(content, resolvedData);
  const map = new Map<string, string>();

  await Promise.all(
    fileIds.map(async (fileId) => {
      try {
        const asset = await prisma.fileAsset.findUnique({ where: { id: fileId }, select: { storageKey: true, mimeType: true, classification: true } });
        // Defense in depth: a data-bound image reference should never point
        // at a PRIVATE file in practice (block images and avatars/logos are
        // always PUBLIC), but never embed one into an export if it somehow did.
        if (!asset || asset.classification !== "PUBLIC") return;
        const bytes = await readFile(asset.storageKey);
        map.set(fileId, `data:${asset.mimeType};base64,${bytes.toString("base64")}`);
      } catch {
        // A missing/unreadable image is not fatal to the whole export —
        // resolveImageSrc below just returns "" for it, rendering no <img>.
      }
    }),
  );

  return (fileId: string) => map.get(fileId) ?? "";
}
