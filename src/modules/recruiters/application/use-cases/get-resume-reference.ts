import type { AuthenticatedActor } from "@/modules/auth";
import { canAccessRecruiterDirectory } from "@/modules/auth";
import { NotAuthorizedError } from "@/lib/errors";
import type { ResumeReference } from "../../domain/entities";
import { ApprovedProfileNotFoundError, ResumeNotAvailableError } from "../../domain/errors";
import type { RecruiterDirectoryRepository } from "../ports/recruiter-directory-repository";

export interface GetResumeReferenceInput {
  actor: AuthenticatedActor;
  studentId: string;
}

/**
 * "Recruiters may download ONLY the approved public resume. No access to
 * confidential documents." The repository implementation only ever reads
 * StudentPublicProfile.resumeFileId and requires FileAsset.classification
 * === "PUBLIC" — there is no code path here that can reach a
 * StudentPrivateProfile.confidentialDocuments entry.
 */
export class GetResumeReferenceUseCase {
  constructor(private readonly deps: { directoryRepository: RecruiterDirectoryRepository }) {}

  async execute(input: GetResumeReferenceInput): Promise<ResumeReference> {
    if (!canAccessRecruiterDirectory(input.actor)) {
      throw new NotAuthorizedError("Not authorized to download this resume");
    }

    const profile = await this.deps.directoryRepository.findByStudentId(input.studentId);
    if (!profile) {
      throw new ApprovedProfileNotFoundError();
    }

    const reference = await this.deps.directoryRepository.getResumeReference(input.studentId);
    if (!reference) {
      throw new ResumeNotAvailableError();
    }

    return reference;
  }
}
