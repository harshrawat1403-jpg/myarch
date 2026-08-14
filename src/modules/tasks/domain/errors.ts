export class TaskNotFoundError extends Error {
  constructor() {
    super("Task not found");
    this.name = "TaskNotFoundError";
  }
}

export class InvalidTaskStatusTransitionError extends Error {
  constructor(from: string, to: string) {
    super(`Cannot move a task from ${from} to ${to}`);
    this.name = "InvalidTaskStatusTransitionError";
  }
}

/** ReopenTaskUseCase's own guard — only a DONE or CANCELLED task may be reopened. */
export class TaskNotReopenableError extends Error {
  constructor() {
    super("Only a completed or cancelled task can be reopened");
    this.name = "TaskNotReopenableError";
  }
}

/**
 * CreateTaskUseCase/ReassignTaskUseCase — a Coordinator may only assign/
 * reassign a task to a Student or to themselves, never to a Secretary or
 * another Coordinator (see domain/permissions.ts's canAssignTaskTo doc
 * comment for why: a Coordinator must not be able to use the Task system to
 * direct a peer or superior, which would be a privilege-escalation path the
 * roadmap's own "Coordinator... cannot escalate privileges" rule forbids).
 */
export class CannotAssignTaskToRoleError extends Error {
  constructor() {
    super("You are not authorized to assign tasks to this account");
    this.name = "CannotAssignTaskToRoleError";
  }
}

export class TaskCommentBodyRequiredError extends Error {
  constructor() {
    super("Comment body cannot be empty");
    this.name = "TaskCommentBodyRequiredError";
  }
}
