import { NextResponse } from "next/server";
import { withAuth } from "@/modules/auth";
import { badRequest, forbidden } from "@/lib/http-errors";
import { NotAuthorizedError } from "@/lib/errors";
import { startAcademicYearTransitionUseCase } from "../../infrastructure/container";
import { InvalidConfirmationTextError } from "../../domain/errors";
import { StartAcademicYearTransitionRequestSchema } from "../validation";

export const startAcademicYearTransitionRouteHandler = withAuth(
  async (req, { actor }) => {
    const body: unknown = await req.json().catch(() => null);
    const parsed = StartAcademicYearTransitionRequestSchema.safeParse(body);
    if (!parsed.success) {
      return badRequest("Invalid transition request", parsed.error.flatten().fieldErrors);
    }

    try {
      const result = await startAcademicYearTransitionUseCase.execute({
        actor,
        plan: parsed.data.plan,
        confirmationText: parsed.data.confirmationText,
      });
      return NextResponse.json({ data: result }, { status: 201 });
    } catch (err) {
      if (err instanceof NotAuthorizedError) return forbidden(err.message);
      if (err instanceof InvalidConfirmationTextError) return badRequest(err.message);
      throw err;
    }
  },
  { roles: ["SECRETARY"] },
);
