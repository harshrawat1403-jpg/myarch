import type { AuthenticatedActor } from "@/modules/auth";
import { canAccessRecruiterDirectory } from "@/modules/auth";
import { NotAuthorizedError } from "@/lib/errors";
import type { RecruiterOverviewStats } from "../../domain/entities";
import type { RecruiterInteractionRepository } from "../ports/recruiter-interaction-repository";
import type { RecruiterInterestRepository } from "../ports/recruiter-interest-repository";
import type { RecruiterSelfLookup } from "../ports/recruiter-self-lookup";

const EMPTY_STATS: RecruiterOverviewStats = {
  companyName: "",
  savedCount: 0,
  shortlistedCount: 0,
  interestsSentCount: 0,
  interestsAcceptedCount: 0,
};

/** V4.0 C4 — the /recruiter dashboard's own-activity counters, consolidating C1–C3 data. */
export class GetRecruiterOverviewUseCase {
  constructor(
    private readonly deps: {
      interactionRepository: RecruiterInteractionRepository;
      interestRepository: RecruiterInterestRepository;
      recruiterSelfLookup: RecruiterSelfLookup;
    },
  ) {}

  async execute(actor: AuthenticatedActor): Promise<RecruiterOverviewStats> {
    if (!canAccessRecruiterDirectory(actor)) {
      throw new NotAuthorizedError("Not authorized to view the recruiter dashboard");
    }

    const recruiter = await this.deps.recruiterSelfLookup.findByUserId(actor.userId);
    if (!recruiter) return EMPTY_STATS;

    const [savedInteractions, interests] = await Promise.all([
      this.deps.interactionRepository.listSavedForRecruiter(recruiter.id),
      this.deps.interestRepository.listForRecruiter(recruiter.id),
    ]);

    return {
      // V4.0 E8: already fetched above (recruiterSelfLookup) for the id —
      // surfacing companyName too costs no additional query, and gives the
      // dashboard a way to show "who am I signed in as" (§ Recruiter
      // Dashboard: "Company information").
      companyName: recruiter.companyName,
      savedCount: savedInteractions.length,
      shortlistedCount: savedInteractions.filter((i) => i.isShortlisted).length,
      interestsSentCount: interests.length,
      interestsAcceptedCount: interests.filter((i) => i.status === "ACCEPTED" || i.status === "COMPLETED").length,
    };
  }
}
