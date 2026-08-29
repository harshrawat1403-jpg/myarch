import type { AuthenticatedActor } from "@/modules/auth";
import { NotAuthorizedError } from "@/lib/errors";
import { AUDIT_ACTIONS } from "@/lib/audit-actions";
import type { AuditRecorder } from "@/lib/audit";
import type { CommitteeRecord, CommitteeType } from "../../domain/entities";
import { canCreateCommittee } from "../../domain/permissions";
import type { CommitteeRepository } from "../ports/committee-repository";

export interface CreateCommitteeInput {
  actor: AuthenticatedActor;
  name: string;
  type: CommitteeType;
  academicYear?: string | null;
  responsibilities?: string | null;
  startDate?: Date | null;
  endDate?: Date | null;
}

export class CreateCommitteeUseCase {
  constructor(private readonly deps: { committeeRepository: CommitteeRepository; auditRecorder: AuditRecorder }) {}

  async execute(input: CreateCommitteeInput): Promise<CommitteeRecord> {
    if (!canCreateCommittee(input.actor)) {
      throw new NotAuthorizedError("Not authorized to create a committee");
    }

    const committee = await this.deps.committeeRepository.create({
      name: input.name.trim(),
      type: input.type,
      academicYear: input.academicYear?.trim() ?? null,
      responsibilities: input.responsibilities?.trim() ?? null,
      startDate: input.startDate ?? null,
      endDate: input.endDate ?? null,
    });

    await this.deps.auditRecorder.record({
      actorUserId: input.actor.userId,
      action: AUDIT_ACTIONS.COMMITTEE_CREATED,
      targetEntityType: "Committee",
      targetEntityId: committee.id,
      metadata: { name: committee.name, type: committee.type },
    });

    return committee;
  }
}
