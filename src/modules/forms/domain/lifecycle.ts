import type { FormStatus } from "./entities";

const ALLOWED_TRANSITIONS: Record<FormStatus, readonly FormStatus[]> = {
  DRAFT: ["PUBLISHED", "ARCHIVED"],
  PUBLISHED: ["CLOSED"],
  CLOSED: ["ARCHIVED"],
  ARCHIVED: [],
};

export function isValidFormStatusTransition(from: FormStatus, to: FormStatus): boolean {
  return ALLOWED_TRANSITIONS[from].includes(to);
}

export function isFormAvailable(form: Pick<{ status: FormStatus; deadline: Date | null }, "status" | "deadline">, now = new Date()): boolean {
  return form.status === "PUBLISHED" && (!form.deadline || form.deadline.getTime() >= now.getTime());
}

