import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AuthenticatedActor } from "../../../src/modules/auth";
import { UploadInternshipCertificateUseCase } from "../../../src/modules/placements/application/use-cases/upload-internship-certificate";
import { GetCertificateFileUseCase } from "../../../src/modules/placements/application/use-cases/get-certificate-file";
import {
  ApplicationNotFoundError,
  InternshipOutcomeNotFoundError,
  InvalidCertificateFileError,
} from "../../../src/modules/placements/domain/errors";
import { NotAuthorizedError } from "../../../src/lib/errors";
import { InMemoryApplicationRepository } from "../../support/fakes/in-memory-application-repository";
import { InMemoryInternshipOutcomeRepository } from "../../support/fakes/in-memory-internship-outcome-repository";
import { InMemoryCertificateFileRepository } from "../../support/fakes/in-memory-certificate-file-repository";
import { FakeStudentEligibilityLookup } from "../../support/fakes/fake-student-eligibility-lookup";

const owner: AuthenticatedActor = { userId: "stu-1", role: "STUDENT", studentProfileId: "s1" };
const otherStudent: AuthenticatedActor = { userId: "stu-2", role: "STUDENT", studentProfileId: "s2" };
const secretary: AuthenticatedActor = { userId: "sec-1", role: "SECRETARY" };
const unscopedCoordinator: AuthenticatedActor = { userId: "coord-2", role: "COORDINATOR", batchScope: ["batch-z"] };

describe("UploadInternshipCertificateUseCase / GetCertificateFileUseCase", () => {
  let applicationRepository: InMemoryApplicationRepository;
  let internshipOutcomeRepository: InMemoryInternshipOutcomeRepository;
  let certificateFileRepository: InMemoryCertificateFileRepository;
  let studentEligibilityLookup: FakeStudentEligibilityLookup;
  let saveFile: ReturnType<typeof vi.fn>;
  let deleteFile: ReturnType<typeof vi.fn>;
  let uploadUseCase: UploadInternshipCertificateUseCase;
  let getUseCase: GetCertificateFileUseCase;
  let applicationId: string;

  beforeEach(async () => {
    applicationRepository = new InMemoryApplicationRepository();
    const application = await applicationRepository.create("s1", "drive-a");
    applicationId = application.id;
    internshipOutcomeRepository = new InMemoryInternshipOutcomeRepository();
    await internshipOutcomeRepository.create(applicationId);
    certificateFileRepository = new InMemoryCertificateFileRepository();
    studentEligibilityLookup = new FakeStudentEligibilityLookup();
    studentEligibilityLookup.seed("s1", {
      userId: "user-batch-a",
      batchId: "batch-a",
      batchName: "B.Arch 2026",
      fullName: "Test Student",
      cgpa: 8.0,
      hasActiveBacklog: false,
    });
    saveFile = vi.fn().mockResolvedValue(undefined);
    deleteFile = vi.fn().mockResolvedValue(undefined);
    uploadUseCase = new UploadInternshipCertificateUseCase({
      applicationRepository,
      internshipOutcomeRepository,
      certificateFileRepository,
      studentEligibilityLookup,
      saveFile,
      deleteFile,
    });
    getUseCase = new GetCertificateFileUseCase({
      applicationRepository,
      internshipOutcomeRepository,
      certificateFileRepository,
      studentEligibilityLookup,
    });
  });

  it("uploads a certificate for a Secretary and links it to the outcome", async () => {
    const outcome = await uploadUseCase.execute({
      actor: secretary,
      applicationId,
      data: Buffer.from("pdf bytes"),
      mimeType: "application/pdf",
      sizeBytes: 9,
    });
    expect(outcome.certificateFileId).not.toBeNull();
    expect(saveFile).toHaveBeenCalledTimes(1);
  });

  it("rejects a disallowed file type", async () => {
    await expect(
      uploadUseCase.execute({ actor: secretary, applicationId, data: Buffer.from("x"), mimeType: "text/plain", sizeBytes: 1 }),
    ).rejects.toBeInstanceOf(InvalidCertificateFileError);
  });

  it("rejects an oversized file", async () => {
    await expect(
      uploadUseCase.execute({
        actor: secretary,
        applicationId,
        data: Buffer.from("x"),
        mimeType: "application/pdf",
        sizeBytes: 10 * 1024 * 1024,
      }),
    ).rejects.toBeInstanceOf(InvalidCertificateFileError);
  });

  it("denies a Coordinator not scoped to the applicant's batch", async () => {
    await expect(
      uploadUseCase.execute({
        actor: unscopedCoordinator,
        applicationId,
        data: Buffer.from("x"),
        mimeType: "application/pdf",
        sizeBytes: 1,
      }),
    ).rejects.toBeInstanceOf(NotAuthorizedError);
  });

  it("replaces an existing certificate, deleting the old file", async () => {
    await uploadUseCase.execute({ actor: secretary, applicationId, data: Buffer.from("v1"), mimeType: "application/pdf", sizeBytes: 2 });
    await uploadUseCase.execute({ actor: secretary, applicationId, data: Buffer.from("v2"), mimeType: "application/pdf", sizeBytes: 2 });
    expect(saveFile).toHaveBeenCalledTimes(2);
    expect(deleteFile).toHaveBeenCalledTimes(1);
  });

  it("throws ApplicationNotFoundError for an unknown application", async () => {
    await expect(
      uploadUseCase.execute({ actor: secretary, applicationId: "unknown", data: Buffer.from("x"), mimeType: "application/pdf", sizeBytes: 1 }),
    ).rejects.toBeInstanceOf(ApplicationNotFoundError);
  });

  it("allows the owning Student to fetch the certificate file reference", async () => {
    await uploadUseCase.execute({ actor: secretary, applicationId, data: Buffer.from("x"), mimeType: "application/pdf", sizeBytes: 1 });
    const file = await getUseCase.execute({ actor: owner, applicationId });
    expect(file.mimeType).toBe("application/pdf");
  });

  it("denies another Student fetching the certificate", async () => {
    await uploadUseCase.execute({ actor: secretary, applicationId, data: Buffer.from("x"), mimeType: "application/pdf", sizeBytes: 1 });
    await expect(getUseCase.execute({ actor: otherStudent, applicationId })).rejects.toBeInstanceOf(NotAuthorizedError);
  });

  it("throws InternshipOutcomeNotFoundError when no certificate has been uploaded yet", async () => {
    await expect(getUseCase.execute({ actor: owner, applicationId })).rejects.toBeInstanceOf(InternshipOutcomeNotFoundError);
  });
});
