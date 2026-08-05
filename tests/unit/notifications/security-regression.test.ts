/**
 * Privacy regression, notifications edition. There is no ORM row to
 * "poison" here the way exports/recruiters DTOs do — DefaultNotificationService
 * never reads StudentPrivateProfile or any admin-only table; its only
 * inputs are whatever NotificationRequest.context the calling use case
 * supplies, and PrismaNotificationRecipientLookup selects nothing but
 * User.email. So the regression that matters is: (1) the persisted payload
 * is exactly the context the caller passed — nothing added, nothing
 * silently enriched from elsewhere — and (2) the actual profiles use cases
 * (application/use-cases/approve-draft.ts,
 * application/use-cases/request-changes.ts) only ever forward
 * studentName/reviewComment, never private-profile-shaped fields, on every
 * notify() call they make.
 */
import { describe, expect, it } from "vitest";
import { DefaultNotificationService } from "../../../src/modules/notifications/application/default-notification-service";
import { DefaultJobDispatcher } from "../../../src/modules/jobs/application/default-job-dispatcher";
import { InMemoryJobRepository } from "../../support/fakes/in-memory-job-repository";
import { InMemoryNotificationRepository } from "../../support/fakes/in-memory-notification-repository";
import { ApproveDraftUseCase } from "../../../src/modules/profiles/application/use-cases/approve-draft";
import { RequestChangesUseCase } from "../../../src/modules/profiles/application/use-cases/request-changes";
import { InMemoryProfileDraftRepository } from "../../support/fakes/in-memory-profile-draft-repository";
import { InMemoryPublishedProfileRepository } from "../../support/fakes/in-memory-published-profile-repository";
import { InMemoryProfilesStudentLookup } from "../../support/fakes/in-memory-profiles-student-lookup";
import { FakeAuditRecorder } from "../../support/fakes/fake-audit-recorder";
import { FakeNotificationService } from "../../support/fakes/fake-notification-service";
import type { AuthenticatedActor } from "../../../src/modules/auth";

const FORBIDDEN_KEYS = [
  "cgpa",
  "hasActiveBacklog",
  "backlogDetails",
  "phone",
  "personalEmail",
  "internalRemarks",
  "confidentialDocuments",
  "passwordHash",
];

describe("DefaultNotificationService — persists exactly the given payload, never enriches it", () => {
  it("stores the context verbatim on both the Notification row and the enqueued job, with no additional keys attached", async () => {
    const notificationRepository = new InMemoryNotificationRepository();
    const jobRepository = new InMemoryJobRepository();
    const service = new DefaultNotificationService({
      jobDispatcher: new DefaultJobDispatcher({ jobRepository }),
      notificationRepository,
    });

    const context = { studentName: "Alice Architect" };
    await service.notify({ recipientUserId: "user-1", template: "PROFILE_APPROVED", context });

    expect(notificationRepository.records[0]!.payload).toEqual(context);
    expect(Object.keys(notificationRepository.records[0]!.payload)).toEqual(Object.keys(context));

    const jobContext = jobRepository.jobs[0]!.payload.context as Record<string, unknown>;
    expect(jobContext).toEqual(context);
    expect(Object.keys(jobContext)).toEqual(Object.keys(context));
  });
});

describe("Profile approval/review notifications — never include private-profile fields", () => {
  const STUDENT_ID = "student-1";
  const secretary: AuthenticatedActor = { userId: "sec-1", role: "SECRETARY" };

  function buildContext() {
    const draftRepository = new InMemoryProfileDraftRepository();
    const publishedProfileRepository = new InMemoryPublishedProfileRepository();
    const studentLookup = new InMemoryProfilesStudentLookup();
    const auditRecorder = new FakeAuditRecorder();
    const notificationService = new FakeNotificationService();
    studentLookup.seed({ id: STUDENT_ID, batchId: "batch-a", userId: "user-1", fullName: "Alice Architect" });

    return {
      approveDraft: new ApproveDraftUseCase({
        profileDraftRepository: draftRepository,
        publishedProfileRepository,
        studentLookup,
        auditRecorder,
        notificationService,
      }),
      requestChanges: new RequestChangesUseCase({
        profileDraftRepository: draftRepository,
        studentLookup,
        auditRecorder,
        notificationService,
      }),
      draftRepository,
      notificationService,
    };
  }

  it("ApproveDraftUseCase's notification context contains only studentName", async () => {
    const ctx = buildContext();
    const draft = await ctx.draftRepository.create(STUDENT_ID);
    await ctx.draftRepository.updateContent(draft.id, { bio: "x" }, "PENDING_REVIEW");

    await ctx.approveDraft.execute({ actor: secretary, studentId: STUDENT_ID });

    const [sent] = ctx.notificationService.sent;
    expect(Object.keys(sent!.context).sort()).toEqual(["studentName"]);
    const serialized = JSON.stringify(sent!.context);
    for (const forbidden of FORBIDDEN_KEYS) {
      expect(serialized).not.toContain(forbidden);
    }
  });

  it("RequestChangesUseCase's notification context contains only studentName and reviewComment", async () => {
    const ctx = buildContext();
    const draft = await ctx.draftRepository.create(STUDENT_ID);
    await ctx.draftRepository.updateContent(draft.id, { bio: "x" }, "PENDING_REVIEW");

    await ctx.requestChanges.execute({ actor: secretary, studentId: STUDENT_ID, reviewComment: "Add a link" });

    const [sent] = ctx.notificationService.sent;
    expect(Object.keys(sent!.context).sort()).toEqual(["reviewComment", "studentName"]);
    const serialized = JSON.stringify(sent!.context);
    for (const forbidden of FORBIDDEN_KEYS) {
      expect(serialized).not.toContain(forbidden);
    }
  });
});
