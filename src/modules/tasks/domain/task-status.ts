import type { TaskStatus } from "./entities";

/**
 * The status graph from roadmap §3.8: TODO → IN_PROGRESS → BLOCKED → DONE →
 * CANCELLED, plus BLOCKED↔IN_PROGRESS (unblocking) and CANCELLED reachable
 * from any non-terminal state. DONE and CANCELLED are terminal for ordinary
 * transitions — leaving either requires the distinct, explicit "reopen"
 * action (ReopenTaskUseCase), never a forward transition through this map,
 * since reopening also has to clear completedAt/cancelledAt.
 */
const ALLOWED_TRANSITIONS: Record<TaskStatus, readonly TaskStatus[]> = {
  TODO: ["IN_PROGRESS", "BLOCKED", "CANCELLED"],
  IN_PROGRESS: ["BLOCKED", "DONE", "CANCELLED"],
  BLOCKED: ["IN_PROGRESS", "CANCELLED"],
  DONE: [],
  CANCELLED: [],
};

export function isValidTaskStatusTransition(from: TaskStatus, to: TaskStatus): boolean {
  return ALLOWED_TRANSITIONS[from].includes(to);
}
