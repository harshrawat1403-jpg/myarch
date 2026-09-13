import type { AuthenticatedActor } from "@/modules/auth";
import { NotAuthorizedError } from "@/lib/errors";
import { AUDIT_ACTIONS } from "@/lib/audit-actions";
import type { AuditRecorder } from "@/lib/audit";
import type { FormRepository } from "@/modules/forms";
import { isFormAvailable } from "@/modules/forms";
import type { NotificationService } from "@/modules/notifications";
import type { FormApplicationRecord } from "../../domain/entities";
import { canSubmitFormApplication } from "../../domain/permissions";
import { DuplicateFormApplicationError, FormNotAvailableError } from "../../domain/errors";
import type { ApplicationRepository } from "../ports/application-repository";
import type { ApplicantLookup } from "../ports/applicant-lookup";
import { validateFormAnswers } from "../answer-validation";

export class SubmitFormUseCase {
  constructor(private readonly deps: {
    formRepository: FormRepository;
    applicationRepository: ApplicationRepository;
    applicantLookup: ApplicantLookup;
    secretaryRecipientLookup: { listActiveSecretaryUserIds(): Promise<readonly string[]> };
    auditRecorder: AuditRecorder;
    notificationService: NotificationService;
  }) {}

  async execute(input: { actor: AuthenticatedActor; formId: string; answers: Record<string, unknown>; electionPositionIds?: readonly string[]; coreCommitteeSelectionPositionIds?: readonly string[]; allowCoreCommitteeSelectionForm?: boolean }): Promise<FormApplicationRecord> {
    if (!canSubmitFormApplication(input.actor)) throw new NotAuthorizedError("Only students may submit forms");
    const form = await this.deps.formRepository.findById(input.formId);
    if (!form || !isFormAvailable(form)) throw new FormNotAvailableError();
    if (
      !input.allowCoreCommitteeSelectionForm &&
      await this.deps.formRepository.isCoreCommitteeSelectionForm(form.id)
    )
      throw new FormNotAvailableError(
        "Core Committee applications must be submitted through the Core Committee application page",
      );
    const applicant = await this.deps.applicantLookup.findByUserId(input.actor.userId);
    if (!applicant) throw new NotAuthorizedError("Student profile not found");
    validateFormAnswers(form.fields, input.answers);
    const existing = await this.deps.applicationRepository.findByApplicantAndForm(input.actor.userId, form.id);
    if (existing) throw new DuplicateFormApplicationError();
    const application = await this.deps.applicationRepository.createSubmitted({
      formId: form.id,
      applicantUserId: applicant.userId,
      studentProfileId: applicant.studentProfileId,
      answers: input.answers,
      electionPositionIds: input.electionPositionIds,
      coreCommitteeSelectionPositionIds: input.coreCommitteeSelectionPositionIds,
      actorUserId: input.actor.userId,
    });
    await this.deps.auditRecorder.record({ actorUserId: input.actor.userId, action: AUDIT_ACTIONS.FORM_APPLICATION_SUBMITTED, targetEntityType: "FormApplication", targetEntityId: application.id, metadata: { formId: form.id } });
    const recipients = await this.deps.secretaryRecipientLookup.listActiveSecretaryUserIds();
    await Promise.all(recipients.map((recipientUserId) => this.deps.notificationService.notify({ recipientUserId, template: "FORM_SUBMITTED", context: { applicationId: application.id, formId: form.id, formTitle: form.title } })));
    return application;
  }
}
