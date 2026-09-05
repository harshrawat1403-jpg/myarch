import { describe, expect, it } from "vitest";
import {
  assertTransition,
  assertVotingSchedule,
  ElectionError,
} from "../../../src/modules/elections/domain/election";

describe("Slice 3 Council voting lifecycle", () => {
  it("permits voting only after final candidates", () => {
    expect(() => assertTransition("FINAL_CANDIDATES", "VOTING")).not.toThrow();
    expect(() => assertTransition("INTERVIEWS", "VOTING")).toThrow(ElectionError);
  });
  it("requires a complete voting window", () => {
    expect(() => assertVotingSchedule({ votingOpenAt: null, votingCloseAt: null })).toThrow(
      "Configure a voting opening",
    );
    expect(() =>
      assertVotingSchedule({
        votingOpenAt: new Date("2026-09-10"),
        votingCloseAt: new Date("2026-09-09"),
      }),
    ).toThrow("opening must precede");
  });
});
