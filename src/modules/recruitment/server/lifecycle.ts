import type { RecruitmentApplicationStatus } from "@prisma/client";

const TRANSITIONS: Record<RecruitmentApplicationStatus, readonly RecruitmentApplicationStatus[]> = {
  APPLIED: ["SHORTLISTED", "REJECTED", "WITHDRAWN"],
  SHORTLISTED: ["SELECTED", "REJECTED", "WITHDRAWN"],
  SELECTED: [],
  REJECTED: [],
  WITHDRAWN: [],
};

export function isValidRecruitmentApplicationTransition(
  from: RecruitmentApplicationStatus,
  to: RecruitmentApplicationStatus,
): boolean {
  return TRANSITIONS[from].includes(to);
}
