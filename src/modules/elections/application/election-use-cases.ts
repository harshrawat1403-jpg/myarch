import type { AuthenticatedActor } from "@/modules/auth";
import type { NotificationService } from "@/modules/notifications";
import { NotAuthorizedError } from "@/lib/errors";
import { z } from "zod";
import {
  electionConfigSchema,
  positionSchema,
  validateSchedule,
  validateWeights,
  ElectionError,
} from "../domain/election";
import type { ElectionRepository } from "./ports/election-repository";

export function requireSecretary(actor: AuthenticatedActor): void {
  if (actor.role !== "SECRETARY")
    throw new NotAuthorizedError("Only the Secretary may administer elections");
}
function requireReader(actor: AuthenticatedActor): void {
  if (actor.role !== "SECRETARY" && actor.role !== "STUDENT")
    throw new NotAuthorizedError("Election access is limited to students and the Secretary");
}
export class ElectionUseCases {
  constructor(
    private readonly repository: ElectionRepository,
    private readonly notifications: NotificationService,
  ) {}
  private async notifyCandidate(electionId: string, candidateId: string, message: string) {
    const processing = (await this.repository.processing(undefined, electionId, true)) as {
      candidates: { id: string; applicantUserId: string }[];
    };
    const candidate = processing.candidates.find((item) => item.id === candidateId);
    if (candidate)
      await this.notifications.notify({
        recipientUserId: candidate.applicantUserId,
        template: "ELECTION_PROCESSING_UPDATED",
        context: { electionId, title: "Election", message },
      });
  }
  async list(actor: AuthenticatedActor) {
    requireReader(actor);
    return this.repository.list(actor.role === "SECRETARY");
  }
  async get(actor: AuthenticatedActor, id: string) {
    requireReader(actor);
    const election = await this.repository.get(id);
    if (!election || (actor.role !== "SECRETARY" && election.status === "DRAFT"))
      throw new ElectionError("Election not found", "notFound");
    return election;
  }
  async create(actor: AuthenticatedActor, input: unknown) {
    requireSecretary(actor);
    const config = electionConfigSchema.parse(input);
    validateSchedule(config);
    return this.repository.create(config, actor.userId);
  }
  async update(actor: AuthenticatedActor, id: string, input: unknown) {
    requireSecretary(actor);
    const config = electionConfigSchema.parse(input);
    validateSchedule(config);
    return this.repository.update(id, config, actor.userId);
  }
  async savePosition(
    actor: AuthenticatedActor,
    id: string,
    positionId: string | null,
    input: unknown,
  ) {
    requireSecretary(actor);
    const position = positionSchema.parse(input);
    validateWeights(position.weights);
    return this.repository.savePosition(id, positionId, position, actor.userId);
  }
  async deletePosition(actor: AuthenticatedActor, id: string, positionId: string) {
    requireSecretary(actor);
    return this.repository.deletePosition(id, positionId, actor.userId);
  }
  async linkForm(actor: AuthenticatedActor, id: string, formId: string) {
    requireSecretary(actor);
    return this.repository.linkForm(id, formId, actor.userId);
  }
  async transition(
    actor: AuthenticatedActor,
    id: string,
    status: Exclude<import("../domain/election").ElectionStatus, "DRAFT" | "FINAL_CANDIDATES">,
  ) {
    requireSecretary(actor);
    const election = await this.repository.transition(id, status, actor.userId);
    if (status === "APPLICATION_OPEN") {
      const recipients = await this.repository.activeStudentUserIds();
      await Promise.all(
        recipients.map((recipientUserId) =>
          this.notifications.notify({
            recipientUserId,
            template: "ELECTION_APPLICATION_OPENED",
            context: {
              electionId: id,
              title: election.title,
              deadline: election.applicationCloseAt.toISOString(),
            },
          }),
        ),
      );
    }
    return election;
  }
  async candidates(actor: AuthenticatedActor, id: string) {
    await this.get(actor, id);
    return this.repository.candidates(id, actor.role === "SECRETARY" ? undefined : actor.userId);
  }
  async processing(actor: AuthenticatedActor, id: string) {
    if (actor.role === "RECRUITER")
      throw new NotAuthorizedError("Recruiters cannot access election processing");
    return this.repository.processing(
      actor.role === "SECRETARY" ? undefined : actor.userId,
      id,
      actor.role === "SECRETARY",
    );
  }
  async panelAssignments(actor: AuthenticatedActor) {
    if (actor.role === "RECRUITER")
      throw new NotAuthorizedError("Recruiters cannot access election interviews");
    return this.repository.panelAssignments(actor.userId);
  }
  async scrutiny(actor: AuthenticatedActor, id: string, candidateId: string, input: unknown) {
    requireSecretary(actor);
    const value = z
      .object({
        decision: z.enum(["ELIGIBLE", "INELIGIBLE", "CORRECTION_REQUIRED"]),
        reason: z.string().trim().min(1).max(5000),
      })
      .strict()
      .parse(input);
    const result = await this.repository.recordScrutiny({
      electionId: id,
      candidateId,
      ...value,
      actorUserId: actor.userId,
    });
    await this.notifyCandidate(
      id,
      candidateId,
      `Your scrutiny decision is ${value.decision.replaceAll("_", " ")}.`,
    );
    return result;
  }
  async correction(actor: AuthenticatedActor, id: string, candidateId: string, input: unknown) {
    if (actor.role === "SECRETARY") {
      const value = z
        .object({ instructions: z.string().trim().min(1).max(5000) })
        .strict()
        .parse(input);
      const result = await this.repository.requestCorrection({
        electionId: id,
        candidateId,
        ...value,
        actorUserId: actor.userId,
      });
      await this.notifyCandidate(
        id,
        candidateId,
        "A correction has been requested for your candidacy.",
      );
      return result;
    }
    if (actor.role !== "STUDENT")
      throw new NotAuthorizedError("Only the candidate may submit a correction");
    const value = z
      .object({
        statement: z.string().trim().min(1).max(10000),
        evidenceReference: z.string().trim().max(2000).optional(),
      })
      .strict()
      .parse(input);
    const result = await this.repository.submitCorrection({
      electionId: id,
      candidateId,
      ...value,
      actorUserId: actor.userId,
    });
    await this.notifyCandidate(id, candidateId, "Your correction has been received for review.");
    return result;
  }
  async objection(actor: AuthenticatedActor, id: string, candidateId: string, input: unknown) {
    if (actor.role === "SECRETARY") {
      const value = z
        .object({
          objectionId: z.string().uuid(),
          status: z.enum(["RESOLVED", "DISMISSED"]),
          decisionReason: z.string().trim().min(1).max(5000),
        })
        .strict()
        .parse(input);
      const result = await this.repository.resolveObjection({
        electionId: id,
        candidateId,
        ...value,
        actorUserId: actor.userId,
      });
      await this.notifyCandidate(id, candidateId, "Your election objection has been reviewed.");
      return result;
    }
    if (actor.role !== "STUDENT")
      throw new NotAuthorizedError("Only a candidate may submit an appeal");
    const value = z
      .object({
        reason: z.string().trim().min(1).max(5000),
        evidenceReference: z.string().trim().max(2000).optional(),
      })
      .strict()
      .parse(input);
    return this.repository.createObjection({
      electionId: id,
      candidateId,
      ...value,
      actorUserId: actor.userId,
    });
  }
  async shortlist(actor: AuthenticatedActor, id: string, input: unknown) {
    requireSecretary(actor);
    const value = z
      .object({
        candidateId: z.string().uuid(),
        positionIds: z.array(z.string().uuid()).min(1).max(100),
      })
      .strict()
      .parse(input);
    const result = await this.repository.shortlist({
      electionId: id,
      ...value,
      actorUserId: actor.userId,
    });
    await this.notifyCandidate(
      id,
      value.candidateId,
      "You have been shortlisted for an election interview.",
    );
    return result;
  }
  async withdraw(actor: AuthenticatedActor, id: string, candidateId: string, input: unknown) {
    if (actor.role !== "STUDENT") throw new NotAuthorizedError("Only a candidate may withdraw");
    const value = z
      .object({ reason: z.string().trim().max(2000).optional() })
      .strict()
      .parse(input);
    const result = await this.repository.withdraw({
      electionId: id,
      candidateId,
      ...value,
      actorUserId: actor.userId,
    });
    await this.notifyCandidate(id, candidateId, "Your election candidacy has been withdrawn.");
    return result;
  }
  async criterion(
    actor: AuthenticatedActor,
    id: string,
    criterionId: string | undefined,
    input: unknown,
  ) {
    requireSecretary(actor);
    const value = z
      .object({
        name: z.string().trim().min(1).max(200),
        description: z.string().trim().max(5000).default(""),
        maxScore: z.number().positive().max(100000),
        weight: z.number().positive().max(100000).default(1),
        displayOrder: z.number().int().min(0),
        required: z.boolean().default(true),
      })
      .strict()
      .parse(input);
    return this.repository.saveCriterion({
      electionId: id,
      criterionId,
      ...value,
      actorUserId: actor.userId,
    });
  }
  async interview(actor: AuthenticatedActor, id: string, input: unknown) {
    requireSecretary(actor);
    const value = z
      .object({
        candidateId: z.string().uuid(),
        positionId: z.string().uuid(),
        scheduledAt: z
          .union([z.string().datetime(), z.date()])
          .optional()
          .transform((v) => (v ? new Date(v) : undefined)),
        durationMinutes: z.number().int().positive().max(1440).optional(),
        mode: z.string().trim().max(100).optional(),
        location: z.string().trim().max(2000).optional(),
        panelUserIds: z.array(z.string().uuid()).min(1).max(50),
      })
      .strict()
      .parse(input);
    const result = await this.repository.createInterview({
      electionId: id,
      ...value,
      actorUserId: actor.userId,
    });
    await this.notifyCandidate(
      id,
      value.candidateId,
      "Your election interview has been scheduled.",
    );
    return result;
  }
  async completeInterview(
    actor: AuthenticatedActor,
    id: string,
    interviewId: string,
    input: unknown,
  ) {
    requireSecretary(actor);
    const value = z.object({ candidateAttended: z.boolean() }).strict().parse(input);
    return this.repository.completeInterview({
      electionId: id,
      interviewId,
      ...value,
      actorUserId: actor.userId,
    });
  }
  async scores(actor: AuthenticatedActor, id: string, interviewId: string, input: unknown) {
    if (actor.role === "RECRUITER")
      throw new NotAuthorizedError("Recruiters cannot score election interviews");
    const value = z
      .object({
        scores: z
          .array(
            z
              .object({
                criterionId: z.string().uuid(),
                score: z.number().min(0),
                comments: z.string().trim().max(5000).optional(),
              })
              .strict(),
          )
          .min(1)
          .max(100),
      })
      .strict()
      .parse(input);
    return this.repository.submitScores({
      electionId: id,
      interviewId,
      ...value,
      actorUserId: actor.userId,
    });
  }
  async lockScores(actor: AuthenticatedActor, id: string, interviewId: string) {
    requireSecretary(actor);
    return this.repository.lockScores({ electionId: id, interviewId, actorUserId: actor.userId });
  }
  async panelRecusal(
    actor: AuthenticatedActor,
    id: string,
    interviewId: string,
    panelMemberId: string,
    input: unknown,
  ) {
    requireSecretary(actor);
    const value = z.object({ isRecused: z.boolean() }).strict().parse(input);
    return this.repository.setPanelRecusal({
      electionId: id,
      interviewId,
      panelMemberId,
      ...value,
      actorUserId: actor.userId,
    });
  }
  async finalCandidates(actor: AuthenticatedActor, id: string, input: unknown) {
    requireSecretary(actor);
    const value = z
      .object({
        entries: z
          .array(
            z.object({ candidateId: z.string().uuid(), positionId: z.string().uuid() }).strict(),
          )
          .min(1)
          .max(1000),
      })
      .strict()
      .parse(input);
    const result = await this.repository.lockFinalCandidates({
      electionId: id,
      ...value,
      actorUserId: actor.userId,
    });
    await Promise.all(
      value.entries.map((entry) =>
        this.notifyCandidate(id, entry.candidateId, "Your final-candidate status has been locked."),
      ),
    );
    return result;
  }
  async saveVoterRosterEntry(actor: AuthenticatedActor, id: string, input: unknown) {
    requireSecretary(actor);
    const value = z
      .object({ voterGroup: z.enum(["FACULTY", "EX_COUNCIL"]), userId: z.string().uuid() })
      .strict()
      .parse(input);
    return this.repository.saveVoterRosterEntry({
      electionId: id,
      ...value,
      actorUserId: actor.userId,
    });
  }
  async removeVoterRosterEntry(
    actor: AuthenticatedActor,
    id: string,
    voterGroup: "FACULTY" | "EX_COUNCIL",
    entryId: string,
  ) {
    requireSecretary(actor);
    return this.repository.removeVoterRosterEntry({
      electionId: id,
      voterGroup,
      entryId,
      actorUserId: actor.userId,
    });
  }
  async voterRoster(actor: AuthenticatedActor, id: string) {
    requireSecretary(actor);
    return this.repository.voterRoster(id);
  }
  async lockVoterSnapshot(actor: AuthenticatedActor, id: string) {
    requireSecretary(actor);
    return this.repository.lockVoterSnapshot({ electionId: id, actorUserId: actor.userId });
  }
  async ballot(actor: AuthenticatedActor, id: string) {
    return this.repository.ballot(id, actor.userId);
  }
  async castBallot(actor: AuthenticatedActor, id: string, input: unknown) {
    const value = z
      .object({
        choices: z
          .array(
            z
              .object({
                positionId: z.string().uuid(),
                candidateId: z.string().uuid().optional(),
                isNota: z.boolean().optional(),
              })
              .strict(),
          )
          .min(1)
          .max(1000),
      })
      .strict()
      .parse(input);
    return this.repository.castBallot({ electionId: id, userId: actor.userId, ...value });
  }
  async abstain(actor: AuthenticatedActor, id: string) {
    return this.repository.abstain({ electionId: id, userId: actor.userId });
  }
  async turnout(actor: AuthenticatedActor, id: string) {
    requireSecretary(actor);
    return this.repository.turnout(id);
  }
}
