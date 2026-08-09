import type { RecruiterInterestRequestRecord, RecruiterStudentProfileDTO } from "../../domain/entities";

/** Pure merge, same shape/reasoning as merge-interaction-state.ts — kept separate since save/shortlist and interest are independent concepts with independent data sources. */
export function mergeInterestState(
  profiles: readonly RecruiterStudentProfileDTO[],
  interests: readonly RecruiterInterestRequestRecord[],
): RecruiterStudentProfileDTO[] {
  const byStudentId = new Map(interests.map((i) => [i.studentProfileId, i]));
  return profiles.map((profile) => ({
    ...profile,
    interestStatus: byStudentId.get(profile.studentId)?.status ?? null,
  }));
}
