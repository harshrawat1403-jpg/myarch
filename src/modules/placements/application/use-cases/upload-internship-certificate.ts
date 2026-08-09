import type { AuthenticatedActor } from "@/modules/auth";
import { canManageApplication } from "@/modules/auth";
import { NotAuthorizedError } from "@/lib/errors";
import type { InternshipOutcomeRecord } from "../../domain/entities";
import type { ApplicationRepository } from "../ports/application-repository";
import type { InternshipOutcomeRepository } from "../ports/internship-outcome-repository";
import type { CertificateFileRepository } from "../ports/certificate-file-repository";
import type { StudentEligibilityLookup } from "../ports/student-eligibility-lookup";
import {
  ApplicationNotFoundError,
  InternshipOutcomeNotFoundError,
  InvalidCertificateFileError,
} from "../../domain/errors";

const ALLOWED_MIME_TYPES: Record<string, string> = {
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/png": "png",
};

const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

export interface UploadInternshipCertificateInput {
  actor: AuthenticatedActor;
  applicationId: string;
  data: Buffer;
  mimeType: string;
  sizeBytes: number;
}

/** V4.0 D4 — Secretary/Coordinator(scoped) uploads (or replaces) the completion certificate. Mirrors auth's UploadAvatarUseCase: old file is deleted only after the new one is safely stored and referenced. */
export class UploadInternshipCertificateUseCase {
  constructor(
    private readonly deps: {
      applicationRepository: ApplicationRepository;
      internshipOutcomeRepository: InternshipOutcomeRepository;
      certificateFileRepository: CertificateFileRepository;
      studentEligibilityLookup: StudentEligibilityLookup;
      saveFile(storageKey: string, data: Buffer): Promise<void>;
      deleteFile(storageKey: string): Promise<void>;
    },
  ) {}

  async execute(input: UploadInternshipCertificateInput): Promise<InternshipOutcomeRecord> {
    const extension = ALLOWED_MIME_TYPES[input.mimeType];
    if (!extension) {
      throw new InvalidCertificateFileError("Only PDF, JPEG, or PNG files are allowed");
    }
    if (input.sizeBytes > MAX_SIZE_BYTES) {
      throw new InvalidCertificateFileError("File must be 5MB or smaller");
    }

    const application = await this.deps.applicationRepository.findById(input.applicationId);
    if (!application) throw new ApplicationNotFoundError();

    const student = await this.deps.studentEligibilityLookup.findByStudentProfileId(application.studentProfileId);
    if (!student || !canManageApplication(input.actor, student.batchId)) {
      throw new NotAuthorizedError("Not authorized to upload a certificate for this application");
    }

    const outcome = await this.deps.internshipOutcomeRepository.findByApplicationId(input.applicationId);
    if (!outcome) throw new InternshipOutcomeNotFoundError();

    const storageKey = `internship-certificates/${input.applicationId}-${Date.now()}.${extension}`;
    await this.deps.saveFile(storageKey, input.data);

    const created = await this.deps.certificateFileRepository.create({
      ownerUserId: input.actor.userId,
      storageKey,
      mimeType: input.mimeType,
      sizeBytes: input.sizeBytes,
    });

    const updated = await this.deps.internshipOutcomeRepository.setCertificateFileId(input.applicationId, created.id);

    if (outcome.certificateFileId) {
      const previous = await this.deps.certificateFileRepository.findById(outcome.certificateFileId);
      await this.deps.certificateFileRepository.delete(outcome.certificateFileId);
      if (previous) {
        await this.deps.deleteFile(previous.storageKey).catch(() => {
          // Best-effort disk cleanup — an orphaned file on disk is a minor
          // leak, never worth failing an otherwise-successful upload over.
        });
      }
    }

    return updated;
  }
}
