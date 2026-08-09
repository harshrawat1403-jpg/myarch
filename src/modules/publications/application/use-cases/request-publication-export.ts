import type { AuthenticatedActor } from "@/modules/auth";
import { canManagePublications } from "@/modules/auth";
import { NotAuthorizedError } from "@/lib/errors";
import { AUDIT_ACTIONS } from "@/lib/audit-actions";
import type { AuditRecorder } from "@/lib/audit";
import type { JobDispatcher } from "@/modules/jobs";
import type { PublicationExportFormat, PublicationExportRecord } from "../../domain/entities";
import { GENERATE_PUBLICATION_EXPORT_JOB_TYPE } from "../../domain/entities";
import { PublicationNotFoundError } from "../../domain/errors";
import type { PublicationRepository } from "../ports/publication-repository";
import type { PublicationExportRepository } from "../ports/publication-export-repository";

/**
 * V4.0 E5 (§13.1 step 6, §13.4, §19) — creates a PENDING PublicationExport
 * row (the audit trail of what was requested) and dispatches the actual
 * rendering to a background job; the request returns immediately, mirroring
 * DefaultNotificationService's own "record then dispatch, never render
 * inline" split.
 */
export class RequestPublicationExportUseCase {
  constructor(
    private readonly deps: {
      publicationRepository: PublicationRepository;
      exportRepository: PublicationExportRepository;
      jobDispatcher: JobDispatcher;
      auditRecorder: AuditRecorder;
    },
  ) {}

  async execute(actor: AuthenticatedActor, publicationId: string, format: PublicationExportFormat): Promise<PublicationExportRecord> {
    if (!canManagePublications(actor)) throw new NotAuthorizedError("Not authorized to export publications");

    const publication = await this.deps.publicationRepository.findById(publicationId);
    if (!publication) throw new PublicationNotFoundError();

    const created = await this.deps.exportRepository.create({ publicationId, format, generatedByUserId: actor.userId });

    await this.deps.jobDispatcher.dispatch(GENERATE_PUBLICATION_EXPORT_JOB_TYPE, {
      exportId: created.id,
      publicationId,
      format,
    });

    await this.deps.auditRecorder.record({
      actorUserId: actor.userId,
      action: AUDIT_ACTIONS.PUBLICATION_EXPORT_REQUESTED,
      targetEntityType: "Publication",
      targetEntityId: publicationId,
      metadata: { format },
    });

    return created;
  }
}
