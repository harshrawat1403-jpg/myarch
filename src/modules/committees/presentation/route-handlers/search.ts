import { NextResponse } from "next/server";
import { withAuth } from "@/modules/auth";
import { badRequest, forbidden } from "@/lib/http-errors";
import { NotAuthorizedError } from "@/lib/errors";
import { searchCommitteesUseCase } from "../../infrastructure/container";
import { SearchCommitteesQuerySchema } from "../validation";

export const searchCommitteesRouteHandler = withAuth(async (req, { actor }) => {
  const query = Object.fromEntries(new URL(req.url).searchParams.entries());
  const parsed = SearchCommitteesQuerySchema.safeParse(query);
  if (!parsed.success) {
    return badRequest("Invalid search filters", parsed.error.flatten().fieldErrors);
  }

  const { sortField, sortDirection, page, pageSize, ...filters } = parsed.data;

  try {
    const result = await searchCommitteesUseCase.execute({
      actor,
      filters,
      sort: sortField ? { field: sortField, direction: sortDirection ?? "asc" } : undefined,
      page,
      pageSize,
    });
    return NextResponse.json({ data: result.items, meta: { total: result.total, page: result.page, pageSize: result.pageSize } });
  } catch (err) {
    if (err instanceof NotAuthorizedError) return forbidden(err.message);
    throw err;
  }
});
