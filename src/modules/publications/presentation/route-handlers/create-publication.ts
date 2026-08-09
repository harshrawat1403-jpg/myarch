import { NextResponse } from "next/server";
import { withAuth } from "@/modules/auth";
import { badRequest, forbidden, notFound } from "@/lib/http-errors";
import { NotAuthorizedError } from "@/lib/errors";
import { createPublicationUseCase } from "../../infrastructure/container";
import { PublicationTemplateNotFoundError } from "../../domain/errors";
import { CreatePublicationRequestSchema } from "../validation";

export const createPublicationRouteHandler = withAuth(
  async (req, { actor }) => {
    const body: unknown = await req.json().catch(() => null);
    const parsed = CreatePublicationRequestSchema.safeParse(body);
    if (!parsed.success) return badRequest("Invalid request", parsed.error.flatten().fieldErrors);

    try {
      const publication = await createPublicationUseCase.execute({
        actor,
        title: parsed.data.title,
        templateId: parsed.data.templateId,
        pageSize: parsed.data.pageSize,
        selectedIds: parsed.data.selectedIds,
      });
      return NextResponse.json({ data: publication }, { status: 201 });
    } catch (err) {
      if (err instanceof PublicationTemplateNotFoundError) return notFound(err.message);
      if (err instanceof NotAuthorizedError) return forbidden(err.message);
      throw err;
    }
  },
  { roles: ["SECRETARY", "COORDINATOR"] },
);
