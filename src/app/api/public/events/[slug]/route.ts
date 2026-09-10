import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { PrismaPublicEventRepository } from "@/modules/events";

export async function GET(_request: Request, context: { params: Promise<{ slug: string }> }) {
  const { slug } = await context.params;
  const event = await new PrismaPublicEventRepository(prisma).findBySlug(slug);
  if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });
  return NextResponse.json({ data: event }, { headers: { "Cache-Control": "public, max-age=60" } });
}
