import type { EmailTemplateDefinition, InAppTemplateDefinition } from "../types";
import { escapeHtml } from "../layout";

const selectionTitle = (context: Record<string, unknown>) =>
  String(context.selectionTitle ?? "the Core Committee selection");

export const coreCommitteeSelectionResultPublishedTemplate: EmailTemplateDefinition = {
  subject: (context) => `Core Committee selection results published: ${selectionTitle(context)}`,
  bodyText: (context) =>
    `The results for ${selectionTitle(context)} have been published. Check the department portal for the published outcome.`,
  bodyHtml: (context) =>
    `<p>The results for <strong>${escapeHtml(selectionTitle(context))}</strong> have been published.</p><p>Check the department portal for the published outcome.</p>`,
};

export const coreCommitteeSelectionResultPublishedInAppTemplate: InAppTemplateDefinition = {
  title: () => "Core Committee results published",
  message: (context) => selectionTitle(context),
};

export const coreCommitteeSelectionSelectedTemplate: EmailTemplateDefinition = {
  subject: (context) => `Selected for Core Committee: ${selectionTitle(context)}`,
  bodyText: (context) =>
    `You have been selected through ${selectionTitle(context)}. The Department will confirm membership separately.`,
  bodyHtml: (context) =>
    `<p>You have been selected through <strong>${escapeHtml(selectionTitle(context))}</strong>.</p><p>The Department will confirm membership separately.</p>`,
};

export const coreCommitteeSelectionSelectedInAppTemplate: InAppTemplateDefinition = {
  title: () => "Selected for Core Committee",
  message: (context) => selectionTitle(context),
};

export const coreCommitteeSelectionNotSelectedTemplate: EmailTemplateDefinition = {
  subject: (context) => `Core Committee selection update: ${selectionTitle(context)}`,
  bodyText: (context) =>
    `The selection process for ${selectionTitle(context)} has concluded. You were not selected on this occasion.`,
  bodyHtml: (context) =>
    `<p>The selection process for <strong>${escapeHtml(selectionTitle(context))}</strong> has concluded.</p><p>You were not selected on this occasion.</p>`,
};

export const coreCommitteeSelectionNotSelectedInAppTemplate: InAppTemplateDefinition = {
  title: () => "Core Committee selection update",
  message: (context) => selectionTitle(context),
};

export const coreCommitteeSelectionMembershipConfirmedTemplate: EmailTemplateDefinition = {
  subject: (context) => `Core Committee membership confirmed: ${selectionTitle(context)}`,
  bodyText: (context) =>
    `Your Core Committee membership has been confirmed for ${selectionTitle(context)}.`,
  bodyHtml: (context) =>
    `<p>Your Core Committee membership has been confirmed for <strong>${escapeHtml(selectionTitle(context))}</strong>.</p>`,
};

export const coreCommitteeSelectionMembershipConfirmedInAppTemplate: InAppTemplateDefinition = {
  title: () => "Core Committee membership confirmed",
  message: (context) => selectionTitle(context),
};

const interviewDate = (context: Record<string, unknown>) =>
  typeof context.scheduledAt === "string" ? ` for ${context.scheduledAt}` : "";

export const coreCommitteeSelectionShortlistedTemplate: EmailTemplateDefinition = {
  subject: (context) => `Shortlisted for Core Committee: ${selectionTitle(context)}`,
  bodyText: (context) => `You have been shortlisted for ${selectionTitle(context)}. Further interview details will follow.`,
  bodyHtml: (context) => `<p>You have been shortlisted for <strong>${escapeHtml(selectionTitle(context))}</strong>.</p><p>Further interview details will follow.</p>`,
};
export const coreCommitteeSelectionShortlistedInAppTemplate: InAppTemplateDefinition = {
  title: () => "Shortlisted for Core Committee", message: (context) => selectionTitle(context),
};

export const coreCommitteeSelectionInterviewScheduledTemplate: EmailTemplateDefinition = {
  subject: (context) => `Core Committee interview scheduled: ${selectionTitle(context)}`,
  bodyText: (context) => `Your Core Committee interview${interviewDate(context)} has been scheduled. Check the department portal for details.`,
  bodyHtml: (context) => `<p>Your Core Committee interview${escapeHtml(interviewDate(context))} has been scheduled.</p><p>Check the department portal for details.</p>`,
};
export const coreCommitteeSelectionInterviewScheduledInAppTemplate: InAppTemplateDefinition = {
  title: () => "Core Committee interview scheduled", message: (context) => selectionTitle(context),
};

export const coreCommitteeSelectionInterviewRescheduledTemplate: EmailTemplateDefinition = {
  subject: (context) => `Core Committee interview updated: ${selectionTitle(context)}`,
  bodyText: (context) => `Your Core Committee interview${interviewDate(context)} has been rescheduled. Check the department portal for details.`,
  bodyHtml: (context) => `<p>Your Core Committee interview${escapeHtml(interviewDate(context))} has been rescheduled.</p><p>Check the department portal for details.</p>`,
};
export const coreCommitteeSelectionInterviewRescheduledInAppTemplate: InAppTemplateDefinition = {
  title: () => "Core Committee interview updated", message: (context) => selectionTitle(context),
};

export const coreCommitteeSelectionInterviewCancelledTemplate: EmailTemplateDefinition = {
  subject: (context) => `Core Committee interview cancelled: ${selectionTitle(context)}`,
  bodyText: (context) => `Your Core Committee interview for ${selectionTitle(context)} has been cancelled. The Department will share any next steps separately.`,
  bodyHtml: (context) => `<p>Your Core Committee interview for <strong>${escapeHtml(selectionTitle(context))}</strong> has been cancelled.</p><p>The Department will share any next steps separately.</p>`,
};
export const coreCommitteeSelectionInterviewCancelledInAppTemplate: InAppTemplateDefinition = {
  title: () => "Core Committee interview cancelled", message: (context) => selectionTitle(context),
};
