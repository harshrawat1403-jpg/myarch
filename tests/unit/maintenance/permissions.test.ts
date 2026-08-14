import { describe, expect, it } from "vitest";
import {
  canAssignMaintenanceIssue,
  canConfirmMaintenanceResolution,
  canManageMaintenanceIssue,
  canReopenMaintenanceIssue,
  canReportMaintenanceIssue,
  canViewMaintenanceIssue,
} from "../../../src/modules/maintenance/domain/permissions";
import type { AuthenticatedActor } from "../../../src/modules/auth";

const SECRETARY: AuthenticatedActor = { userId: "sec-1", role: "SECRETARY" };
const UNPRIVILEGED_COORDINATOR: AuthenticatedActor = { userId: "coord-1", role: "COORDINATOR", batchScope: [], permissions: [] };
const MANAGE_COORDINATOR: AuthenticatedActor = {
  userId: "coord-2",
  role: "COORDINATOR",
  batchScope: [],
  permissions: ["maintenance.manage"],
};
const ASSIGN_COORDINATOR: AuthenticatedActor = {
  userId: "coord-3",
  role: "COORDINATOR",
  batchScope: [],
  permissions: ["maintenance.assign"],
};
const VIEW_COORDINATOR: AuthenticatedActor = {
  userId: "coord-4",
  role: "COORDINATOR",
  batchScope: [],
  permissions: ["maintenance.view"],
};
const STUDENT: AuthenticatedActor = { userId: "stu-1", role: "STUDENT", studentProfileId: "sp-1" };
const OTHER_STUDENT: AuthenticatedActor = { userId: "stu-2", role: "STUDENT", studentProfileId: "sp-2" };

const ISSUE = { requesterId: "stu-1", assigneeId: "coord-2" };

describe("canReportMaintenanceIssue", () => {
  it("allows Secretary, Coordinator, Student — denies Recruiter/Alumni", () => {
    expect(canReportMaintenanceIssue(SECRETARY)).toBe(true);
    expect(canReportMaintenanceIssue(UNPRIVILEGED_COORDINATOR)).toBe(true);
    expect(canReportMaintenanceIssue(STUDENT)).toBe(true);
    expect(canReportMaintenanceIssue({ userId: "rec-1", role: "RECRUITER" })).toBe(false);
  });
});

describe("canViewMaintenanceIssue", () => {
  it("Secretary can view any issue", () => {
    expect(canViewMaintenanceIssue(SECRETARY, ISSUE)).toBe(true);
  });

  it("a Coordinator with maintenance.view sees any issue", () => {
    expect(canViewMaintenanceIssue(VIEW_COORDINATOR, ISSUE)).toBe(true);
  });

  it("an unprivileged Coordinator sees only issues assigned to them", () => {
    expect(canViewMaintenanceIssue(MANAGE_COORDINATOR, ISSUE)).toBe(true);
    expect(canViewMaintenanceIssue(UNPRIVILEGED_COORDINATOR, ISSUE)).toBe(false);
  });

  it("the requester (complainant) can view their own issue; a different Student cannot", () => {
    expect(canViewMaintenanceIssue(STUDENT, ISSUE)).toBe(true);
    expect(canViewMaintenanceIssue(OTHER_STUDENT, ISSUE)).toBe(false);
  });
});

describe("canManageMaintenanceIssue", () => {
  it("Secretary and a maintenance.manage Coordinator can manage", () => {
    expect(canManageMaintenanceIssue(SECRETARY, ISSUE)).toBe(true);
    expect(canManageMaintenanceIssue(MANAGE_COORDINATOR, ISSUE)).toBe(true);
  });

  it("the assigned Coordinator can manage even without the blanket permission", () => {
    expect(canManageMaintenanceIssue({ userId: "coord-2", role: "COORDINATOR", batchScope: [], permissions: [] }, ISSUE)).toBe(true);
  });

  it("an unrelated, unprivileged Coordinator cannot manage", () => {
    expect(canManageMaintenanceIssue(UNPRIVILEGED_COORDINATOR, ISSUE)).toBe(false);
  });
});

describe("canAssignMaintenanceIssue", () => {
  it("Secretary, maintenance.assign, and maintenance.manage Coordinators can assign", () => {
    expect(canAssignMaintenanceIssue(SECRETARY)).toBe(true);
    expect(canAssignMaintenanceIssue(ASSIGN_COORDINATOR)).toBe(true);
    expect(canAssignMaintenanceIssue(MANAGE_COORDINATOR)).toBe(true);
  });

  it("denies an unprivileged Coordinator or a Student", () => {
    expect(canAssignMaintenanceIssue(UNPRIVILEGED_COORDINATOR)).toBe(false);
    expect(canAssignMaintenanceIssue(STUDENT)).toBe(false);
  });
});

describe("canConfirmMaintenanceResolution — complainant-facing action", () => {
  it("allows the requester and the Secretary", () => {
    expect(canConfirmMaintenanceResolution(STUDENT, ISSUE)).toBe(true);
    expect(canConfirmMaintenanceResolution(SECRETARY, ISSUE)).toBe(true);
  });

  it("denies a different Student, even the assigned Coordinator", () => {
    expect(canConfirmMaintenanceResolution(OTHER_STUDENT, ISSUE)).toBe(false);
    expect(canConfirmMaintenanceResolution(MANAGE_COORDINATOR, ISSUE)).toBe(false);
  });
});

describe("canReopenMaintenanceIssue — available to management AND the complainant", () => {
  it("allows the requester, the assignee, and the Secretary", () => {
    expect(canReopenMaintenanceIssue(STUDENT, ISSUE)).toBe(true);
    expect(canReopenMaintenanceIssue({ userId: "coord-2", role: "COORDINATOR", batchScope: [], permissions: [] }, ISSUE)).toBe(true);
    expect(canReopenMaintenanceIssue(SECRETARY, ISSUE)).toBe(true);
  });

  it("denies an unrelated Student or unprivileged Coordinator", () => {
    expect(canReopenMaintenanceIssue(OTHER_STUDENT, ISSUE)).toBe(false);
    expect(canReopenMaintenanceIssue(UNPRIVILEGED_COORDINATOR, ISSUE)).toBe(false);
  });
});
