import { describe, expect, it } from "vitest";
import {
  assertSelectionTransition,
  coreCommitteeSelectionConfigSchema,
  coreCommitteeSelectionPositionSchema,
  validateCoreCommitteeAnswers,
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
  it("accepts lightweight position questions and rejects duplicate keys within a position", () => {
    const question = {
      key: "motivation",
      label: "Why this domain?",
      type: "LONG_TEXT" as const,
      required: true,
      displayOrder: 0,
    };
    expect(
      coreCommitteeSelectionPositionSchema.safeParse({
        title: "Engineering",
        description: "Engineering domain",
        seats: 1,
        questions: [question],
      }).success,
    ).toBe(true);
    expect(
      coreCommitteeSelectionPositionSchema.safeParse({
        title: "Engineering",
        description: "Engineering domain",
        seats: 1,
        questions: [question, { ...question, label: "Second", displayOrder: 1 }],
      }).success,
    ).toBe(false);
  });
  it("rejects answers that do not belong to the selected position", () => {
    const questions = [
      {
        key: "motivation",
        label: "Motivation",
        type: "TEXT" as const,
        required: true,
        options: [],
        displayOrder: 0,
      },
    ];
    expect(() => validateCoreCommitteeAnswers(questions, { motivation: "Because" })).not.toThrow();
    expect(() => validateCoreCommitteeAnswers(questions, { other_domain: "leak" })).toThrow(
      "Unknown question for selected position",
    );
    expect(() => validateCoreCommitteeAnswers(questions, {})).toThrow("Motivation is required");
  });
});
