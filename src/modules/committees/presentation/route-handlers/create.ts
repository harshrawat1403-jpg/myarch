import { NextResponse } from "next/server";
import { withAuth } from "@/modules/auth";
import { badRequest, forbidden } from "@/lib/http-errors";
import { NotAuthorizedError } from "@/lib/errors";
import { createCommitteeUseCase } from "../../infrastructure/container";
import { CreateCommitteeRequestSchema } from "../validation";

export const createCommitteeRouteHandler = withAuth(async (req, { actor }) => {
  const body: unknown = await req.json().catch(() => null);
  const parsed = CreateCommitteeRequestSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest("Invalid committee data", parsed.error.flatten().fieldErrors);
  }

  try {
    const committee = await createCommitteeUseCase.execute({ actor, ...parsed.data });
    return NextResponse.json({ data: committee }, { status: 201 });
  } catch (err) {
    if (err instanceof NotAuthorizedError) return forbidden(err.message);
    throw err;
  }
});
