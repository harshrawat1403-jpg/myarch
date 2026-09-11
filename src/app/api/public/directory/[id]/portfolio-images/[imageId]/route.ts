import { NextResponse } from "next/server";
import { extractRouteParam } from "@/lib/route-params";
import { notFound } from "@/lib/http-errors";
import { prisma } from "@/lib/prisma";
import { readFile } from "@/lib/file-storage";

export async function GET(_request: Request, context: unknown): Promise<Response> {
  const studentId = await extractRouteParam(context, "id");
  const imageId = await extractRouteParam(context, "imageId");
  if (!studentId || !imageId) return notFound("Portfolio image not found");
  const image = await prisma.studentPortfolioImage.findFirst({
    where: { id: imageId, studentProfileId: studentId, publishedProfile: { is: { isPubliclyDiscoverable: true, studentProfile: { isActive: true, batch: { status: "ACTIVE" } } } } },
    include: { file: true },
  });
  if (!image || image.file.classification !== "PUBLIC") return notFound("Portfolio image not found");
  const bytes = await readFile(image.file.storageKey).catch(() => null);
  if (!bytes) return notFound("Portfolio image not found");
  return new NextResponse(bytes as unknown as BodyInit, { headers: { "Content-Type": image.file.mimeType, "Cache-Control": "public, max-age=3600" } });
}