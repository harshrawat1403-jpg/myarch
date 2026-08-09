import { NextResponse } from "next/server";
import { withAuth } from "@/modules/auth";
import { extractRouteParam } from "@/lib/route-params";
import { forbidden, notFound } from "@/lib/http-errors";
import { NotAuthorizedError } from "@/lib/errors";
import { getCompanyUseCase } from "../../infrastructure/container";
import { CompanyNotFoundError } from "../../domain/errors";

export const getCompanyRouteHandler = withAuth(
  async (_req, { actor }, routeContext) => {
    const companyId = await extractRouteParam(routeContext, "id");
    if (!companyId) return notFound("Company not found");

    try {
      const company = await getCompanyUseCase.execute({ actor, companyId });
      return NextResponse.json({ data: company });
    } catch (err) {
      if (err instanceof CompanyNotFoundError) return notFound(err.message);
      if (err instanceof NotAuthorizedError) return forbidden(err.message);
      throw err;
    }
  },
  { roles: ["SECRETARY", "COORDINATOR"] },
);
