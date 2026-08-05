/**
 * Authorization boundary tests for the permissions matrix
 * (docs/security/09_User_Roles_and_Permissions.md). Per
 * docs/planning/21_Testing_Strategy.md, these are the highest-priority tests
 * in the codebase: the two boundaries named explicitly in the project brief
 * (Coordinator cross-batch access, Recruiter private-data access) must never
 * regress silently.
 */

import { describe, expect, it } from "vitest";
import type { AuthenticatedActor } from "../../../src/modules/auth";
import {
  canApproveOrRejectDraft,
  canChangeBatchLifecycleStatus,
  canEditOwnContactInfo,
  canEditPrivateAdminFields,
  canEditPublicProfileDraft,
  canExportBatchData,
  canManageBatches,
  canManageCoordinatorAccounts,
  canManageRecruiterAccounts,
  canViewAuditLogs,
  canViewPrivateProfile,
} from "../../../src/modules/auth";

const BATCH_A = "batch-a";
const BATCH_B = "batch-b";
const STUDENT_IN_A = "student-in-a";

const secretary: AuthenticatedActor = { userId: "sec-1", role: "SECRETARY" };
const coordinatorScopedToA: AuthenticatedActor = {
  userId: "coord-1",
  role: "COORDINATOR",
  batchScope: [BATCH_A],
};
const coordinatorScopedToB: AuthenticatedActor = {
  userId: "coord-2",
  role: "COORDINATOR",
  batchScope: [BATCH_B],
};
const coordinatorWithNoScope: AuthenticatedActor = {
  userId: "coord-3",
  role: "COORDINATOR",
  batchScope: [],
};
const studentInA: AuthenticatedActor = {
  userId: "user-1",
  role: "STUDENT",
  studentProfileId: STUDENT_IN_A,
};
const otherStudent: AuthenticatedActor = {
  userId: "user-2",
  role: "STUDENT",
  studentProfileId: "some-other-student",
};
const recruiter: AuthenticatedActor = { userId: "rec-1", role: "RECRUITER" };

describe("canViewPrivateProfile — the brief's named boundaries", () => {
  it("allows the Secretary unconditionally", () => {
    expect(canViewPrivateProfile(secretary, BATCH_A, STUDENT_IN_A)).toBe(true);
  });

  it("allows a Coordinator scoped to the student's batch", () => {
    expect(canViewPrivateProfile(coordinatorScopedToA, BATCH_A, STUDENT_IN_A)).toBe(true);
  });

  it("denies a Coordinator NOT scoped to the student's batch (brief's named example)", () => {
    expect(canViewPrivateProfile(coordinatorScopedToB, BATCH_A, STUDENT_IN_A)).toBe(false);
  });

  it("denies a Coordinator with an empty scope", () => {
    expect(canViewPrivateProfile(coordinatorWithNoScope, BATCH_A, STUDENT_IN_A)).toBe(false);
  });

  it("allows a student to view their own private profile", () => {
    expect(canViewPrivateProfile(studentInA, BATCH_A, STUDENT_IN_A)).toBe(true);
  });

  it("denies a student viewing another student's private profile", () => {
    expect(canViewPrivateProfile(otherStudent, BATCH_A, STUDENT_IN_A)).toBe(false);
  });

  it("denies a Recruiter under all circumstances (brief's named example)", () => {
    expect(canViewPrivateProfile(recruiter, BATCH_A, STUDENT_IN_A)).toBe(false);
  });
});

describe("canEditPrivateAdminFields (CGPA / backlog / remarks)", () => {
  it("denies a Student — these are department-entered fields", () => {
    expect(canEditPrivateAdminFields(studentInA, BATCH_A)).toBe(false);
  });

  it("allows an in-scope Coordinator", () => {
    expect(canEditPrivateAdminFields(coordinatorScopedToA, BATCH_A)).toBe(true);
  });

  it("denies an out-of-scope Coordinator", () => {
    expect(canEditPrivateAdminFields(coordinatorScopedToB, BATCH_A)).toBe(false);
  });
});

describe("canEditOwnContactInfo", () => {
  it("allows a student to edit their own contact info", () => {
    expect(canEditOwnContactInfo(studentInA, STUDENT_IN_A)).toBe(true);
  });

  it("denies a student editing another student's contact info", () => {
    expect(canEditOwnContactInfo(otherStudent, STUDENT_IN_A)).toBe(false);
  });

  it("denies a Coordinator (contact info edit is student-only)", () => {
    expect(canEditOwnContactInfo(coordinatorScopedToA, STUDENT_IN_A)).toBe(false);
  });
});

describe("canEditPublicProfileDraft / canApproveOrRejectDraft", () => {
  it("allows the owning student to edit their own draft", () => {
    expect(canEditPublicProfileDraft(studentInA, BATCH_A, STUDENT_IN_A)).toBe(true);
  });

  it("denies a Recruiter from ever editing a draft", () => {
    expect(canEditPublicProfileDraft(recruiter, BATCH_A, STUDENT_IN_A)).toBe(false);
  });

  it("allows an in-scope Coordinator to approve/reject", () => {
    expect(canApproveOrRejectDraft(coordinatorScopedToA, BATCH_A)).toBe(true);
  });

  it("denies an out-of-scope Coordinator from approving/rejecting", () => {
    expect(canApproveOrRejectDraft(coordinatorScopedToB, BATCH_A)).toBe(false);
  });

  it("denies a Student from approving their own draft", () => {
    expect(canApproveOrRejectDraft(studentInA, BATCH_A)).toBe(false);
  });
});

describe("Secretary-only administrative capabilities", () => {
  it("only the Secretary can manage batches", () => {
    expect(canManageBatches(secretary)).toBe(true);
    expect(canManageBatches(coordinatorScopedToA)).toBe(false);
  });

  it("only the Secretary can manage Coordinator accounts", () => {
    expect(canManageCoordinatorAccounts(secretary)).toBe(true);
    expect(canManageCoordinatorAccounts(coordinatorScopedToA)).toBe(false);
  });

  it("only the Secretary can change batch lifecycle status", () => {
    expect(canChangeBatchLifecycleStatus(secretary)).toBe(true);
    expect(canChangeBatchLifecycleStatus(coordinatorScopedToA)).toBe(false);
  });
});

describe("Scoped administrative capabilities (Secretary or in-scope Coordinator)", () => {
  it("canManageRecruiterAccounts respects batch scope", () => {
    expect(canManageRecruiterAccounts(secretary, BATCH_A)).toBe(true);
    expect(canManageRecruiterAccounts(coordinatorScopedToA, BATCH_A)).toBe(true);
    expect(canManageRecruiterAccounts(coordinatorScopedToB, BATCH_A)).toBe(false);
  });

  it("canExportBatchData respects batch scope", () => {
    expect(canExportBatchData(secretary, BATCH_A)).toBe(true);
    expect(canExportBatchData(coordinatorScopedToA, BATCH_A)).toBe(true);
    expect(canExportBatchData(coordinatorScopedToB, BATCH_A)).toBe(false);
  });

  it("canViewAuditLogs respects batch scope, and Secretary sees all", () => {
    expect(canViewAuditLogs(secretary)).toBe(true);
    expect(canViewAuditLogs(coordinatorScopedToA, BATCH_A)).toBe(true);
    expect(canViewAuditLogs(coordinatorScopedToB, BATCH_A)).toBe(false);
  });
});
