import { readFile } from "@/lib/file-storage";
import { prisma } from "@/lib/prisma";
import { PrismaPublicEventRepository } from "@/modules/events";

export async function GET(_request: Request, context: { params: Promise<{ fileId: string }> }) {
  const { fileId } = await context.params;
  const file = await new PrismaPublicEventRepository(prisma).findPublicMedia(fileId);
  if (!file) return new Response("Not found", { status: 404 });
  try {
    const data = await readFile(file.storageKey);
    return new Response(new Uint8Array(data), { headers: { "Content-Type": file.mimeType, "Cache-Control": "public, max-age=3600" } });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
