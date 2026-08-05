import { beforeEach, describe, expect, it } from "vitest";
import type { AuthenticatedActor } from "../../../src/modules/auth";
import { AttachConfidentialDocumentUseCase } from "../../../src/modules/students/application/use-cases/attach-confidential-document";
import { ListConfidentialDocumentsUseCase } from "../../../src/modules/students/application/use-cases/list-confidential-documents";
import { RemoveConfidentialDocumentUseCase } from "../../../src/modules/students/application/use-cases/remove-confidential-document";
import { ConfidentialDocumentNotFoundError, StudentNotFoundError } from "../../../src/modules/students/domain/errors";
import { NotAuthorizedError } from "../../../src/lib/errors";
import { InMemoryStudentRepository } from "../../support/fakes/in-memory-student-repository";
import { InMemoryFileReferenceRepository } from "../../support/fakes/in-memory-file-reference-repository";

const secretary: AuthenticatedActor = { userId: "sec-1", role: "SECRETARY" };
const coordinatorA: AuthenticatedActor = { userId: "coord-1", role: "COORDINATOR", batchScope: ["batch-a"] };
const coordinatorB: AuthenticatedActor = { userId: "coord-2", role: "COORDINATOR", batchScope: ["batch-b"] };
const recruiter: AuthenticatedActor = { userId: "rec-1", role: "RECRUITER" };

describe("Confidential document reference use cases", () => {
  let studentRepository: InMemoryStudentRepository;
  let fileReferenceRepository: InMemoryFileReferenceRepository;
  let attachUseCase: AttachConfidentialDocumentUseCase;
  let listUseCase: ListConfidentialDocumentsUseCase;
  let removeUseCase: RemoveConfidentialDocumentUseCase;
  let studentId: string;

  beforeEach(async () => {
    studentRepository = new InMemoryStudentRepository();
    fileReferenceRepository = new InMemoryFileReferenceRepository();
    attachUseCase = new AttachConfidentialDocumentUseCase({ studentRepository, fileReferenceRepository });
    listUseCase = new ListConfidentialDocumentsUseCase({ studentRepository, fileReferenceRepository });
    removeUseCase = new RemoveConfidentialDocumentUseCase({ studentRepository, fileReferenceRepository });

    const student = await studentRepository.create({
      userId: "user-1",
      batchId: "batch-a",
      rollNumber: "BA001",
      fullName: "Test Student",
      private: {},
      actorUserId: "sec-1",
    });
    studentId = student.id;
  });

  it("attaches a document reference (metadata only) for an in-scope Coordinator", async () => {
    const ref = await attachUseCase.execute({
      actor: coordinatorA,
      studentId,
      storageKey: "students/1/verification.pdf",
      mimeType: "application/pdf",
      sizeBytes: 12345,
    });
    expect(ref.storageKey).toBe("students/1/verification.pdf");
  });

  it("denies an out-of-scope Coordinator from attaching a document", async () => {
    await expect(
      attachUseCase.execute({
        actor: coordinatorB,
        studentId,
        storageKey: "x.pdf",
        mimeType: "application/pdf",
        sizeBytes: 100,
      }),
    ).rejects.toBeInstanceOf(NotAuthorizedError);
  });

  it("denies a Recruiter from attaching a document", async () => {
    await expect(
      attachUseCase.execute({
        actor: recruiter,
        studentId,
        storageKey: "x.pdf",
        mimeType: "application/pdf",
        sizeBytes: 100,
      }),
    ).rejects.toBeInstanceOf(NotAuthorizedError);
  });

  it("lists attached documents for the Secretary", async () => {
    await attachUseCase.execute({
      actor: secretary,
      studentId,
      storageKey: "a.pdf",
      mimeType: "application/pdf",
      sizeBytes: 1,
    });
    const docs = await listUseCase.execute({ actor: secretary, studentId });
    expect(docs).toHaveLength(1);
  });

  it("denies a Recruiter from listing documents (never accesses private data)", async () => {
    await expect(listUseCase.execute({ actor: recruiter, studentId })).rejects.toBeInstanceOf(
      NotAuthorizedError,
    );
  });

  it("removes a document reference", async () => {
    const ref = await attachUseCase.execute({
      actor: secretary,
      studentId,
      storageKey: "a.pdf",
      mimeType: "application/pdf",
      sizeBytes: 1,
    });

    await removeUseCase.execute({ actor: secretary, studentId, fileId: ref.id });
    const docs = await listUseCase.execute({ actor: secretary, studentId });
    expect(docs).toHaveLength(0);
  });

  it("throws ConfidentialDocumentNotFoundError removing an unknown reference", async () => {
    await expect(
      removeUseCase.execute({ actor: secretary, studentId, fileId: "unknown-id" }),
    ).rejects.toBeInstanceOf(ConfidentialDocumentNotFoundError);
  });

  it("throws StudentNotFoundError for an unknown student", async () => {
    await expect(
      attachUseCase.execute({
        actor: secretary,
        studentId: "unknown",
        storageKey: "a.pdf",
        mimeType: "application/pdf",
        sizeBytes: 1,
      }),
    ).rejects.toBeInstanceOf(StudentNotFoundError);
  });
});
