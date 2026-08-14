import { describe, expect, it } from "vitest";
import {
  canAssignTaskTo,
  canCreateTask,
  canEscalateTask,
  canManageTask,
  canUpdateOwnTaskStatus,
  canViewTask,
} from "../../../src/modules/tasks/domain/permissions";
import type { AuthenticatedActor } from "../../../src/modules/auth";

const SECRETARY: AuthenticatedActor = { userId: "sec-1", role: "SECRETARY" };
const COORDINATOR: AuthenticatedActor = { userId: "coord-1", role: "COORDINATOR", batchScope: [] };
const OTHER_COORDINATOR: AuthenticatedActor = { userId: "coord-2", role: "COORDINATOR", batchScope: [] };
const STUDENT: AuthenticatedActor = { userId: "stu-1", role: "STUDENT", studentProfileId: "sp-1" };
const OTHER_STUDENT: AuthenticatedActor = { userId: "stu-2", role: "STUDENT", studentProfileId: "sp-2" };
const RECRUITER: AuthenticatedActor = { userId: "rec-1", role: "RECRUITER" };

const TASK_OWNED_BY_STUDENT_CREATED_BY_COORDINATOR = { ownerId: "stu-1", creatorId: "coord-1" };
const TASK_OWNED_BY_COORDINATOR_CREATED_BY_COORDINATOR = { ownerId: "coord-1", creatorId: "coord-1" };

describe("canCreateTask", () => {
  it("allows Secretary and Coordinator, denies Student/Recruiter", () => {
    expect(canCreateTask(SECRETARY)).toBe(true);
    expect(canCreateTask(COORDINATOR)).toBe(true);
    expect(canCreateTask(STUDENT)).toBe(false);
    expect(canCreateTask(RECRUITER)).toBe(false);
  });
});

describe("canViewTask", () => {
  it("Secretary can view any task", () => {
    expect(canViewTask(SECRETARY, TASK_OWNED_BY_STUDENT_CREATED_BY_COORDINATOR)).toBe(true);
  });

  it("Coordinator can view a task they own or created, not an unrelated one", () => {
    expect(canViewTask(COORDINATOR, TASK_OWNED_BY_STUDENT_CREATED_BY_COORDINATOR)).toBe(true);
    expect(canViewTask(OTHER_COORDINATOR, TASK_OWNED_BY_STUDENT_CREATED_BY_COORDINATOR)).toBe(false);
  });

  it("Student can view only their own task", () => {
    expect(canViewTask(STUDENT, TASK_OWNED_BY_STUDENT_CREATED_BY_COORDINATOR)).toBe(true);
    expect(canViewTask(OTHER_STUDENT, TASK_OWNED_BY_STUDENT_CREATED_BY_COORDINATOR)).toBe(false);
  });

  it("Recruiter has no task visibility", () => {
    expect(canViewTask(RECRUITER, TASK_OWNED_BY_STUDENT_CREATED_BY_COORDINATOR)).toBe(false);
  });
});

describe("canManageTask", () => {
  it("Secretary can manage any task", () => {
    expect(canManageTask(SECRETARY, TASK_OWNED_BY_STUDENT_CREATED_BY_COORDINATOR)).toBe(true);
  });

  it("Coordinator can manage a task they own or created", () => {
    expect(canManageTask(COORDINATOR, TASK_OWNED_BY_STUDENT_CREATED_BY_COORDINATOR)).toBe(true);
    expect(canManageTask(OTHER_COORDINATOR, TASK_OWNED_BY_STUDENT_CREATED_BY_COORDINATOR)).toBe(false);
  });

  it("a Student never gets full management rights, even over their own task", () => {
    expect(canManageTask(STUDENT, TASK_OWNED_BY_STUDENT_CREATED_BY_COORDINATOR)).toBe(false);
  });
});

describe("canUpdateOwnTaskStatus", () => {
  it("allows a Student to move only their own task", () => {
    expect(canUpdateOwnTaskStatus(STUDENT, { ownerId: "stu-1" })).toBe(true);
    expect(canUpdateOwnTaskStatus(OTHER_STUDENT, { ownerId: "stu-1" })).toBe(false);
  });

  it("never applies to a Secretary or Coordinator — they use canManageTask instead", () => {
    expect(canUpdateOwnTaskStatus(SECRETARY, { ownerId: "sec-1" })).toBe(false);
    expect(canUpdateOwnTaskStatus(COORDINATOR, { ownerId: "coord-1" })).toBe(false);
  });
});

describe("canAssignTaskTo — the 'Coordinator cannot escalate privileges' rule", () => {
  it("Secretary may assign to any role", () => {
    expect(canAssignTaskTo(SECRETARY, "stu-1", "STUDENT")).toBe(true);
    expect(canAssignTaskTo(SECRETARY, "coord-1", "COORDINATOR")).toBe(true);
    expect(canAssignTaskTo(SECRETARY, "sec-1", "SECRETARY")).toBe(true);
  });

  it("Coordinator may assign to any Student or to themselves", () => {
    expect(canAssignTaskTo(COORDINATOR, "stu-1", "STUDENT")).toBe(true);
    expect(canAssignTaskTo(COORDINATOR, "coord-1", "COORDINATOR")).toBe(true);
  });

  it("Coordinator may never assign to a Secretary or to a DIFFERENT Coordinator — an identity check, not a role check (regression: comparing roles alone is trivially true for any two Coordinators)", () => {
    expect(canAssignTaskTo(COORDINATOR, "sec-1", "SECRETARY")).toBe(false);
    expect(canAssignTaskTo(COORDINATOR, "coord-2", "COORDINATOR")).toBe(false);
  });

  it("Student/Recruiter may never assign tasks", () => {
    expect(canAssignTaskTo(STUDENT, "stu-1", "STUDENT")).toBe(false);
    expect(canAssignTaskTo(RECRUITER, "stu-1", "STUDENT")).toBe(false);
  });
});

describe("canEscalateTask", () => {
  it("mirrors canManageTask exactly", () => {
    expect(canEscalateTask(SECRETARY, TASK_OWNED_BY_COORDINATOR_CREATED_BY_COORDINATOR)).toBe(true);
    expect(canEscalateTask(COORDINATOR, TASK_OWNED_BY_COORDINATOR_CREATED_BY_COORDINATOR)).toBe(true);
    expect(canEscalateTask(OTHER_COORDINATOR, TASK_OWNED_BY_COORDINATOR_CREATED_BY_COORDINATOR)).toBe(false);
  });
});
