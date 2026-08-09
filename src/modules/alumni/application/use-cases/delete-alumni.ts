import type { AuthenticatedActor } from "@/modules/auth";
import { canManageAlumni } from "@/modules/auth";
import { NotAuthorizedError } from "@/lib/errors";
import { AUDIT_ACTIONS } from "@/lib/audit-actions";
import type { AuditRecorder } from "@/lib/audit";
import { AlumniNotFoundError } from "../../domain/errors";
import type { AlumniRepository } from "../ports/alumni-repository";

export interface DeleteAlumniInput {
  actor: AuthenticatedActor;
  alumniId: string;
}

/** V4.0 D5 — no isActive/soft-delete field exists on AlumniProfile (the PRD's own ER definition never lists one), so "Full (operational)" CRUD includes a real delete, unlike every other entity in this PRD. */
export class DeleteAlumniUseCase {
  constructor(private readonly deps: { alumniRepository: AlumniRepository; auditRecorder: AuditRecorder }) {}

  async execute(input: DeleteAlumniInput): Promise<void> {
    if (!canManageAlumni(input.actor)) {
      throw new NotAuthorizedError("Not authorized to manage alumni records");
    }

    const existing = await this.deps.alumniRepository.findById(input.alumniId);
    if (!existing) throw new AlumniNotFoundError();

    await this.deps.alumniRepository.delete(input.alumniId);

    await this.deps.auditRecorder.record({
      actorUserId: input.actor.userId,
      action: AUDIT_ACTIONS.ALUMNI_DELETED,
      targetEntityType: "AlumniProfile",
      targetEntityId: input.alumniId,
      metadata: { fullName: existing.fullName },
    });
  }
}
