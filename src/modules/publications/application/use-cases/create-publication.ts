import type { AuthenticatedActor } from "@/modules/auth";
import { canManagePublications } from "@/modules/auth";
import { NotAuthorizedError } from "@/lib/errors";
import { AUDIT_ACTIONS } from "@/lib/audit-actions";
import type { AuditRecorder } from "@/lib/audit";
import type { PublicationPageSize, PublicationRecord } from "../../domain/entities";
import { PublicationTemplateNotFoundError } from "../../domain/errors";
import type { PublicationRepository } from "../ports/publication-repository";
import type { PublicationTemplateRepository } from "../ports/publication-template-repository";
import { buildInitialContent } from "../block-builder";

export interface CreatePublicationInput {
  readonly actor: AuthenticatedActor;
  readonly title: string;
  readonly templateId: string;
  readonly pageSize: PublicationPageSize;
  /** studentProfileIds / companyIds / alumniProfileIds, per the template's own dataBinding kind — ignored for NONE/STATS templates. */
  readonly selectedIds?: readonly string[];
}

/** V4.0 E4 (§13.1 steps 1-2) — "Choose Template → Select Real Platform Data → Auto-populate," in one call. */
export class CreatePublicationUseCase {
  constructor(
    private readonly deps: {
      publicationRepository: PublicationRepository;
      templateRepository: PublicationTemplateRepository;
      auditRecorder: AuditRecorder;
    },
  ) {}

  async execute(input: CreatePublicationInput): Promise<PublicationRecord> {
    if (!canManagePublications(input.actor)) throw new NotAuthorizedError("Not authorized to create publications");

    const template = await this.deps.templateRepository.findById(input.templateId);
    if (!template) throw new PublicationTemplateNotFoundError();

    const content = buildInitialContent(template.structure, input.selectedIds ?? []);

    const created = await this.deps.publicationRepository.create({
      title: input.title.trim(),
      type: template.type,
      templateId: template.id,
      content,
      pageSize: input.pageSize,
      createdByUserId: input.actor.userId,
    });

    await this.deps.auditRecorder.record({
      actorUserId: input.actor.userId,
      action: AUDIT_ACTIONS.PUBLICATION_CREATED,
      targetEntityType: "Publication",
      targetEntityId: created.id,
      metadata: { templateId: template.id, templateName: template.name },
    });

    return created;
  }
}
