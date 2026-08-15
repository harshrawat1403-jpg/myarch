import { z } from "zod";

/**
 * `activityType`/`status` are deliberately free-form strings (not a closed
 * enum) — each registered CalendarSource owns its own vocabulary, and this
 * module never needs a change when a new source registers a new value. An
 * unrecognized value simply yields an empty result (no source matches it),
 * never a validation error.
 */
export const GetCalendarEntriesQuerySchema = z.object({
  from: z.coerce.date(),
  to: z.coerce.date(),
  activityType: z.string().trim().min(1).optional(),
  ownerId: z.string().uuid().optional(),
  status: z.string().trim().min(1).optional(),
});
