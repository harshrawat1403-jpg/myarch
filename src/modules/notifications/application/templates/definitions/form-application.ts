import type { EmailTemplateDefinition, InAppTemplateDefinition } from "../types";
import { escapeHtml } from "../layout";

export const formSubmittedTemplate: EmailTemplateDefinition = {
  subject: (context) => `New form submission: ${String(context.formTitle ?? "a form")}`,
  bodyText: (context) => `A student submitted ${String(context.formTitle ?? "a form")}. Log in to TNPArch to review it.`,
  bodyHtml: (context) => `<p>A student submitted <strong>${escapeHtml(String(context.formTitle ?? "a form"))}</strong>.</p><p>Log in to TNPArch to review it.</p>`,
};
export const formSubmittedInAppTemplate: InAppTemplateDefinition = {
  title: () => "New form submission",
  message: (context) => String(context.formTitle ?? "A form was submitted"),
};

export const formApplicationReviewerAssignedTemplate: EmailTemplateDefinition = {
  subject: (context) => `Application review assigned: ${String(context.formTitle ?? "a form")}`,
  bodyText: (context) => `You have been assigned to review an application for ${String(context.formTitle ?? "a form")}.`,
  bodyHtml: (context) => `<p>You have been assigned to review an application for <strong>${escapeHtml(String(context.formTitle ?? "a form"))}</strong>.</p>`,
};
export const formApplicationReviewerAssignedInAppTemplate: InAppTemplateDefinition = {
  title: () => "Application review assigned",
  message: (context) => String(context.formTitle ?? "A form application"),
};

export const formApplicationUnderReviewTemplate: EmailTemplateDefinition = {
  subject: (context) => `Application under review: ${String(context.formTitle ?? "a form")}`,
  bodyText: (context) => `Your application for ${String(context.formTitle ?? "a form")} is now under review.`,
  bodyHtml: (context) => `<p>Your application for <strong>${escapeHtml(String(context.formTitle ?? "a form"))}</strong> is now under review.</p>`,
};
export const formApplicationUnderReviewInAppTemplate: InAppTemplateDefinition = {
  title: () => "Application under review",
  message: (context) => String(context.formTitle ?? "Your application is under review"),
};

export const formApplicationDecidedTemplate: EmailTemplateDefinition = {
  subject: (context) => `Application decision: ${String(context.formTitle ?? "a form")}`,
  bodyText: (context) => `Your application for ${String(context.formTitle ?? "a form")} was ${String(context.status ?? "updated").toLowerCase()}. Log in to TNPArch for details.`,
  bodyHtml: (context) => `<p>Your application for <strong>${escapeHtml(String(context.formTitle ?? "a form"))}</strong> was <strong>${escapeHtml(String(context.status ?? "updated").toLowerCase())}</strong>.</p><p>Log in to TNPArch for details.</p>`,
};
export const formApplicationDecidedInAppTemplate: InAppTemplateDefinition = {
  title: (context) => `Application ${String(context.status ?? "updated").toLowerCase()}`,
  message: (context) => String(context.formTitle ?? "Your application was decided"),
};
