import { Prisma } from "@prisma/client";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { withAuth, type AuthenticatedActor } from "@/modules/auth";
import { extractRouteParam } from "@/lib/route-params";
import { badRequest, conflict, forbidden, notFound } from "@/lib/http-errors";
import { NotAuthorizedError } from "@/lib/errors";
import { CoreCommitteeSelectionError } from "../domain/core-committee-selection";
import { coreCommitteeSelectionUseCases } from "../infrastructure/container";
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
          return badRequest("Invalid Core Committee selection data", error.flatten().fieldErrors);
        if (error instanceof CoreCommitteeSelectionError)
          return error.kind === "notFound"
            ? notFound(error.message)
            : error.kind === "validation"
              ? badRequest(error.message)
              : conflict(error.message);
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          ["P2002", "P2003", "P2025", "P2034"].includes(error.code)
        )
          return conflict(
            "Conflicting Core Committee selection data or concurrent change; refresh and retry",
          );
        throw error;
      }
    },
    { roles: admin ? ["SECRETARY"] : undefined },
  );
}
const body = (req: NextRequest) => req.json().catch(() => null);
const candidateId = async (context: unknown) =>
  z
    .string()
    .uuid()
    .parse(await extractRouteParam(context, "candidateId"));
const interviewId = async (context: unknown) =>
  z
    .string()
    .uuid()
    .parse(await extractRouteParam(context, "interviewId"));
const decisionId = async (context: unknown) =>
  z
    .string()
    .uuid()
    .parse(await extractRouteParam(context, "decisionId"));
export const listCoreCommitteeSelectionsRouteHandler = route(
  (_req, actor) => coreCommitteeSelectionUseCases.list(actor),
  false,
  false,
);
export const createCoreCommitteeSelectionRouteHandler = route(
  async (req, actor) => coreCommitteeSelectionUseCases.create(actor, await body(req)),
  true,
  false,
  201,
);
export const getCoreCommitteeSelectionRouteHandler = route(
  (_req, actor, id) => coreCommitteeSelectionUseCases.get(actor, id),
  false,
);
export const updateCoreCommitteeSelectionRouteHandler = route(
  async (req, actor, id) => coreCommitteeSelectionUseCases.update(actor, id, await body(req)),
  true,
);
export const saveCoreCommitteeSelectionPositionRouteHandler = route(
  async (req, actor, id, context) =>
    coreCommitteeSelectionUseCases.savePosition(
      actor,
      id,
      (await extractRouteParam(context, "positionId"))
        ? z
            .string()
            .uuid()
            .parse(await extractRouteParam(context, "positionId"))
        : null,
      await body(req),
    ),
  true,
  true,
  201,
);
export const linkCoreCommitteeSelectionFormRouteHandler = route(
  async (req, actor, id) =>
    coreCommitteeSelectionUseCases.linkForm(
      actor,
      id,
      z
        .object({ formId: z.string().uuid() })
        .strict()
        .parse(await body(req)).formId,
    ),
  true,
);
export const transitionCoreCommitteeSelectionRouteHandler = route(
  async (req, actor, id) =>
    coreCommitteeSelectionUseCases.transition(
      actor,
      id,
      z
        .object({ status: z.string() })
        .strict()
        .parse(await body(req)).status,
    ),
  true,
);
export const listCoreCommitteeSelectionCandidatesRouteHandler = route(
  (_req, actor, id) => coreCommitteeSelectionUseCases.candidates(actor, id),
  false,
);
export const coreCommitteeSelectionProcessingRouteHandler = route(
  (_req, actor, id) => coreCommitteeSelectionUseCases.processing(actor, id),
  false,
);
export const scrutinyCoreCommitteeSelectionCandidateRouteHandler = route(
  async (req, actor, id, context) =>
    coreCommitteeSelectionUseCases.scrutiny(actor, id, await candidateId(context), await body(req)),
  true,
);
export const correctionCoreCommitteeSelectionCandidateRouteHandler = route(
  async (req, actor, id, context) =>
    coreCommitteeSelectionUseCases.correction(
      actor,
      id,
      await candidateId(context),
      await body(req),
    ),
  false,
);
export const shortlistCoreCommitteeSelectionRouteHandler = route(
  async (req, actor, id) => coreCommitteeSelectionUseCases.shortlist(actor, id, await body(req)),
  true,
);
export const createCoreCommitteeSelectionInterviewRouteHandler = route(
  async (req, actor, id) => coreCommitteeSelectionUseCases.interview(actor, id, await body(req)),
  true,
  true,
  201,
);
export const completeCoreCommitteeSelectionInterviewRouteHandler = route(
  async (req, actor, id, context) =>
    coreCommitteeSelectionUseCases.completeInterview(
      actor,
      id,
      await interviewId(context),
      await body(req),
    ),
  true,
);
export const reviewCoreCommitteeSelectionRouteHandler = route(
  async (req, actor, id) => coreCommitteeSelectionUseCases.review(actor, id, await body(req)),
  false,
);
export const decideCoreCommitteeSelectionRouteHandler = route(
  async (req, actor, id) => coreCommitteeSelectionUseCases.decision(actor, id, await body(req)),
  false,
);
export const finalizeCoreCommitteeSelectionDecisionRouteHandler = route(
  async (_req, actor, id, context) =>
    coreCommitteeSelectionUseCases.finalizeDecision(actor, id, await decisionId(context)),
  true,
);
export const publishCoreCommitteeSelectionRouteHandler = route(
  (_req, actor, id) => coreCommitteeSelectionUseCases.publish(actor, id),
  true,
);
export const coreCommitteeSelectionAppointmentPreviewRouteHandler = route(
  (_req, actor, id) => coreCommitteeSelectionUseCases.appointmentPreview(actor, id),
  true,
);
export const confirmCoreCommitteeSelectionAppointmentsRouteHandler = route(
  (_req, actor, id) => coreCommitteeSelectionUseCases.confirmAppointments(actor, id),
  true,
);
export const archiveCoreCommitteeSelectionRouteHandler = route(
  (_req, actor, id) => coreCommitteeSelectionUseCases.archive(actor, id),
  true,
);

export const publishedCoreCommitteeSelectionResultsRouteHandler = route(
  (_req, actor, id) => coreCommitteeSelectionUseCases.publishedResults(actor, id),
  false,
);
