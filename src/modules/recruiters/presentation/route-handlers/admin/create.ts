import { NextResponse } from "next/server";
import { withAuth } from "@/modules/auth";
import { badRequest, conflict, forbidden } from "@/lib/http-errors";
import { NotAuthorizedError } from "@/lib/errors";
import { getCreateRecruiterAccountUseCase } from "../../../infrastructure/container";
import { DuplicateEmailError } from "../../../domain/errors";
import { CreateRecruiterAccountRequestSchema } from "../../validation";

export const createRecruiterAccountRouteHandler = withAuth(
  async (req, { actor }) => {
    const body: unknown = await req.json().catch(() => null);
    const parsed = CreateRecruiterAccountRequestSchema.safeParse(body);
    if (!parsed.success) {
      return badRequest("Invalid recruiter data", parsed.error.flatten().fieldErrors);
    }

    try {
      const result = await getCreateRecruiterAccountUseCase().execute({ actor, ...parsed.data });
      return NextResponse.json({ data: result }, { status: 201 });
    } catch (err) {
      if (err instanceof NotAuthorizedError) return forbidden(err.message);
      if (err instanceof DuplicateEmailError) return conflict(err.message);
      throw err;
    }
  },
  { roles: ["SECRETARY"] },
);
