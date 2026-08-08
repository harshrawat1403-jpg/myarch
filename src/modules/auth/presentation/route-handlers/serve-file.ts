import { NextResponse, type NextRequest } from "next/server";
import { getAvatarFileRepository } from "../../infrastructure/container";
import { readFile } from "@/lib/file-storage";
import { extractRouteParam } from "@/lib/route-params";
import { notFound } from "@/lib/http-errors";

/**
 * Unauthenticated on purpose — every FileAsset this route can reach is
 * classification PUBLIC (findById already rejects PRIVATE rows), the same
 * distinction the schema already draws for confidential documents, which
 * have their own separate, authenticated endpoint. Avatars today; the
 * future CMS Media Library's public images serve through this same route
 * rather than a second one.
 */
export async function serveFileRouteHandler(_req: NextRequest, routeContext: unknown): Promise<Response> {
  const fileId = await extractRouteParam(routeContext, "fileId");
  if (!fileId) return notFound("File not found");

  const file = await getAvatarFileRepository().findById(fileId);
  if (!file) return notFound("File not found");

  const bytes = await readFile(file.storageKey).catch(() => null);
  if (!bytes) return notFound("File not found");

  return new NextResponse(bytes as unknown as BodyInit, {
    headers: {
      "Content-Type": file.mimeType,
      "Cache-Control": "private, max-age=3600",
    },
  });
}
