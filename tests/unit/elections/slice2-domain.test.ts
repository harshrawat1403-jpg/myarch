import { describe, expect, it } from "vitest";
import { assertTransition, ElectionError } from "../../../src/modules/elections/domain/election";

describe("Slice 2 election lifecycle", () => {
  it("permits the server-side processing sequence after applications close", () => {
    expect(() => assertTransition("APPLICATION_CLOSED", "SCRUTINY")).not.toThrow();
    expect(() => assertTransition("SCRUTINY", "CORRECTIONS_OBJECTIONS")).not.toThrow();
    expect(() => assertTransition("CORRECTIONS_OBJECTIONS", "SHORTLIST")).not.toThrow();
    expect(() => assertTransition("SHORTLIST", "INTERVIEWS")).not.toThrow();
    expect(() => assertTransition("INTERVIEWS", "FINAL_CANDIDATES")).not.toThrow();
  });
  it("rejects skipped, repeated, and post-final workflow transitions", () => {
    for (const [from, to] of [["APPLICATION_CLOSED", "SHORTLIST"], ["SCRUTINY", "SCRUTINY"], ["FINAL_CANDIDATES", "INTERVIEWS"]] as const)
      expect(() => assertTransition(from, to)).toThrow(ElectionError);
  });
});
