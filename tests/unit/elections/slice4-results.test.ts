import { Prisma } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { positionSchema } from "../../../src/modules/elections/domain/election";
import { computePositionResult } from "../../../src/modules/elections/domain/results";

const decimal = (value: number) => new Prisma.Decimal(value);
const candidates = [
  { id: "a", name: "Candidate A" },
  { id: "b", name: "Candidate B" },
];
function group(
  voterGroup: "STUDENT" | "FACULTY" | "EX_COUNCIL",
  votes: [number, number],
  overrides: Partial<{
    eligibleCount: number;
    participationCount: number;
    abstentionCount: number;
    notaVoteCount: number;
    quorumPercent: number;
    configuredWeight: number;
  }> = {},
) {
  return {
    voterGroup,
    eligibleCount: 10,
    participationCount: 10,
    abstentionCount: 0,
    notaVoteCount: 0,
    quorumPercent: decimal(0),
    configuredWeight: decimal(100 / 3),
    candidateVotes: new Map([
      ["a", votes[0]],
      ["b", votes[1]],
    ]),
    ...Object.fromEntries(
      Object.entries(overrides).map(([key, value]) =>
        key === "quorumPercent" || key === "configuredWeight" ? [key, decimal(value as number)] : [key, value],
      ),
    ),
  };
}

describe("Slice 4 Council result calculation", () => {
  it("accepts one Council seat and rejects multi-seat Council configuration", () => {
    expect(positionSchema.parse({ title: "President", seats: 1 })).toMatchObject({ seats: 1 });
    expect(() => positionSchema.parse({ title: "President", seats: 2 })).toThrow(
      "Council election positions require one seat",
    );
  });
  it("normalizes groups before applying configured weights", () => {
    const result = computePositionResult(candidates, [
      group("STUDENT", [90, 10], { configuredWeight: 60 }),
      group("FACULTY", [1, 0], { configuredWeight: 25, eligibleCount: 1, participationCount: 1 }),
      group("EX_COUNCIL", [0, 1], { configuredWeight: 15, eligibleCount: 1, participationCount: 1 }),
    ]);
    expect(result.candidates.find((candidate) => candidate.id === "a")!.finalScore.toFixed(2)).toBe("0.79");
    expect(result.candidates.find((candidate) => candidate.id === "b")!.finalScore.toFixed(2)).toBe("0.21");
    expect(result.status).toBe("WINNER_PENDING_VERIFICATION");
  });
  it("counts abstentions for quorum but excludes them from scoring denominators", () => {
    const result = computePositionResult(candidates, [
      group("STUDENT", [3, 1], { abstentionCount: 6, participationCount: 10, configuredWeight: 100 }),
      group("FACULTY", [0, 0], { eligibleCount: 0, participationCount: 0, configuredWeight: 0 }),
      group("EX_COUNCIL", [0, 0], { eligibleCount: 0, participationCount: 0, configuredWeight: 0 }),
    ]);
    expect(result.groups[0]!.scoringDenominator).toBe(4);
    expect(result.groups[0]!.abstentionCount).toBe(6);
    expect(result.candidates.find((candidate) => candidate.id === "a")!.finalScore.toFixed(2)).toBe("0.75");
  });
  it("does not redistribute a zero-denominator group weight", () => {
    const result = computePositionResult(candidates, [
      group("STUDENT", [1, 0], { configuredWeight: 60 }),
      group("FACULTY", [0, 0], { configuredWeight: 40, eligibleCount: 10, participationCount: 10 }),
      group("EX_COUNCIL", [0, 0], { configuredWeight: 0, eligibleCount: 0, participationCount: 0 }),
    ]);
    expect(result.candidates.find((candidate) => candidate.id === "a")!.finalScore.toFixed(2)).toBe("0.60");
  });
  it("records NOTA and ties as non-winner outcomes", () => {
    const nota = computePositionResult(candidates, [
      group("STUDENT", [1, 1], { notaVoteCount: 8, configuredWeight: 100 }),
      group("FACULTY", [0, 0], { configuredWeight: 0, eligibleCount: 0, participationCount: 0 }),
      group("EX_COUNCIL", [0, 0], { configuredWeight: 0, eligibleCount: 0, participationCount: 0 }),
    ]);
    expect(nota.status).toBe("NOTA_WON");
    const tied = computePositionResult(candidates, [
      group("STUDENT", [1, 1], { configuredWeight: 100 }),
      group("FACULTY", [0, 0], { configuredWeight: 0, eligibleCount: 0, participationCount: 0 }),
      group("EX_COUNCIL", [0, 0], { configuredWeight: 0, eligibleCount: 0, participationCount: 0 }),
    ]);
    expect(tied.status).toBe("RUNOFF_REQUIRED");
  });
  it("fails required quorum and compares authoritative fixed precision", () => {
    const quorum = computePositionResult(candidates, [
      group("STUDENT", [1, 0], { eligibleCount: 10, participationCount: 4, quorumPercent: 50, configuredWeight: 100 }),
      group("FACULTY", [0, 0], { configuredWeight: 0, eligibleCount: 0, participationCount: 0 }),
      group("EX_COUNCIL", [0, 0], { configuredWeight: 0, eligibleCount: 0, participationCount: 0 }),
    ]);
    expect(quorum.status).toBe("QUORUM_FAILED");
    const precise = computePositionResult(candidates, [
      group("STUDENT", [2, 1], { configuredWeight: 50 }),
      group("FACULTY", [1, 2], { configuredWeight: 50 }),
      group("EX_COUNCIL", [0, 0], { configuredWeight: 0, eligibleCount: 0, participationCount: 0 }),
    ]);
    expect(precise.status).toBe("RUNOFF_REQUIRED");
    expect(precise.candidates[0]!.finalScore.equals(precise.candidates[1]!.finalScore)).toBe(true);
  });
});
