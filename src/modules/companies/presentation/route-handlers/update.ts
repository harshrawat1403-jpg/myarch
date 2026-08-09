import { NextResponse } from "next/server";
import { withAuth } from "@/modules/auth";
import { extractRouteParam } from "@/lib/route-params";
import { badRequest, conflict, forbidden, notFound } from "@/lib/http-errors";
import { NotAuthorizedError } from "@/lib/errors";
import { updateCompanyUseCase } from "../../infrastructure/container";
import { CompanyNotFoundError, DuplicateCompanyNameError } from "../../domain/errors";
import { UpdateCompanyRequestSchema } from "../validation";

export const updateCompanyRouteHandler = withAuth(
  async (req, { actor }, routeContext) => {
    const companyId = await extractRouteParam(routeContext, "id");
    if (!companyId) return notFound("Company not found");

    const body: unknown = await req.json().catch(() => null);
    const parsed = UpdateCompanyRequestSchema.safeParse(body);
    if (!parsed.success) {
      return badRequest("Invalid company data", parsed.error.flatten().fieldErrors);
    }

    try {
      const company = await updateCompanyUseCase.execute({ actor, companyId, ...parsed.data });
      return NextResponse.json({ data: company });
    } catch (err) {
      if (err instanceof CompanyNotFoundError) return notFound(err.message);
      if (err instanceof NotAuthorizedError) return forbidden(err.message);
      if (err instanceof DuplicateCompanyNameError) return conflict(err.message);
      throw err;
    }
  },
  { roles: ["SECRETARY"] },
);
