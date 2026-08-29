import { z } from "zod";
import { CONTENT_OVERRIDE_TEXT_MAX_LENGTH } from "../domain/entities";

export const SaveContentOverrideRequestSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("TEXT"), textValue: z.string().trim().min(1).max(CONTENT_OVERRIDE_TEXT_MAX_LENGTH) }),
  z.object({ type: z.literal("IMAGE"), fileId: z.string().uuid() }),
]);
