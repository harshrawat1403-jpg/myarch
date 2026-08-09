import { NextResponse } from "next/server";
import { withAuth } from "@/modules/auth";
import { badRequest, conflict, forbidden } from "@/lib/http-errors";
import { NotAuthorizedError } from "@/lib/errors";
import { createCompanyUseCase } from "../../infrastructure/container";
import { DuplicateCompanyNameError } from "../../domain/errors";
import { CreateCompanyRequestSchema } from "../validation";

export const createCompanyRouteHandler = withAuth(
  async (req, { actor }) => {
    const body: unknown = await req.json().catch(() => null);
    const parsed = CreateCompanyRequestSchema.safeParse(body);
    if (!parsed.success) {
      return badRequest("Invalid company data", parsed.error.flatten().fieldErrors);
    }

    try {
      const company = await createCompanyUseCase.execute({ actor, ...parsed.data });
      return NextResponse.json({ data: company }, { status: 201 });
    } catch (err) {
      if (err instanceof NotAuthorizedError) return forbidden(err.message);
      if (err instanceof DuplicateCompanyNameError) return conflict(err.message);
      throw err;
    }
  },
  { roles: ["SECRETARY"] },
);
