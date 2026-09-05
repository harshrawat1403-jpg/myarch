import type { Prisma } from "@prisma/client";
import { PrismaAuditRecorder } from "@/lib/audit";
import { AUDIT_ACTIONS } from "@/lib/audit-actions";
import { ElectionError } from "../domain/election";

/** Public transaction integration point. The Forms repository holds the form
 * row lock and creates FormSubmission + FormApplication before calling this.
 * Throwing rolls back all three records. No application content is copied. */
export async function associateElectionCandidate(
  tx: Prisma.TransactionClient,
  input: {
    formId: string;
    applicationId: string;
    applicantUserId: string;
    electionPositionIds?: readonly string[];
  },
): Promise<void> {
  const link = await tx.electionApplicationForm.findUnique({ where: { formId: input.formId } });
  if (!link) {
    if (input.electionPositionIds?.length)
      throw new ElectionError("This form is not associated with an election", "validation");
    return;
  }
  await tx.$queryRaw`SELECT "id" FROM "elections" WHERE "id" = ${link.electionId}::uuid FOR UPDATE`;
  const election = await tx.election.findUnique({
    where: { id: link.electionId },
    include: { applicationForm: true, positions: true },
  });
  if (!election || election.applicationForm?.formId !== input.formId)
    throw new ElectionError("Election/form association changed; refresh and retry");
  const application = await tx.formApplication.findUnique({
    where: { id: input.applicationId },
    include: { submission: true },
  });
  if (
    !application ||
    application.submission.formId !== input.formId ||
    application.submission.applicantUserId !== input.applicantUserId
  )
    throw new ElectionError("Invalid election application association", "validation");
  const positions = input.electionPositionIds ?? [];
  const existing = await tx.electionCandidate.findUnique({
    where: {
      electionId_applicantUserId: {
        electionId: election.id,
        applicantUserId: input.applicantUserId,
      },
    },
    include: { positions: true },
  });
  if (existing) {
    if (
      existing.applicationId === input.applicationId &&
      positions.length === existing.positions.length &&
      existing.positions.every((p) => positions.includes(p.positionId))
    )
      return;
    throw new ElectionError("A candidacy already exists for this election");
  }
  const now = new Date();
  if (
    election.status !== "APPLICATION_OPEN" ||
    now < election.applicationOpenAt ||
    now >= election.applicationCloseAt
  )
    throw new ElectionError("Election applications are not open");
  // Share-lock eligibility rows so deactivation and intake have a defined order.
  const eligible = await tx.$queryRaw<{ id: string }[]>`
    SELECT u."id" FROM "users" u JOIN "student_profiles" s ON s."userId" = u."id"
    WHERE u."id" = ${input.applicantUserId}::uuid AND u."role" = 'STUDENT'
      AND u."isActive" = true AND s."isActive" = true AND s."id" = ${application.submission.studentProfileId}::uuid
    FOR SHARE OF u, s`;
  if (!eligible.length) throw new ElectionError("Only active students may apply", "validation");
  if (
    !positions.length ||
    positions.length > election.maxPositionsPerCandidate ||
    new Set(positions).size !== positions.length ||
    positions.some((id) => !election.positions.some((p) => p.id === id))
  )
    throw new ElectionError(
      "Select valid, distinct election positions within the configured limit",
      "validation",
    );
  const candidate = await tx.electionCandidate.create({
    data: {
      electionId: election.id,
      applicationId: application.id,
      applicantUserId: input.applicantUserId,
      positions: {
        create: positions.map((positionId) => ({
          position: {
            connect: {
              id_electionId: { id: positionId, electionId: election.id },
            },
          },
        })),
      },
    },
  });
  await new PrismaAuditRecorder(tx).record({
    actorUserId: input.applicantUserId,
    action: AUDIT_ACTIONS.ELECTION_CANDIDATE_CREATED,
    targetEntityType: "ElectionCandidate",
    targetEntityId: candidate.id,
    metadata: { electionId: election.id, applicationId: application.id },
  });
}
