import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/modules/auth";
import { badRequest, conflict, notFound } from "@/lib/http-errors";
import { forbidden } from "@/lib/http-errors";
import { NotAuthorizedError } from "@/lib/errors";
import { getCreateStudentUseCase } from "../../infrastructure/container";
import {
  BatchNotAssignableError,
  BatchNotFoundError,
  DuplicateEmailError,
  DuplicateRollNumberError,
} from "../../domain/errors";
import { CreateStudentRequestSchema } from "../validation";

/**
 * No `getRequiredBatchId` here: the target batch comes from the request
 * BODY, and a Request's body stream can only be read once — reading it in
 * the middleware to pre-check scope would leave nothing for this handler to
 * parse. Batch-scope authorization for this endpoint is enforced inside
 * `CreateStudentUseCase` instead, via the same centralized
 * `canEditPrivateAdminFields` function — the middleware still enforces the
 * role gate (Secretary/Coordinator only) before the handler ever runs.
 */
export const createStudentRouteHandler = withAuth(
  async (req: NextRequest, { actor }) => {
    const body: unknown = await req.json().catch(() => null);
    const parsed = CreateStudentRequestSchema.safeParse(body);
    if (!parsed.success) {
      return badRequest("Invalid student data", parsed.error.flatten().fieldErrors);
    }

    try {
      const student = await getCreateStudentUseCase().execute({ actor, ...parsed.data });
      return NextResponse.json({ data: student }, { status: 201 });
    } catch (err) {
      if (err instanceof NotAuthorizedError) return forbidden(err.message);
      if (err instanceof BatchNotFoundError) return notFound("Batch not found");
      if (err instanceof BatchNotAssignableError) return badRequest(err.message);
      if (err instanceof DuplicateRollNumberError) return conflict(err.message);
      if (err instanceof DuplicateEmailError) return conflict(err.message);
      throw err;
    }
  },
  { roles: ["SECRETARY", "COORDINATOR"] },
);
