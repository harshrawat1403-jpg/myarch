import { describe, expect, it } from "vitest";
import { canCreateCommittee, canManageCommittee, canViewCommittee } from "../../../src/modules/committees/domain/permissions";
import type { AuthenticatedActor } from "../../../src/modules/auth";

const SECRETARY: AuthenticatedActor = { userId: "sec-1", role: "SECRETARY" };
const UNPRIVILEGED_COORDINATOR: AuthenticatedActor = { userId: "coord-1", role: "COORDINATOR", batchScope: [], permissions: [] };
const MANAGE_COORDINATOR: AuthenticatedActor = { userId: "coord-2", role: "COORDINATOR", batchScope: [], permissions: ["committees.manage"] };
const LEAD_STUDENT: AuthenticatedActor = { userId: "stu-lead", role: "STUDENT", studentProfileId: "sp-1" };
const MEMBER_STUDENT: AuthenticatedActor = { userId: "stu-member", role: "STUDENT", studentProfileId: "sp-2" };
const OUTSIDER_STUDENT: AuthenticatedActor = { userId: "stu-outsider", role: "STUDENT", studentProfileId: "sp-3" };
const RECRUITER: AuthenticatedActor = { userId: "rec-1", role: "RECRUITER" };

const MEMBERSHIPS = [
  { userId: "stu-lead", isActive: true, isLead: true },
  { userId: "stu-member", isActive: true, isLead: false },
];

describe("canCreateCommittee", () => {
  it("allows Secretary and a Coordinator delegated committees.manage", () => {
    expect(canCreateCommittee(SECRETARY)).toBe(true);
    expect(canCreateCommittee(MANAGE_COORDINATOR)).toBe(true);
  });

  it("denies an unprivileged Coordinator or a Student", () => {
    expect(canCreateCommittee(UNPRIVILEGED_COORDINATOR)).toBe(false);
    expect(canCreateCommittee(MEMBER_STUDENT)).toBe(false);
  });
});

describe("canManageCommittee", () => {
  it("allows Secretary, a Coordinator with committees.manage, and any active isLead member", () => {
    expect(canManageCommittee(SECRETARY, MEMBERSHIPS)).toBe(true);
    expect(canManageCommittee(MANAGE_COORDINATOR, MEMBERSHIPS)).toBe(true);
    expect(canManageCommittee(LEAD_STUDENT, MEMBERSHIPS)).toBe(true);
  });

  it("denies a non-lead active member, an unprivileged Coordinator, and a non-member Student", () => {
    expect(canManageCommittee(MEMBER_STUDENT, MEMBERSHIPS)).toBe(false);
    expect(canManageCommittee(UNPRIVILEGED_COORDINATOR, MEMBERSHIPS)).toBe(false);
    expect(canManageCommittee(OUTSIDER_STUDENT, MEMBERSHIPS)).toBe(false);
  });
});

describe("canViewCommittee — broadly visible, unlike Meetings", () => {
  it("allows Secretary, Coordinator, Student, and Alumni", () => {
    expect(canViewCommittee(SECRETARY)).toBe(true);
    expect(canViewCommittee(UNPRIVILEGED_COORDINATOR)).toBe(true);
    expect(canViewCommittee(OUTSIDER_STUDENT)).toBe(true);
    expect(canViewCommittee({ userId: "alum-1", role: "ALUMNI" })).toBe(true);
  });

  it("denies Recruiter — an external, company-facing role", () => {
    expect(canViewCommittee(RECRUITER)).toBe(false);
  });
});
