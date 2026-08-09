import { NextResponse } from "next/server";
import { withAuth } from "@/modules/auth";
import { extractRouteParam } from "@/lib/route-params";
import { conflict, forbidden, notFound } from "@/lib/http-errors";
import { NotAuthorizedError } from "@/lib/errors";
import { setCompanyActiveUseCase } from "../../infrastructure/container";
import { CompanyAlreadyActiveError, CompanyAlreadyDisabledError, CompanyNotFoundError } from "../../domain/errors";

function buildSetActiveHandler(isActive: boolean) {
  return withAuth(
    async (_req, { actor }, routeContext) => {
      const companyId = await extractRouteParam(routeContext, "id");
      if (!companyId) return notFound("Company not found");

      try {
        const company = await setCompanyActiveUseCase.execute({ actor, companyId, isActive });
        return NextResponse.json({ data: company });
      } catch (err) {
        if (err instanceof CompanyNotFoundError) return notFound(err.message);
        if (err instanceof NotAuthorizedError) return forbidden(err.message);
        if (err instanceof CompanyAlreadyActiveError) return conflict(err.message);
        if (err instanceof CompanyAlreadyDisabledError) return conflict(err.message);
        throw err;
      }
    },
    { roles: ["SECRETARY"] },
  );
}

export const disableCompanyRouteHandler = buildSetActiveHandler(false);
export const enableCompanyRouteHandler = buildSetActiveHandler(true);
