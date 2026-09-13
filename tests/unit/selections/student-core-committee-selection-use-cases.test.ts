import { describe, expect, it, vi } from "vitest";
import { NotAuthorizedError } from "../../../src/lib/errors";
import { CoreCommitteeSelectionError } from "../../../src/modules/selections";
import { StudentCoreCommitteeSelectionUseCases } from "../../../src/modules/selections/application/student-core-committee-selection-use-cases";
import type { CoreCommitteeSelectionRepository } from "../../../src/modules/selections/application/ports/core-committee-selection-repository";

const student = { userId: "student-1", role: "STUDENT" as const, studentProfileId: "profile-1" };
const secretary = { userId: "secretary-1", role: "SECRETARY" as const };
const detail = {
  id: "selection-1",
  title: "Core Committee 2026",
  brief: "Help shape the department.\nBring your ideas.",
  status: "APPLICATION_OPEN" as const,
  applicationOpenAt: new Date(Date.now() - 60_000),
  applicationCloseAt: new Date(Date.now() + 60_000),
  positions: [{ id: "domain-1", title: "Technical", description: "Long domain brief", seats: 2, displayOrder: 0 }],
  fields: [{ id: "field-1", key: "motivation", label: "Motivation", type: "LONG_TEXT" as const, description: null, required: true, options: [], validation: null, displayOrder: 0 }],
  application: null,
};

function setup() {
  const repository = {
    listForStudent: vi.fn().mockResolvedValue([detail]),
    getForStudent: vi.fn().mockResolvedValue(detail),
    getStudentApplicationFormId: vi.fn().mockResolvedValue("managed-form-id"),
  };
  const submitter = { execute: vi.fn().mockResolvedValue({ id: "application-1" }) };
  return {
    repository,
    submitter,
    useCases: new StudentCoreCommitteeSelectionUseCases(
      repository as unknown as CoreCommitteeSelectionRepository,
      submitter as never,
    ),
  };
}

describe("student Core Committee applications", () => {
  it("lists and projects only the student's own Core application data", async () => {
    const { useCases, repository } = setup();
    await expect(useCases.list(student)).resolves.toEqual([detail]);
    expect(repository.listForStudent).toHaveBeenCalledWith(student.userId);
    await expect(useCases.get(student, detail.id)).resolves.toEqual(detail);
  });

  it("derives the managed form server-side and submits exactly one selected domain", async () => {
    const { useCases, repository, submitter } = setup();
    await useCases.submit({ actor: student, selectionId: detail.id, positionId: "domain-1", answers: { motivation: "I can help" } });

    expect(repository.getStudentApplicationFormId).toHaveBeenCalledWith(detail.id);
    expect(submitter.execute).toHaveBeenCalledWith({
      actor: student,
      formId: "managed-form-id",
      answers: { motivation: "I can help" },
      coreCommitteeSelectionPositionIds: ["domain-1"],
      allowCoreCommitteeSelectionForm: true,
    });
  });

  it("does not expose a submission path when the selection has no linked application form", async () => {
    const { useCases, repository, submitter } = setup();
    repository.getStudentApplicationFormId.mockResolvedValue(null);
    await expect(useCases.submit({ actor: student, selectionId: detail.id, positionId: "domain-1", answers: {} })).rejects.toBeInstanceOf(CoreCommitteeSelectionError);
    expect(submitter.execute).not.toHaveBeenCalled();
  });

  it("requires an authenticated student", async () => {
    const { useCases } = setup();
    await expect(useCases.list(secretary)).rejects.toBeInstanceOf(NotAuthorizedError);
    await expect(useCases.submit({ actor: secretary, selectionId: detail.id, positionId: "domain-1", answers: {} })).rejects.toBeInstanceOf(NotAuthorizedError);
  });
});
