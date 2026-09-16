import { describe, expect, it } from "vitest";
import { calculateTalentProfileCompleteness } from "../../../src/modules/talent";

describe("Talent Profile completeness", () => {
  it("returns deterministic guidance without ranking or employability scoring", () => {
    const result = calculateTalentProfileCompleteness({
      hasPhoto: true,
      professionalHeadline: "Architectural designer",
      bio: "Design student",
      skillCount: 2,
      softwareCount: 1,
      projectCount: 2,
      hasResume: true,
      hasPortfolio: false,
      linkedInUrl: null,
    });
    expect(result.percentage).toBe(78);
    expect(result.missingRecommendedItems).toEqual(["portfolio", "LinkedIn"]);
  });
});
