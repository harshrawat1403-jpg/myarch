import { describe, expect, it } from "vitest";
import { Prisma } from "@prisma/client";
import { evaluateOpportunityEligibility } from "../../../src/modules/recruitment";
import { isValidRecruitmentApplicationTransition } from "../../../src/modules/recruitment";
import { isDuplicateRecruitmentApplicationError } from "../../../src/modules/recruitment";

const eligibleStudent = { batchId: "batch-a", programCode: "BARCH", cgpa: 8.4 };

describe("Recruitment eligibility and application history", () => {
  it("uses verified academic data and returns every failed eligibility reason", () => {
    const result = evaluateOpportunityEligibility(
      {
        status: "CLOSED",
        deadline: new Date("2020-01-01"),
        minimumCgpa: 9,
        eligibleBatchIds: ["batch-b"],
        eligibleProgramCodes: ["MPLAN"],
      },
      eligibleStudent,
      new Date("2026-09-16"),
    );
    expect(result).toEqual({
      eligible: false,
      reasons: ["OPPORTUNITY_CLOSED", "DEADLINE_PASSED", "BATCH_MISMATCH", "PROGRAM_MISMATCH", "CGPA_BELOW_REQUIREMENT"],
    });
  });

  it("does not silently treat an unavailable canonical program as eligible", () => {
    expect(evaluateOpportunityEligibility(
      { status: "OPEN", deadline: null, minimumCgpa: null, eligibleBatchIds: [], eligibleProgramCodes: ["BARCH"] },
      { ...eligibleStudent, programCode: null },
    )).toEqual({ eligible: false, reasons: ["PROGRAM_MISMATCH"] });
  });

  it("accepts only append-only status transitions", () => {
    expect(isValidRecruitmentApplicationTransition("APPLIED", "SHORTLISTED")).toBe(true);
    expect(isValidRecruitmentApplicationTransition("SHORTLISTED", "SELECTED")).toBe(true);
    expect(isValidRecruitmentApplicationTransition("SELECTED", "APPLIED")).toBe(false);
  });

  it("recognizes the database unique-constraint signal used to reject duplicate concurrent applications", () => {
    const duplicate = new Prisma.PrismaClientKnownRequestError("duplicate", { code: "P2002", clientVersion: "test" });
    expect(isDuplicateRecruitmentApplicationError(duplicate)).toBe(true);
  });
});
