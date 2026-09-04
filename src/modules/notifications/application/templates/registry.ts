import type { NotificationChannel, NotificationTemplateId } from "../../domain/entities";
import type { EmailTemplateDefinition, InAppTemplateDefinition } from "./types";
import { profileApprovedTemplate, profileApprovedInAppTemplate } from "./definitions/profile-approved";
import { profileChangesRequestedTemplate, profileChangesRequestedInAppTemplate } from "./definitions/profile-changes-requested";
import { accountCredentialsIssuedTemplate, accountCredentialsIssuedInAppTemplate } from "./definitions/account-credentials-issued";
import {
  interestFacilitationRequiredTemplate,
  interestFacilitationRequiredInAppTemplate,
} from "./definitions/interest-facilitation-required";
import { registrationSubmittedTemplate, registrationSubmittedInAppTemplate } from "./definitions/registration-submitted";
import { registrationReviewedTemplate, registrationReviewedInAppTemplate } from "./definitions/registration-reviewed";
import { registrationDecidedTemplate, registrationDecidedInAppTemplate } from "./definitions/registration-decided";
import {
  recruiterInterestReceivedTemplate,
  recruiterInterestReceivedInAppTemplate,
} from "./definitions/recruiter-interest-received";
import {
  recruiterInterestRespondedTemplate,
  recruiterInterestRespondedInAppTemplate,
} from "./definitions/recruiter-interest-responded";
import { placementDriveAnnouncedTemplate, placementDriveAnnouncedInAppTemplate } from "./definitions/placement-drive-announced";
import { applicationStatusChangedTemplate, applicationStatusChangedInAppTemplate } from "./definitions/application-status-changed";
import { emailVerificationTemplate, emailVerificationInAppTemplate } from "./definitions/email-verification";
import { passwordResetRequestedTemplate, passwordResetRequestedInAppTemplate } from "./definitions/password-reset-requested";
import {
  accountSignupPendingReviewTemplate,
  accountSignupPendingReviewInAppTemplate,
} from "./definitions/account-signup-pending-review";
import { accountSignupDecidedTemplate, accountSignupDecidedInAppTemplate } from "./definitions/account-signup-decided";
import { taskAssignedTemplate, taskAssignedInAppTemplate } from "./definitions/task-assigned";
import { taskReassignedTemplate, taskReassignedInAppTemplate } from "./definitions/task-reassigned";
import {
  taskDeadlineApproachingTemplate,
  taskDeadlineApproachingInAppTemplate,
} from "./definitions/task-deadline-approaching";
import { taskOverdueTemplate, taskOverdueInAppTemplate } from "./definitions/task-overdue";
import { taskCompletedTemplate, taskCompletedInAppTemplate } from "./definitions/task-completed";
import { taskEscalatedTemplate, taskEscalatedInAppTemplate } from "./definitions/task-escalated";
import {
  maintenanceIssueSubmittedTemplate,
  maintenanceIssueSubmittedInAppTemplate,
} from "./definitions/maintenance-issue-submitted";
import {
  maintenanceIssueResolvedTemplate,
  maintenanceIssueResolvedInAppTemplate,
} from "./definitions/maintenance-issue-resolved";
import { requestSubmittedTemplate, requestSubmittedInAppTemplate } from "./definitions/request-submitted";
import { requestDecidedTemplate, requestDecidedInAppTemplate } from "./definitions/request-decided";
import { announcementPublishedTemplate, announcementPublishedInAppTemplate } from "./definitions/announcement-published";
import { committeeMemberAddedTemplate, committeeMemberAddedInAppTemplate } from "./definitions/committee-member-added";
import {
  formApplicationDecidedInAppTemplate,
  formApplicationDecidedTemplate,
  formApplicationReviewerAssignedInAppTemplate,
  formApplicationReviewerAssignedTemplate,
  formApplicationUnderReviewInAppTemplate,
  formApplicationUnderReviewTemplate,
  formSubmittedInAppTemplate,
  formSubmittedTemplate,
} from "./definitions/form-application";

/**
 * Every known template, keyed by the id business use cases pass to
 * NotificationService.notify(). Adding a template is purely additive: a new
 * definition file plus one new entry here.
 *
 * V4.0 E2 note: §12 names ten new templates. Seven are wired in here and
 * into their real use-case call sites this milestone. Three are
 * deliberately NOT added yet, each for a structural reason rather than an
 * oversight:
 *   - DEADLINE_REMINDER needs a genuinely new scheduled-reminder subsystem
 *     (compute a reminder time from PlacementDrive.applicationDeadline,
 *     dispatch a delayed job via JobDispatcher's existing `scheduledFor`
 *     support, then resolve "who hasn't applied yet and is eligible" at
 *     fire-time) — a real feature in its own right, not a one-line notify()
 *     call into an existing use case like the other seven.
 *   - PUBLICATION_PUBLISHED has no real call site yet — Publication Studio
 *     (E3-E5) hasn't been built. Wiring happens there, when
 *     PublishPublicationUseCase exists.
 *
 * MYARCH Phase 3 (§4.5) update: the ANNOUNCEMENT_POSTED deferral above no
 * longer applies — Announcements is now a real, roadmap-authorized feature.
 * See ANNOUNCEMENT_PUBLISHED below, wired from
 * announcements/application/use-cases/create-announcement.ts.
 */
export const EMAIL_TEMPLATE_REGISTRY: Record<NotificationTemplateId, EmailTemplateDefinition> = {
  PROFILE_APPROVED: profileApprovedTemplate,
  PROFILE_CHANGES_REQUESTED: profileChangesRequestedTemplate,
  ACCOUNT_CREDENTIALS_ISSUED: accountCredentialsIssuedTemplate,
  INTEREST_FACILITATION_REQUIRED: interestFacilitationRequiredTemplate,
  REGISTRATION_SUBMITTED: registrationSubmittedTemplate,
  REGISTRATION_REVIEWED: registrationReviewedTemplate,
  REGISTRATION_DECIDED: registrationDecidedTemplate,
  RECRUITER_INTEREST_RECEIVED: recruiterInterestReceivedTemplate,
  RECRUITER_INTEREST_RESPONDED: recruiterInterestRespondedTemplate,
  PLACEMENT_DRIVE_ANNOUNCED: placementDriveAnnouncedTemplate,
  APPLICATION_STATUS_CHANGED: applicationStatusChangedTemplate,
  EMAIL_VERIFICATION: emailVerificationTemplate,
  PASSWORD_RESET_REQUESTED: passwordResetRequestedTemplate,
  ACCOUNT_SIGNUP_PENDING_REVIEW: accountSignupPendingReviewTemplate,
  ACCOUNT_SIGNUP_DECIDED: accountSignupDecidedTemplate,
  TASK_ASSIGNED: taskAssignedTemplate,
  TASK_REASSIGNED: taskReassignedTemplate,
  TASK_DEADLINE_APPROACHING: taskDeadlineApproachingTemplate,
  TASK_OVERDUE: taskOverdueTemplate,
  TASK_COMPLETED: taskCompletedTemplate,
  TASK_ESCALATED: taskEscalatedTemplate,
  MAINTENANCE_ISSUE_SUBMITTED: maintenanceIssueSubmittedTemplate,
  MAINTENANCE_ISSUE_RESOLVED: maintenanceIssueResolvedTemplate,
  REQUEST_SUBMITTED: requestSubmittedTemplate,
  REQUEST_DECIDED: requestDecidedTemplate,
  ANNOUNCEMENT_PUBLISHED: announcementPublishedTemplate,
  COMMITTEE_MEMBER_ADDED: committeeMemberAddedTemplate,
  FORM_SUBMITTED: formSubmittedTemplate,
  FORM_APPLICATION_REVIEWER_ASSIGNED: formApplicationReviewerAssignedTemplate,
  FORM_APPLICATION_UNDER_REVIEW: formApplicationUnderReviewTemplate,
  FORM_APPLICATION_DECIDED: formApplicationDecidedTemplate,
};

/** V4.0 E1 — the IN_APP counterpart to EMAIL_TEMPLATE_REGISTRY. */
export const IN_APP_TEMPLATE_REGISTRY: Record<NotificationTemplateId, InAppTemplateDefinition> = {
  PROFILE_APPROVED: profileApprovedInAppTemplate,
  PROFILE_CHANGES_REQUESTED: profileChangesRequestedInAppTemplate,
  ACCOUNT_CREDENTIALS_ISSUED: accountCredentialsIssuedInAppTemplate,
  INTEREST_FACILITATION_REQUIRED: interestFacilitationRequiredInAppTemplate,
  REGISTRATION_SUBMITTED: registrationSubmittedInAppTemplate,
  REGISTRATION_REVIEWED: registrationReviewedInAppTemplate,
  REGISTRATION_DECIDED: registrationDecidedInAppTemplate,
  RECRUITER_INTEREST_RECEIVED: recruiterInterestReceivedInAppTemplate,
  RECRUITER_INTEREST_RESPONDED: recruiterInterestRespondedInAppTemplate,
  PLACEMENT_DRIVE_ANNOUNCED: placementDriveAnnouncedInAppTemplate,
  APPLICATION_STATUS_CHANGED: applicationStatusChangedInAppTemplate,
  EMAIL_VERIFICATION: emailVerificationInAppTemplate,
  PASSWORD_RESET_REQUESTED: passwordResetRequestedInAppTemplate,
  ACCOUNT_SIGNUP_PENDING_REVIEW: accountSignupPendingReviewInAppTemplate,
  ACCOUNT_SIGNUP_DECIDED: accountSignupDecidedInAppTemplate,
  TASK_ASSIGNED: taskAssignedInAppTemplate,
  TASK_REASSIGNED: taskReassignedInAppTemplate,
  TASK_DEADLINE_APPROACHING: taskDeadlineApproachingInAppTemplate,
  TASK_OVERDUE: taskOverdueInAppTemplate,
  TASK_COMPLETED: taskCompletedInAppTemplate,
  TASK_ESCALATED: taskEscalatedInAppTemplate,
  MAINTENANCE_ISSUE_SUBMITTED: maintenanceIssueSubmittedInAppTemplate,
  MAINTENANCE_ISSUE_RESOLVED: maintenanceIssueResolvedInAppTemplate,
  REQUEST_SUBMITTED: requestSubmittedInAppTemplate,
  REQUEST_DECIDED: requestDecidedInAppTemplate,
  ANNOUNCEMENT_PUBLISHED: announcementPublishedInAppTemplate,
  COMMITTEE_MEMBER_ADDED: committeeMemberAddedInAppTemplate,
  FORM_SUBMITTED: formSubmittedInAppTemplate,
  FORM_APPLICATION_REVIEWER_ASSIGNED: formApplicationReviewerAssignedInAppTemplate,
  FORM_APPLICATION_UNDER_REVIEW: formApplicationUnderReviewInAppTemplate,
  FORM_APPLICATION_DECIDED: formApplicationDecidedInAppTemplate,
};

/**
 * V4.0 E1/§12 — "Delivery stays dual-channel per template (email for
 * anything time-sensitive/off-platform-relevant like deadlines and
 * decisions; in-app for everything, since the bell is now real)." Each of
 * the four templates that predate E1 already sent EMAIL; this makes the
 * bell real for them too rather than only for templates E2 adds. New
 * templates (E2) declare their own channel list here — nothing else
 * (DefaultNotificationService, the job handler) needs to change per
 * template, only this map and a new definition file.
 *
 * E2's seven new templates follow §12's own two named examples literally:
 * only REGISTRATION_DECIDED is a "decision" in that sense, so it's the one
 * new template that's dual-channel; the rest are staff-to-staff or routine
 * updates and stay IN_APP-only, keeping email volume down for
 * higher-frequency events (a busy intake season could mean many
 * REGISTRATION_SUBMITTED notifications, for example).
 */
export const NOTIFICATION_CHANNELS: Record<NotificationTemplateId, readonly NotificationChannel[]> = {
  PROFILE_APPROVED: ["EMAIL", "IN_APP"],
  PROFILE_CHANGES_REQUESTED: ["EMAIL", "IN_APP"],
  ACCOUNT_CREDENTIALS_ISSUED: ["EMAIL", "IN_APP"],
  INTEREST_FACILITATION_REQUIRED: ["EMAIL", "IN_APP"],
  REGISTRATION_SUBMITTED: ["IN_APP"],
  REGISTRATION_REVIEWED: ["IN_APP"],
  REGISTRATION_DECIDED: ["EMAIL", "IN_APP"],
  RECRUITER_INTEREST_RECEIVED: ["IN_APP"],
  RECRUITER_INTEREST_RESPONDED: ["IN_APP"],
  PLACEMENT_DRIVE_ANNOUNCED: ["IN_APP"],
  APPLICATION_STATUS_CHANGED: ["IN_APP"],
  // Never actually dispatched through this map — both are sent directly via
  // sendDirectEmail + renderEmailTemplate, bypassing notify() entirely (see
  // each definition's own doc comment). Listed as EMAIL for accuracy, not
  // because DefaultNotificationService ever consults this entry for them.
  EMAIL_VERIFICATION: ["EMAIL"],
  PASSWORD_RESET_REQUESTED: ["EMAIL"],
  ACCOUNT_SIGNUP_PENDING_REVIEW: ["IN_APP"],
  ACCOUNT_SIGNUP_DECIDED: ["EMAIL", "IN_APP"],
  // MYARCH Phase 2 (§3.8) — deadline/overdue/escalation are time-sensitive
  // (dual-channel, matching this file's own "email for anything time-
  // sensitive" rule above); assignment/reassignment/completion are routine,
  // IN_APP-only, matching REGISTRATION_SUBMITTED's precedent.
  TASK_ASSIGNED: ["IN_APP"],
  TASK_REASSIGNED: ["IN_APP"],
  TASK_DEADLINE_APPROACHING: ["EMAIL", "IN_APP"],
  TASK_OVERDUE: ["EMAIL", "IN_APP"],
  TASK_COMPLETED: ["IN_APP"],
  TASK_ESCALATED: ["EMAIL", "IN_APP"],
  // MYARCH Phase 2 (§3.1–§3.7) — resolution/decision are time-sensitive
  // (dual-channel); submission is routine, IN_APP-only.
  MAINTENANCE_ISSUE_SUBMITTED: ["IN_APP"],
  MAINTENANCE_ISSUE_RESOLVED: ["EMAIL", "IN_APP"],
  REQUEST_SUBMITTED: ["IN_APP"],
  REQUEST_DECIDED: ["EMAIL", "IN_APP"],
  // MYARCH Phase 3 (§4.5) — an announcement is department-wide news, worth
  // an email (potentially high fan-out, but infrequent — nothing like
  // TASK_ASSIGNED's per-task volume).
  ANNOUNCEMENT_PUBLISHED: ["EMAIL", "IN_APP"],
  // MYARCH Phase 4 (§5) — routine, per-person update; IN_APP-only, matching
  // this file's own "routine staff-to-staff/individual updates stay
  // IN_APP-only" rule (e.g. TASK_ASSIGNED, MAINTENANCE_ISSUE_SUBMITTED).
  COMMITTEE_MEMBER_ADDED: ["IN_APP"],
  FORM_SUBMITTED: ["IN_APP"],
  FORM_APPLICATION_REVIEWER_ASSIGNED: ["IN_APP"],
  FORM_APPLICATION_UNDER_REVIEW: ["IN_APP"],
  FORM_APPLICATION_DECIDED: ["EMAIL", "IN_APP"],
};
