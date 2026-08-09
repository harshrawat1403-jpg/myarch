import type { AuthenticatedActor } from "@/modules/auth";
import { canManageAlumni } from "@/modules/auth";
import { NotAuthorizedError } from "@/lib/errors";
import { AUDIT_ACTIONS } from "@/lib/audit-actions";
import type { AuditRecorder } from "@/lib/audit";
import type { AlumniRecord } from "../../domain/entities";
import type { AlumniRepository, CreateAlumniData } from "../ports/alumni-repository";

export interface CreateAlumniInput extends CreateAlumniData {
  actor: AuthenticatedActor;
}

export class CreateAlumniUseCase {
  constructor(private readonly deps: { alumniRepository: AlumniRepository; auditRecorder: AuditRecorder }) {}

  async execute(input: CreateAlumniInput): Promise<AlumniRecord> {
    if (!canManageAlumni(input.actor)) {
      throw new NotAuthorizedError("Not authorized to manage alumni records");
    }

    const { actor, ...data } = input;
    const alumni = await this.deps.alumniRepository.create(data);

    await this.deps.auditRecorder.record({
      actorUserId: actor.userId,
      action: AUDIT_ACTIONS.ALUMNI_CREATED,
      targetEntityType: "AlumniProfile",
      targetEntityId: alumni.id,
      metadata: { fullName: alumni.fullName, graduationYear: alumni.graduationYear },
    });

    return alumni;
  }
}
