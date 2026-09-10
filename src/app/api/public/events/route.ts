import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { PrismaPublicEventRepository } from "@/modules/events";

const querySchema = z.object({
  search: z.string().trim().max(200).optional(),
  status: z.enum(["UPCOMING", "ONGOING", "COMPLETED"]).optional(),
  category: z.string().trim().max(80).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(48).default(12),
});

export async function GET(request: Request) {
  const parsed = querySchema.safeParse(Object.fromEntries(new URL(request.url).searchParams));
  if (!parsed.success) return NextResponse.json({ error: "Invalid event filters" }, { status: 400 });
  const result = await new PrismaPublicEventRepository(prisma).list(parsed.data);
  return NextResponse.json({ data: result.items, meta: { total: result.total, page: result.page, pageSize: result.pageSize } }, { headers: { "Cache-Control": "public, max-age=60" } });
}
