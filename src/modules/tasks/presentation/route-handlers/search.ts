import { NextResponse } from "next/server";
import { withAuth } from "@/modules/auth";
import { badRequest } from "@/lib/http-errors";
import { searchTasksUseCase } from "../../infrastructure/container";
import { SearchTasksQuerySchema } from "../validation";

/** No role gate — Secretary/Coordinator/Student may all search (each scoped by SearchTasksUseCase's own role-based rules); Recruiter/Alumni get an empty result rather than a 403, matching canViewTask's exhaustive-but-permissive-at-the-route-layer shape. */
export const searchTasksRouteHandler = withAuth(async (req, { actor }) => {
  const query = Object.fromEntries(new URL(req.url).searchParams.entries());
  const parsed = SearchTasksQuerySchema.safeParse(query);
  if (!parsed.success) {
    return badRequest("Invalid search filters", parsed.error.flatten().fieldErrors);
  }

  const { sortField, sortDirection, page, pageSize, ...filters } = parsed.data;
  const result = await searchTasksUseCase.execute({
    actor,
    filters,
    sort: sortField ? { field: sortField, direction: sortDirection ?? "desc" } : undefined,
    page,
    pageSize,
  });

  return NextResponse.json({ data: result.items, meta: { total: result.total, page: result.page, pageSize: result.pageSize } });
});
