import { NextResponse } from "next/server";
import { withAuth } from "@/modules/auth";
import { badRequest } from "@/lib/http-errors";
import { searchMeetingsUseCase } from "../../infrastructure/container";
import { SearchMeetingsQuerySchema } from "../validation";

export const searchMeetingsRouteHandler = withAuth(async (req, { actor }) => {
  const query = Object.fromEntries(new URL(req.url).searchParams.entries());
  const parsed = SearchMeetingsQuerySchema.safeParse(query);
  if (!parsed.success) {
    return badRequest("Invalid search filters", parsed.error.flatten().fieldErrors);
  }

  const { sortField, sortDirection, page, pageSize, ...filters } = parsed.data;
  const result = await searchMeetingsUseCase.execute({
    actor,
    filters,
    sort: sortField ? { field: sortField, direction: sortDirection ?? "asc" } : undefined,
    page,
    pageSize,
  });

  return NextResponse.json({ data: result.items, meta: { total: result.total, page: result.page, pageSize: result.pageSize } });
});
