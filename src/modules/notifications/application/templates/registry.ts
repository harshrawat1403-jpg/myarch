import type { NotificationTemplateId } from "../../domain/entities";
import type { EmailTemplateDefinition } from "./types";
import { profileApprovedTemplate } from "./definitions/profile-approved";
import { profileChangesRequestedTemplate } from "./definitions/profile-changes-requested";

/**
 * Every known template, keyed by the id business use cases pass to
 * NotificationService.notify(). Adding a template is purely additive: a new
 * definition file plus one new entry here.
 */
export const EMAIL_TEMPLATE_REGISTRY: Record<NotificationTemplateId, EmailTemplateDefinition> = {
  PROFILE_APPROVED: profileApprovedTemplate,
  PROFILE_CHANGES_REQUESTED: profileChangesRequestedTemplate,
};
