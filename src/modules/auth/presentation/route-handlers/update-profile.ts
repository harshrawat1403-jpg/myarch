import { NextResponse } from "next/server";
import { CurrentPasswordIncorrectError, EmailAlreadyInUseError } from "../../domain/errors";
import { getUpdateOwnProfileUseCase, withAuth } from "../../infrastructure/container";
import { UpdateProfileRequestSchema } from "../validation";
import { badRequest, conflict, forbidden } from "@/lib/http-errors";

export const updateProfileRouteHandler = withAuth(async (req, { actor }) => {
  const body: unknown = await req.json().catch(() => null);
  const parsed = UpdateProfileRequestSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest("Invalid profile update request", parsed.error.flatten().fieldErrors);
  }

  if (parsed.data.email && !parsed.data.currentPassword) {
    return badRequest("Current password is required to change your email address");
  }

  try {
    const result = await getUpdateOwnProfileUseCase().execute({ actor, ...parsed.data });
    return NextResponse.json({ data: result });
  } catch (err) {
    if (err instanceof CurrentPasswordIncorrectError) return forbidden(err.message);
    if (err instanceof EmailAlreadyInUseError) return conflict(err.message);
    throw err;
  }
});
