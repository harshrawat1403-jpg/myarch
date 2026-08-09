import type { AuthenticatedActor } from "@/modules/auth";
import { canManageAlumni } from "@/modules/auth";
import { NotAuthorizedError } from "@/lib/errors";
import { AUDIT_ACTIONS } from "@/lib/audit-actions";
import type { AuditRecorder } from "@/lib/audit";
import type { AlumniRecord } from "../../domain/entities";
import { AlumniNotFoundError } from "../../domain/errors";
import type { AlumniRepository, UpdateAlumniData } from "../ports/alumni-repository";

export interface UpdateAlumniInput extends UpdateAlumniData {
  actor: AuthenticatedActor;
  alumniId: string;
}

export class UpdateAlumniUseCase {
  constructor(private readonly deps: { alumniRepository: AlumniRepository; auditRecorder: AuditRecorder }) {}

  async execute(input: UpdateAlumniInput): Promise<AlumniRecord> {
    if (!canManageAlumni(input.actor)) {
      throw new NotAuthorizedError("Not authorized to manage alumni records");
    }

    const existing = await this.deps.alumniRepository.findById(input.alumniId);
    if (!existing) throw new AlumniNotFoundError();

    const { actor, alumniId, ...data } = input;
    const updated = await this.deps.alumniRepository.update(alumniId, data);

    await this.deps.auditRecorder.record({
      actorUserId: actor.userId,
      action: AUDIT_ACTIONS.ALUMNI_UPDATED,
      targetEntityType: "AlumniProfile",
      targetEntityId: updated.id,
    });

    return updated;
  }
}
