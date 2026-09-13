import { describe, expect, it, vi } from "vitest";
import type { AuthenticatedActor } from "../../../src/modules/auth";
import { InvalidFormDefinitionError } from "../../../src/modules/forms";
import { isFormAvailable, isValidFormStatusTransition } from "../../../src/modules/forms";
import { validateFieldDefinitions } from "../../../src/modules/forms/application/validation";
import { canReviewApplication } from "../../../src/modules/applications";
import { SubmitFormUseCase } from "../../../src/modules/applications/application/use-cases/submit-form";
import { SearchFormsUseCase } from "../../../src/modules/forms/application/use-cases/search-forms";
import { FakeAuditRecorder } from "../../support/fakes/fake-audit-recorder";
import { FakeNotificationService } from "../../support/fakes/fake-notification-service";

const secretary: AuthenticatedActor = { userId: "secretary-1", role: "SECRETARY" };
const student: AuthenticatedActor = { userId: "student-1", role: "STUDENT", studentProfileId: "profile-1" };
const coordinator: AuthenticatedActor = { userId: "coordinator-1", role: "COORDINATOR", batchScope: ["batch-1"], permissions: ["applications.review"] };

const form = {
  id: "form-1",
  title: "Council intake",
  description: null,
  status: "PUBLISHED" as const,
  deadline: null,
  committeeId: null,
  createdByUserId: secretary.userId,
  publishedAt: new Date(),
  closedAt: null,
  archivedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  fields: [{ id: "field-1", formId: "form-1", key: "motivation", label: "Motivation", type: "TEXT" as const, description: null, required: true, options: [], validation: null, displayOrder: 0 }],
};

describe("Phase 5 form rules", () => {
  it("keeps Core Committee-linked forms out of the student generic forms catalogue", async () => {
    const repository = { search: vi.fn().mockResolvedValue([form]) };
    const useCase = new SearchFormsUseCase({ formRepository: repository as never });

    await expect(useCase.execute({ actor: student, filters: {}, availableOnly: true })).resolves.toEqual([form]);
    expect(repository.search).toHaveBeenCalledWith({ excludeCoreCommitteeSelectionForms: true });
  });

  it("leaves generic form searches unchanged for administration", async () => {
    const repository = { search: vi.fn().mockResolvedValue([form]) };
    const useCase = new SearchFormsUseCase({ formRepository: repository as never });

    await useCase.execute({ actor: secretary, filters: { search: "Council" } });
    expect(repository.search).toHaveBeenCalledWith({ search: "Council" });
  });
  it("allows only the approved form lifecycle transitions", () => {
    expect(isValidFormStatusTransition("DRAFT", "PUBLISHED")).toBe(true);
    expect(isValidFormStatusTransition("PUBLISHED", "DRAFT")).toBe(false);
    expect(isValidFormAvailable()).toBe(false);
  });

  it("rejects unsupported conditional/file-style field definitions", () => {
    expect(() => validateFieldDefinitions([{ key: "motivation", label: "Motivation", type: "TEXT", required: true, displayOrder: 1 }])).toThrow(InvalidFormDefinitionError);
  });
});

function isValidFormAvailable(): boolean {
  return isFormAvailable({ status: "DRAFT", deadline: null });
}

describe("Phase 5 application access and submission", () => {
  it("requires an explicit reviewer assignment and coordinator batch scope", () => {
    expect(canReviewApplication(coordinator, [], "batch-1")).toBe(false);
    expect(canReviewApplication(coordinator, [{ id: "assignment-1", applicationId: "app-1", reviewerUserId: coordinator.userId, assignedByUserId: secretary.userId, assignedAt: new Date(), unassignedAt: null }], "batch-1")).toBe(true);
    expect(canReviewApplication(coordinator, [{ id: "assignment-1", applicationId: "app-1", reviewerUserId: coordinator.userId, assignedByUserId: secretary.userId, assignedAt: new Date(), unassignedAt: null }], "batch-2")).toBe(false);
  });

  it("submits a student application and records audit/notification events", async () => {
    const application = { id: "application-1", submissionId: "submission-1", formId: form.id, applicantUserId: student.userId, studentProfileId: student.studentProfileId!, currentStatus: "SUBMITTED" as const, decisionReason: null, decidedByUserId: null, decidedAt: null, submittedAt: new Date(), createdAt: new Date(), updatedAt: new Date() };
    const applicationRepository = {
      findByApplicantAndForm: vi.fn().mockResolvedValue(null),
      createSubmitted: vi.fn().mockResolvedValue(application),
    };
    const auditRecorder = new FakeAuditRecorder();
    const notificationService = new FakeNotificationService();
    const useCase = new SubmitFormUseCase({
      formRepository: { findById: vi.fn().mockResolvedValue(form), isCoreCommitteeSelectionForm: vi.fn().mockResolvedValue(false) } as never,
      applicationRepository: applicationRepository as never,
      applicantLookup: { findByUserId: vi.fn().mockResolvedValue({ studentProfileId: student.studentProfileId, userId: student.userId, batchId: "batch-1", fullName: "Student One" }) },
      secretaryRecipientLookup: { listActiveSecretaryUserIds: vi.fn().mockResolvedValue([secretary.userId]) },
      auditRecorder,
      notificationService,
    });

    await expect(useCase.execute({ actor: student, formId: form.id, answers: { motivation: "Because" } })).resolves.toEqual(application);
    expect(applicationRepository.createSubmitted).toHaveBeenCalledOnce();
    expect(auditRecorder.entries.map((entry) => entry.action)).toEqual(["FORM_APPLICATION_SUBMITTED"]);
    expect(notificationService.sent[0]?.template).toBe("FORM_SUBMITTED");
  });

  it("does not let the generic submission endpoint bypass the Core Committee flow", async () => {
    const applicationRepository = { findByApplicantAndForm: vi.fn(), createSubmitted: vi.fn() };
    const useCase = new SubmitFormUseCase({
      formRepository: { findById: vi.fn().mockResolvedValue(form), isCoreCommitteeSelectionForm: vi.fn().mockResolvedValue(true) } as never,
      applicationRepository: applicationRepository as never,
      applicantLookup: { findByUserId: vi.fn() },
      secretaryRecipientLookup: { listActiveSecretaryUserIds: vi.fn() },
      auditRecorder: new FakeAuditRecorder(),
      notificationService: new FakeNotificationService(),
    });

    await expect(useCase.execute({ actor: student, formId: form.id, answers: { motivation: "Because" } })).rejects.toThrow(
      "Core Committee applications must be submitted through the Core Committee application page",
    );
    expect(applicationRepository.createSubmitted).not.toHaveBeenCalled();
  });
});
