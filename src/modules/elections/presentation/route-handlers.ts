import { Prisma } from "@prisma/client";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { withAuth, type AuthenticatedActor } from "@/modules/auth";
import { extractRouteParam } from "@/lib/route-params";
import { badRequest, conflict, forbidden, notFound } from "@/lib/http-errors";
import { NotAuthorizedError } from "@/lib/errors";
import { ElectionError } from "../domain/election";
import { electionUseCases } from "../infrastructure/container";

type Operation = (
  req: NextRequest,
  actor: AuthenticatedActor,
  id: string,
  context: unknown,
) => Promise<unknown>;
function route(operation: Operation, admin: boolean, withId = true, status = 200) {
  return withAuth(
    async (req, { actor }, context) => {
      try {
        const id = withId
          ? z
              .string()
              .uuid()
              .parse(await extractRouteParam(context, "id"))
          : "";
        return NextResponse.json({ data: await operation(req, actor, id, context) }, { status });
      } catch (error) {
        if (error instanceof NotAuthorizedError) return forbidden(error.message);
        if (error instanceof z.ZodError)
          return badRequest("Invalid election data", error.flatten().fieldErrors);
        if (error instanceof ElectionError)
          return error.kind === "notFound"
            ? notFound(error.message)
            : error.kind === "validation"
              ? badRequest(error.message)
              : conflict(error.message);
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          ["P2002", "P2003", "P2025", "P2034"].includes(error.code)
        )
          return conflict("Conflicting election data or concurrent change; refresh and retry");
        throw error;
      }
    },
    { roles: admin ? ["SECRETARY"] : ["SECRETARY", "STUDENT"] },
  );
}
const body = (req: NextRequest) => req.json().catch(() => null);
export const listElectionsRouteHandler = route(
  (_req, actor) => electionUseCases.list(actor),
  false,
  false,
);
export const createElectionRouteHandler = route(
  async (req, actor) => electionUseCases.create(actor, await body(req)),
  true,
  false,
  201,
);
export const getElectionRouteHandler = route(
  (_req, actor, id) => electionUseCases.get(actor, id),
  false,
);
export const updateElectionRouteHandler = route(
  async (req, actor, id) => electionUseCases.update(actor, id, await body(req)),
  true,
);
export const createElectionPositionRouteHandler = route(
  async (req, actor, id) => electionUseCases.savePosition(actor, id, null, await body(req)),
  true,
  true,
  201,
);
export const updateElectionPositionRouteHandler = route(
  async (req, actor, id, context) =>
    electionUseCases.savePosition(
      actor,
      id,
      z
        .string()
        .uuid()
        .parse(await extractRouteParam(context, "positionId")),
      await body(req),
    ),
  true,
);
export const deleteElectionPositionRouteHandler = route(
  async (_req, actor, id, context) =>
    electionUseCases.deletePosition(
      actor,
      id,
      z
        .string()
        .uuid()
        .parse(await extractRouteParam(context, "positionId")),
    ),
  true,
);
export const linkElectionFormRouteHandler = route(async (req, actor, id) => {
  const input = z
    .object({ formId: z.string().uuid() })
    .strict()
    .parse(await body(req));
  return electionUseCases.linkForm(actor, id, input.formId);
}, true);
export const transitionElectionRouteHandler = route(async (req, actor, id) => {
  const input = z
    .object({ status: z.enum(["APPLICATION_OPEN", "APPLICATION_CLOSED"]) })
    .strict()
    .parse(await body(req));
  return electionUseCases.transition(actor, id, input.status);
}, true);
export const listElectionCandidatesRouteHandler = route(
  (_req, actor, id) => electionUseCases.candidates(actor, id),
  false,
);
