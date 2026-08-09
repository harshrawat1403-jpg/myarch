import type { RecruiterStudentProfileDTO } from "../../domain/entities";
import type { RecruiterInteractionRecord } from "../ports/recruiter-interaction-repository";

/** Pure merge — shared by SearchDirectoryUseCase and GetRecruiterStudentProfileUseCase so "how isSaved/isShortlisted get attached to a DTO" has exactly one implementation. */
export function mergeInteractionState(
  profiles: readonly RecruiterStudentProfileDTO[],
  interactions: readonly RecruiterInteractionRecord[],
): RecruiterStudentProfileDTO[] {
  const byStudentId = new Map(interactions.map((i) => [i.studentProfileId, i]));
  return profiles.map((profile) => {
    const interaction = byStudentId.get(profile.studentId);
    return {
      ...profile,
      isSaved: interaction?.isSaved ?? false,
      isShortlisted: interaction?.isShortlisted ?? false,
    };
  });
}
