import { describe, expect, it } from "vitest";
import {
  assertSelectionTransition,
  coreCommitteeSelectionConfigSchema,
} from "../../../src/modules/selections/domain/core-committee-selection";

describe("Core Committee selection lifecycle", () => {
  it("uses the Council-led selection lifecycle and has no voting stage", () => {
    const path = [
      "APPLICATION_OPEN",
      "APPLICATION_CLOSED",
      "SCRUTINY",
      "CORRECTIONS",
      "SHORTLIST",
      "INTERVIEWS",
      "COUNCIL_REVIEW",
      "SELECTION_DECIDED",
      "PUBLISHED",
      "MEMBERSHIP_CONFIRMED",
      "ARCHIVED",
    ] as const;
    let current: Parameters<typeof assertSelectionTransition>[0] = "DRAFT";
    for (const next of path) {
      expect(() => assertSelectionTransition(current, next)).not.toThrow();
      current = next;
    }
    expect(() => assertSelectionTransition("COUNCIL_REVIEW", "VOTING" as never)).toThrow();
  });
  it("accepts selection configuration without voter groups, quorum, ballots, or weights", () => {
    const result = coreCommitteeSelectionConfigSchema.safeParse({
      title: "Core Committee 2026",
      brief: "A Council-led recruitment workflow.",
      academicYear: "2026-2027",
      applicationOpenAt: "2026-09-10T00:00:00Z",
      applicationCloseAt: "2026-09-20T00:00:00Z",
    });
    expect(result.success).toBe(true);
    expect(result.success && Object.keys(result.data)).not.toContain("studentQuorumPercent");
  });
});
