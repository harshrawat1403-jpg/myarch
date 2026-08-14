import { NextResponse } from "next/server";
import { withAuth } from "@/modules/auth";
import { badRequest, forbidden } from "@/lib/http-errors";
import { NotAuthorizedError } from "@/lib/errors";
import { createTaskUseCase } from "../../infrastructure/container";
import { CannotAssignTaskToRoleError } from "../../domain/errors";
import { CreateTaskRequestSchema } from "../validation";

export const createTaskRouteHandler = withAuth(
  async (req, { actor }) => {
    const body: unknown = await req.json().catch(() => null);
    const parsed = CreateTaskRequestSchema.safeParse(body);
    if (!parsed.success) {
      return badRequest("Invalid task data", parsed.error.flatten().fieldErrors);
    }

    try {
      const task = await createTaskUseCase.execute({ actor, ...parsed.data });
      return NextResponse.json({ data: task }, { status: 201 });
    } catch (err) {
      if (err instanceof NotAuthorizedError) return forbidden(err.message);
      if (err instanceof CannotAssignTaskToRoleError) return forbidden(err.message);
      throw err;
    }
  },
  { roles: ["SECRETARY", "COORDINATOR"] },
);
