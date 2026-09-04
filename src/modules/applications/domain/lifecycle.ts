import type { FormApplicationStatus } from "./entities";

const ALLOWED_TRANSITIONS: Record<FormApplicationStatus, readonly FormApplicationStatus[]> = {
  SUBMITTED: ["UNDER_REVIEW"],
  UNDER_REVIEW: ["SELECTED", "REJECTED"],
  SELECTED: [],
  REJECTED: [],
};

export function isValidFormApplicationTransition(from: FormApplicationStatus, to: FormApplicationStatus): boolean {
  return ALLOWED_TRANSITIONS[from].includes(to);
}

