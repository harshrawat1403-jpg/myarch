import { NextResponse } from "next/server";
import { withAuth } from "@/modules/auth";
import { badRequest } from "@/lib/http-errors";
import { getCalendarEntriesUseCase } from "../../infrastructure/container";
import { InvalidCalendarRangeError } from "../../domain/errors";
import { GetCalendarEntriesQuerySchema } from "../validation";

/**
 * No role gate — every role may query the calendar; visibility is entirely
 * delegated to each CalendarSource's own authorization (e.g.
 * TaskCalendarSource reuses Task Engine's role-based scoping), matching
 * tasks' own searchTasksRouteHandler shape.
 */
export const getCalendarEntriesRouteHandler = withAuth(async (req, { actor }) => {
  const query = Object.fromEntries(new URL(req.url).searchParams.entries());
  const parsed = GetCalendarEntriesQuerySchema.safeParse(query);
  if (!parsed.success) {
    return badRequest("Invalid calendar query", parsed.error.flatten().fieldErrors);
  }

  const { from, to, ...filters } = parsed.data;

  try {
    const entries = await getCalendarEntriesUseCase.execute({
      actor,
      range: { from, to },
      filters,
    });
    return NextResponse.json({ data: entries });
  } catch (error) {
    if (error instanceof InvalidCalendarRangeError) {
      return badRequest(error.message);
    }
    throw error;
  }
});
