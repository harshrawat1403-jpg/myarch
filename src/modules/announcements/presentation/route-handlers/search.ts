import { NextResponse } from "next/server";
import { withAuth } from "@/modules/auth";
import { badRequest } from "@/lib/http-errors";
import { searchAnnouncementsUseCase } from "../../infrastructure/container";
import { SearchAnnouncementsQuerySchema } from "../validation";

export const searchAnnouncementsRouteHandler = withAuth(async (req, { actor }) => {
  const query = Object.fromEntries(new URL(req.url).searchParams.entries());
  const parsed = SearchAnnouncementsQuerySchema.safeParse(query);
  if (!parsed.success) {
    return badRequest("Invalid search filters", parsed.error.flatten().fieldErrors);
  }

  const { sortField, sortDirection, page, pageSize, ...filters } = parsed.data;
  const result = await searchAnnouncementsUseCase.execute({
    actor,
    filters,
    sort: sortField ? { field: sortField, direction: sortDirection ?? "desc" } : undefined,
    page,
    pageSize,
  });

  return NextResponse.json({ data: result.items, meta: { total: result.total, page: result.page, pageSize: result.pageSize } });
});
