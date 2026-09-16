import { describe, expect, it } from "vitest";
import type { AuthenticatedActor } from "../../../src/modules/auth";
import {
  canEditOwnAlumniProfile,
  canEditOwnTalentProfile,
  canManageCompany,
  canRecordPlacementOutcome,
  canViewApplicant,
  canViewPublishedTalent,
} from "../../../src/modules/platform";
import { TalentProfileInputSchema } from "../../../src/modules/talent";

const student: AuthenticatedActor = { userId: "student-user", role: "STUDENT", studentProfileId: "student-profile" };
const recruiter: AuthenticatedActor = { userId: "recruiter-user", role: "RECRUITER" };
const unrelatedRecruiter: AuthenticatedActor = { userId: "other-recruiter", role: "RECRUITER" };
const tnpCoordinator: AuthenticatedActor = { userId: "coordinator-user", role: "COORDINATOR", permissions: ["applications.review"] };
const secretary: AuthenticatedActor = { userId: "secretary-user", role: "SECRETARY" };

describe("simplified platform capabilities", () => {
  it("enforces Talent Profile ownership and does not treat verified academic data as student-editable", () => {
    expect(canEditOwnTalentProfile(student, "student-profile")).toBe(true);
    expect(canEditOwnTalentProfile(student, "someone-else")).toBe(false);
    const submitted = TalentProfileInputSchema.parse({ professionalHeadline: "Designer", cgpa: 10, rollNumber: "A1" });
    expect(submitted).toEqual({ professionalHeadline: "Designer" });
  });

  it("allows a recruiter to access only a company where they hold membership", () => {
    const membership = { companyId: "company-a", role: "RECRUITER" as const };
    expect(canViewApplicant(recruiter, membership)).toBe(true);
    expect(canViewApplicant(unrelatedRecruiter, null)).toBe(false);
    expect(canManageCompany(recruiter, membership)).toBe(false);
    expect(canManageCompany(recruiter, { companyId: "company-a", role: "OWNER" })).toBe(true);
  });

  it("maps legacy coordinator permissions to the new TNP authority without granting students or recruiters official outcome control", () => {
    expect(canRecordPlacementOutcome(tnpCoordinator)).toBe(true);
    expect(canRecordPlacementOutcome(student)).toBe(false);
    expect(canRecordPlacementOutcome(recruiter)).toBe(false);
    expect(canRecordPlacementOutcome(secretary)).toBe(true);
  });

  it("keeps alumni profile editing self-owned and published talent visible only to platform actors", () => {
    expect(canEditOwnAlumniProfile({ userId: "alumni-user", role: "ALUMNI" }, "alumni-user")).toBe(true);
    expect(canEditOwnAlumniProfile({ userId: "alumni-user", role: "ALUMNI" }, "other-user")).toBe(false);
    expect(canViewPublishedTalent(recruiter)).toBe(true);
    expect(canViewPublishedTalent({ userId: "guest", role: "ALUMNI" })).toBe(true);
  });
});
