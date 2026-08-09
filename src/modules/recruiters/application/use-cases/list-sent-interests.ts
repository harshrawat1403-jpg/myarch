import type { AuthenticatedActor } from "@/modules/auth";
import { canAccessRecruiterDirectory } from "@/modules/auth";
import { NotAuthorizedError } from "@/lib/errors";
import type { RecruiterSentInterestDTO } from "../../domain/entities";
import type { RecruiterDirectoryRepository } from "../ports/recruiter-directory-repository";
import type { RecruiterInterestRepository } from "../ports/recruiter-interest-repository";
import type { RecruiterSelfLookup } from "../ports/recruiter-self-lookup";

/**
 * V4.0 C4 — /recruiter/interests, the recruiter's own view of interests
 * they've sent (§17: "active/accepted/completed"). A row whose student is
 * no longer visible in the directory (profile unpublished/archived since
 * the interest was sent) is omitted rather than shown with missing data —
 * the same "directory is the root of truth" contract every other recruiter
 * read path in this module already follows.
 */
export class ListSentInterestsUseCase {
  constructor(
    private readonly deps: {
      directoryRepository: RecruiterDirectoryRepository;
      interestRepository: RecruiterInterestRepository;
      recruiterSelfLookup: RecruiterSelfLookup;
    },
  ) {}

  async execute(actor: AuthenticatedActor): Promise<RecruiterSentInterestDTO[]> {
    if (!canAccessRecruiterDirectory(actor)) {
      throw new NotAuthorizedError("Not authorized to view sent interests");
    }

    const recruiter = await this.deps.recruiterSelfLookup.findByUserId(actor.userId);
    if (!recruiter) return [];

    const interests = await this.deps.interestRepository.listForRecruiter(recruiter.id);
    if (interests.length === 0) return [];

    const studentIds = interests.map((i) => i.studentProfileId);
    const profiles = await this.deps.directoryRepository.findManyByIds(studentIds);
    const profileByStudentId = new Map(profiles.map((p) => [p.studentId, p]));

    const result: RecruiterSentInterestDTO[] = [];
    for (const interest of interests) {
      const profile = profileByStudentId.get(interest.studentProfileId);
      if (!profile) continue;
      result.push({
        id: interest.id,
        studentId: interest.studentProfileId,
        studentName: profile.fullName,
        batchName: profile.batchName,
        message: interest.message,
        status: interest.status,
        sentAt: interest.sentAt,
        respondedAt: interest.respondedAt,
      });
    }
    return result;
  }
}
