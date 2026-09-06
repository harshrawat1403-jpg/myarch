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
