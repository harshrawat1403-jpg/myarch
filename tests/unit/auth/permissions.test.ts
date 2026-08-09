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
  canAccessUserDirectory,
  canApprovePublicProfile,
  canRequestProfileChanges,
  canChangeBatchLifecycleStatus,
  canEditOwnContactInfo,
  canEditPrivateAdminFields,
  canEditPublicProfileDraft,
  canExportBatchData,
  canManageBatches,
  canManageCompanies,
  canViewCompanies,
  canReviewRegistrationRequest,
  canDecideRegistrationRequest,
  canManageCoordinatorAccounts,
  canViewAuditLogs,
  canViewPrivateProfile,
  canManagePlacementDrive,
  canPublishPlacementDrive,
  canApplyToPlacementDrive,
  canManageApplication,
  canManageAlumni,
  canManagePublications,
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

describe("canEditPublicProfileDraft", () => {
  it("allows the owning student to edit their own draft", () => {
    expect(canEditPublicProfileDraft(studentInA, BATCH_A, STUDENT_IN_A)).toBe(true);
  });

  it("denies a Recruiter from ever editing a draft", () => {
    expect(canEditPublicProfileDraft(recruiter, BATCH_A, STUDENT_IN_A)).toBe(false);
  });
});

describe("canApprovePublicProfile — V4.0 Q1: Secretary is the sole final approval authority", () => {
  it("allows the Secretary", () => {
    expect(canApprovePublicProfile(secretary)).toBe(true);
  });

  it("denies an in-scope Coordinator (narrowed from the former canApproveOrRejectDraft — Coordinators may request changes, never approve)", () => {
    expect(canApprovePublicProfile(coordinatorScopedToA)).toBe(false);
  });

  it("denies an out-of-scope Coordinator", () => {
    expect(canApprovePublicProfile(coordinatorScopedToB)).toBe(false);
  });

  it("denies a Student from approving their own draft", () => {
    expect(canApprovePublicProfile(studentInA)).toBe(false);
  });

  it("denies a Recruiter", () => {
    expect(canApprovePublicProfile(recruiter)).toBe(false);
  });
});

describe("canRequestProfileChanges — Coordinator's retained (non-final) review authority", () => {
  it("allows the Secretary", () => {
    expect(canRequestProfileChanges(secretary, BATCH_A)).toBe(true);
  });

  it("allows an in-scope Coordinator", () => {
    expect(canRequestProfileChanges(coordinatorScopedToA, BATCH_A)).toBe(true);
  });

  it("denies an out-of-scope Coordinator", () => {
    expect(canRequestProfileChanges(coordinatorScopedToB, BATCH_A)).toBe(false);
  });

  it("denies a Student from requesting changes on their own draft", () => {
    expect(canRequestProfileChanges(studentInA, BATCH_A)).toBe(false);
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

describe("canManageCompanies / canViewCompanies (V4.0 A4)", () => {
  it("only the Secretary can manage companies", () => {
    expect(canManageCompanies(secretary)).toBe(true);
    expect(canManageCompanies(coordinatorScopedToA)).toBe(false);
    expect(canManageCompanies(studentInA)).toBe(false);
    expect(canManageCompanies(recruiter)).toBe(false);
  });

  it("Secretary and Coordinator can both view companies, Student and Recruiter cannot", () => {
    expect(canViewCompanies(secretary)).toBe(true);
    expect(canViewCompanies(coordinatorScopedToA)).toBe(true);
    expect(canViewCompanies(studentInA)).toBe(false);
    expect(canViewCompanies(recruiter)).toBe(false);
  });
});

describe("canReviewRegistrationRequest / canDecideRegistrationRequest (V4.0 B2/B3)", () => {
  it("canReviewRegistrationRequest: Secretary unscoped, Coordinator batch-scoped, Student/Recruiter denied", () => {
    expect(canReviewRegistrationRequest(secretary, BATCH_A)).toBe(true);
    expect(canReviewRegistrationRequest(coordinatorScopedToA, BATCH_A)).toBe(true);
    expect(canReviewRegistrationRequest(coordinatorScopedToB, BATCH_A)).toBe(false);
    expect(canReviewRegistrationRequest(studentInA, BATCH_A)).toBe(false);
    expect(canReviewRegistrationRequest(recruiter, BATCH_A)).toBe(false);
  });

  it("canDecideRegistrationRequest: Secretary only (Q1 — final approval authority)", () => {
    expect(canDecideRegistrationRequest(secretary)).toBe(true);
    expect(canDecideRegistrationRequest(coordinatorScopedToA)).toBe(false);
    expect(canDecideRegistrationRequest(studentInA)).toBe(false);
    expect(canDecideRegistrationRequest(recruiter)).toBe(false);
  });
});

describe("canAccessUserDirectory", () => {
  it("allows Secretary and Coordinator, denies Student and Recruiter", () => {
    expect(canAccessUserDirectory(secretary)).toBe(true);
    expect(canAccessUserDirectory(coordinatorScopedToA)).toBe(true);
    expect(canAccessUserDirectory(studentInA)).toBe(false);
    expect(canAccessUserDirectory(recruiter)).toBe(false);
  });
});

describe("canManagePlacementDrive (V4.0 D1 — §4: 'Coordinator: Scoped, no publish')", () => {
  it("Secretary can manage a drive regardless of its eligible batches, including one open to every batch", () => {
    expect(canManagePlacementDrive(secretary, [BATCH_A])).toBe(true);
    expect(canManagePlacementDrive(secretary, [])).toBe(true);
  });

  it("a Coordinator may manage a drive only when EVERY eligible batch is within their own scope", () => {
    expect(canManagePlacementDrive(coordinatorScopedToA, [BATCH_A])).toBe(true);
    expect(canManagePlacementDrive(coordinatorScopedToA, [BATCH_A, BATCH_B])).toBe(false);
    expect(canManagePlacementDrive(coordinatorScopedToB, [BATCH_A])).toBe(false);
  });

  it("a Coordinator can never manage a drive open to every batch (empty eligibleBatchIds)", () => {
    expect(canManagePlacementDrive(coordinatorScopedToA, [])).toBe(false);
  });

  it("denies Student and Recruiter", () => {
    expect(canManagePlacementDrive(studentInA, [BATCH_A])).toBe(false);
    expect(canManagePlacementDrive(recruiter, [BATCH_A])).toBe(false);
  });
});

describe("canPublishPlacementDrive (V4.0 D1 — the DRAFT→ANNOUNCED 'publish' decision)", () => {
  it("Secretary only, even a fully-scoped Coordinator is denied", () => {
    expect(canPublishPlacementDrive(secretary)).toBe(true);
    expect(canPublishPlacementDrive(coordinatorScopedToA)).toBe(false);
    expect(canPublishPlacementDrive(studentInA)).toBe(false);
    expect(canPublishPlacementDrive(recruiter)).toBe(false);
  });
});

describe("canApplyToPlacementDrive", () => {
  it("Student only", () => {
    expect(canApplyToPlacementDrive(studentInA)).toBe(true);
    expect(canApplyToPlacementDrive(secretary)).toBe(false);
    expect(canApplyToPlacementDrive(coordinatorScopedToA)).toBe(false);
    expect(canApplyToPlacementDrive(recruiter)).toBe(false);
  });
});

describe("canManageApplication (V4.0 D1 — scoped to the applying student's own batch)", () => {
  it("Secretary unscoped, Coordinator batch-scoped, Student/Recruiter denied", () => {
    expect(canManageApplication(secretary, BATCH_A)).toBe(true);
    expect(canManageApplication(coordinatorScopedToA, BATCH_A)).toBe(true);
    expect(canManageApplication(coordinatorScopedToB, BATCH_A)).toBe(false);
    expect(canManageApplication(studentInA, BATCH_A)).toBe(false);
    expect(canManageApplication(recruiter, BATCH_A)).toBe(false);
  });
});

describe("canManageAlumni (V4.0 D5 — the one entity where Secretary and Coordinator are identically 'Full', unscoped)", () => {
  it("Secretary and any Coordinator (regardless of batch scope), Student/Recruiter denied", () => {
    expect(canManageAlumni(secretary)).toBe(true);
    expect(canManageAlumni(coordinatorScopedToA)).toBe(true);
    expect(canManageAlumni(coordinatorScopedToB)).toBe(true);
    expect(canManageAlumni(studentInA)).toBe(false);
    expect(canManageAlumni(recruiter)).toBe(false);
  });
});

describe("canManagePublications (V4.0 E3-E5 — mirrors canManageAlumni: Secretary and Coordinator identically 'Full', unscoped, per PRD §13/§9)", () => {
  it("Secretary and any Coordinator (regardless of batch scope), Student/Recruiter denied", () => {
    expect(canManagePublications(secretary)).toBe(true);
    expect(canManagePublications(coordinatorScopedToA)).toBe(true);
    expect(canManagePublications(coordinatorScopedToB)).toBe(true);
    expect(canManagePublications(studentInA)).toBe(false);
    expect(canManagePublications(recruiter)).toBe(false);
  });
});
