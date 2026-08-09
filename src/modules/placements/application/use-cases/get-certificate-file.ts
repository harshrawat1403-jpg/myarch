import type { AuthenticatedActor } from "@/modules/auth";
import { canManageApplication } from "@/modules/auth";
import { NotAuthorizedError } from "@/lib/errors";
import type { ApplicationRepository } from "../ports/application-repository";
import type { InternshipOutcomeRepository } from "../ports/internship-outcome-repository";
import type { CertificateFileRepository, CertificateFileRecord } from "../ports/certificate-file-repository";
import type { StudentEligibilityLookup } from "../ports/student-eligibility-lookup";
import { ApplicationNotFoundError, InternshipOutcomeNotFoundError } from "../../domain/errors";

export interface GetCertificateFileInput {
  actor: AuthenticatedActor;
  applicationId: string;
}

/** V4.0 D4 — authenticated certificate download: Secretary/Coordinator(scoped) or the owning Student. Never served through the public /api/files/[fileId] route (classification PRIVATE). */
export class GetCertificateFileUseCase {
  constructor(
    private readonly deps: {
      applicationRepository: ApplicationRepository;
      internshipOutcomeRepository: InternshipOutcomeRepository;
      certificateFileRepository: CertificateFileRepository;
      studentEligibilityLookup: StudentEligibilityLookup;
    },
  ) {}

  async execute(input: GetCertificateFileInput): Promise<CertificateFileRecord> {
    const application = await this.deps.applicationRepository.findById(input.applicationId);
    if (!application) throw new ApplicationNotFoundError();

    if (input.actor.role === "STUDENT") {
      if (application.studentProfileId !== input.actor.studentProfileId) {
        throw new NotAuthorizedError("Not authorized to download this certificate");
      }
    } else {
      const student = await this.deps.studentEligibilityLookup.findByStudentProfileId(application.studentProfileId);
      if (!student || !canManageApplication(input.actor, student.batchId)) {
        throw new NotAuthorizedError("Not authorized to download this certificate");
      }
    }

    const outcome = await this.deps.internshipOutcomeRepository.findByApplicationId(input.applicationId);
    if (!outcome?.certificateFileId) throw new InternshipOutcomeNotFoundError();

    const file = await this.deps.certificateFileRepository.findById(outcome.certificateFileId);
    if (!file) throw new InternshipOutcomeNotFoundError();
    return file;
  }
}
