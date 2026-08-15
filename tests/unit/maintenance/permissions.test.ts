import { describe, expect, it } from "vitest";
import {
  canAssignMaintenanceIssue,
  canConfirmMaintenanceResolution,
  canManageMaintenanceIssue,
  canReassignMaintenanceIssue,
  canReopenMaintenanceIssue,
  canReportMaintenanceIssue,
  canResolveMaintenanceIssue,
  canUpdateMaintenanceIssue,
  canViewMaintenanceIssue,
  canViewMaintenanceReports,
  canViewMaintenanceTasks,
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

// MYARCH Maintenance functional hierarchy.
const MAINTENANCE_SECRETARY: AuthenticatedActor = {
  userId: "coord-mtsec",
  role: "COORDINATOR",
  batchScope: [],
  permissions: [],
  maintenanceRole: "MAINTENANCE_SECRETARY",
};
const MAINTENANCE_COORDINATOR_NO_GRANT: AuthenticatedActor = {
  userId: "coord-mtco",
  role: "COORDINATOR",
  batchScope: [],
  permissions: [],
  maintenanceRole: "MAINTENANCE_COORDINATOR",
};
const UPDATE_ONLY_COORDINATOR: AuthenticatedActor = {
  userId: "coord-5",
  role: "COORDINATOR",
  batchScope: [],
  permissions: ["maintenance.update"],
};
const RESOLVE_ONLY_COORDINATOR: AuthenticatedActor = {
  userId: "coord-6",
  role: "COORDINATOR",
  batchScope: [],
  permissions: ["maintenance.resolve"],
};
const REASSIGN_ONLY_COORDINATOR: AuthenticatedActor = {
  userId: "coord-7",
  role: "COORDINATOR",
  batchScope: [],
  permissions: ["maintenance.reassign"],
};
const TASKS_ONLY_COORDINATOR: AuthenticatedActor = {
  userId: "coord-8",
  role: "COORDINATOR",
  batchScope: [],
  permissions: ["maintenance.tasks"],
};
const REPORTS_ONLY_COORDINATOR: AuthenticatedActor = {
  userId: "coord-9",
  role: "COORDINATOR",
  batchScope: [],
  permissions: ["maintenance.reports"],
};

const ISSUE = { requesterId: "stu-1", assigneeId: "coord-2" };
const UNASSIGNED_ISSUE = { requesterId: "stu-1", assigneeId: null };

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

describe("MYARCH Maintenance functional hierarchy — Maintenance Secretary full access", () => {
  it("has unconditional access wherever Secretary does, without being Secretary", () => {
    expect(MAINTENANCE_SECRETARY.role).toBe("COORDINATOR");
    expect(canViewMaintenanceIssue(MAINTENANCE_SECRETARY, ISSUE)).toBe(true);
    expect(canManageMaintenanceIssue(MAINTENANCE_SECRETARY, ISSUE)).toBe(true);
    expect(canAssignMaintenanceIssue(MAINTENANCE_SECRETARY)).toBe(true);
    expect(canReassignMaintenanceIssue(MAINTENANCE_SECRETARY)).toBe(true);
    expect(canUpdateMaintenanceIssue(MAINTENANCE_SECRETARY, ISSUE)).toBe(true);
    expect(canResolveMaintenanceIssue(MAINTENANCE_SECRETARY, ISSUE)).toBe(true);
    expect(canConfirmMaintenanceResolution(MAINTENANCE_SECRETARY, ISSUE)).toBe(true);
    expect(canReopenMaintenanceIssue(MAINTENANCE_SECRETARY, ISSUE)).toBe(true);
    expect(canViewMaintenanceTasks(MAINTENANCE_SECRETARY)).toBe(true);
    expect(canViewMaintenanceReports(MAINTENANCE_SECRETARY)).toBe(true);
  });

  it("a Coordinator merely designated MAINTENANCE_COORDINATOR (with no permissions delegated) gets none of this for free", () => {
    expect(canManageMaintenanceIssue(MAINTENANCE_COORDINATOR_NO_GRANT, ISSUE)).toBe(false);
    expect(canViewMaintenanceTasks(MAINTENANCE_COORDINATOR_NO_GRANT)).toBe(false);
    expect(canViewMaintenanceReports(MAINTENANCE_COORDINATOR_NO_GRANT)).toBe(false);
  });
});

describe("canUpdateMaintenanceIssue — backward-compatible split", () => {
  it("maintenance.manage still implies update (no capability silently removed)", () => {
    expect(canUpdateMaintenanceIssue(MANAGE_COORDINATOR, ISSUE)).toBe(true);
  });

  it("a Coordinator granted only maintenance.update can update but is not a general manager", () => {
    expect(canUpdateMaintenanceIssue(UPDATE_ONLY_COORDINATOR, ISSUE)).toBe(true);
    expect(canManageMaintenanceIssue(UPDATE_ONLY_COORDINATOR, ISSUE)).toBe(false);
  });

  it("denies an unrelated, unprivileged Coordinator", () => {
    expect(canUpdateMaintenanceIssue(UNPRIVILEGED_COORDINATOR, ISSUE)).toBe(false);
  });
});

describe("canResolveMaintenanceIssue — backward-compatible split", () => {
  it("maintenance.manage still implies resolve", () => {
    expect(canResolveMaintenanceIssue(MANAGE_COORDINATOR, ISSUE)).toBe(true);
  });

  it("a Coordinator granted only maintenance.resolve can resolve but is not a general manager", () => {
    expect(canResolveMaintenanceIssue(RESOLVE_ONLY_COORDINATOR, ISSUE)).toBe(true);
    expect(canManageMaintenanceIssue(RESOLVE_ONLY_COORDINATOR, ISSUE)).toBe(false);
  });
});

describe("canReassignMaintenanceIssue — backward-compatible split", () => {
  it("maintenance.assign and maintenance.manage still imply reassign", () => {
    expect(canReassignMaintenanceIssue(ASSIGN_COORDINATOR)).toBe(true);
    expect(canReassignMaintenanceIssue(MANAGE_COORDINATOR)).toBe(true);
  });

  it("a Coordinator granted only maintenance.reassign can reassign but not perform the initial assignment via a distinct broader grant", () => {
    expect(canReassignMaintenanceIssue(REASSIGN_ONLY_COORDINATOR)).toBe(true);
  });

  it("denies an unprivileged Coordinator", () => {
    expect(canReassignMaintenanceIssue(UNPRIVILEGED_COORDINATOR)).toBe(false);
  });
});

describe("canViewMaintenanceTasks", () => {
  it("Secretary, Maintenance Secretary, maintenance.manage, and maintenance.tasks all pass", () => {
    expect(canViewMaintenanceTasks(SECRETARY)).toBe(true);
    expect(canViewMaintenanceTasks(MAINTENANCE_SECRETARY)).toBe(true);
    expect(canViewMaintenanceTasks(MANAGE_COORDINATOR)).toBe(true);
    expect(canViewMaintenanceTasks(TASKS_ONLY_COORDINATOR)).toBe(true);
  });

  it("denies an unprivileged Coordinator or a Student", () => {
    expect(canViewMaintenanceTasks(UNPRIVILEGED_COORDINATOR)).toBe(false);
    expect(canViewMaintenanceTasks(STUDENT)).toBe(false);
  });
});

describe("canViewMaintenanceReports", () => {
  it("Secretary, Maintenance Secretary, maintenance.view (pre-existing behavior), maintenance.reports, and maintenance.manage all pass", () => {
    expect(canViewMaintenanceReports(SECRETARY)).toBe(true);
    expect(canViewMaintenanceReports(MAINTENANCE_SECRETARY)).toBe(true);
    expect(canViewMaintenanceReports(VIEW_COORDINATOR)).toBe(true);
    expect(canViewMaintenanceReports(REPORTS_ONLY_COORDINATOR)).toBe(true);
    expect(canViewMaintenanceReports(MANAGE_COORDINATOR)).toBe(true);
  });

  it("denies an unprivileged Coordinator or a Student", () => {
    expect(canViewMaintenanceReports(UNPRIVILEGED_COORDINATOR)).toBe(false);
    expect(canViewMaintenanceReports(STUDENT)).toBe(false);
  });
});

describe("assignee-based access still works when an issue has no assignee yet", () => {
  it("does not throw and correctly denies a non-privileged actor", () => {
    expect(canManageMaintenanceIssue(UNPRIVILEGED_COORDINATOR, UNASSIGNED_ISSUE)).toBe(false);
    expect(canManageMaintenanceIssue(MAINTENANCE_SECRETARY, UNASSIGNED_ISSUE)).toBe(true);
  });
});
