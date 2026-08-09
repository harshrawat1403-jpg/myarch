import { describe, expect, it } from "vitest";
import { isValidApplicationStatusTransition } from "../../../src/modules/placements/domain/application-lifecycle";

describe("isValidApplicationStatusTransition", () => {
  it("walks the placement pipeline forward: APPLIED → SHORTLISTED → INTERVIEW → OFFER → ACCEPTED", () => {
    expect(isValidApplicationStatusTransition("APPLIED", "SHORTLISTED", "PLACEMENT")).toBe(true);
    expect(isValidApplicationStatusTransition("SHORTLISTED", "INTERVIEW", "PLACEMENT")).toBe(true);
    expect(isValidApplicationStatusTransition("INTERVIEW", "OFFER", "PLACEMENT")).toBe(true);
    expect(isValidApplicationStatusTransition("OFFER", "ACCEPTED", "PLACEMENT")).toBe(true);
  });

  it("never allows skipping a stage", () => {
    expect(isValidApplicationStatusTransition("APPLIED", "INTERVIEW", "PLACEMENT")).toBe(false);
    expect(isValidApplicationStatusTransition("APPLIED", "OFFER", "PLACEMENT")).toBe(false);
  });

  it("allows REJECTED or WITHDRAWN as an exit from any non-terminal state", () => {
    for (const from of ["APPLIED", "SHORTLISTED", "INTERVIEW", "OFFER"] as const) {
      expect(isValidApplicationStatusTransition(from, "REJECTED", "PLACEMENT")).toBe(true);
      expect(isValidApplicationStatusTransition(from, "WITHDRAWN", "PLACEMENT")).toBe(true);
    }
  });

  it("never allows a transition out of a terminal state", () => {
    for (const from of ["REJECTED", "COMPLETED", "WITHDRAWN"] as const) {
      expect(isValidApplicationStatusTransition(from, "APPLIED", "PLACEMENT")).toBe(false);
    }
  });

  it("allows ACCEPTED → ACTIVE → COMPLETED only for an INTERNSHIP drive", () => {
    expect(isValidApplicationStatusTransition("ACCEPTED", "ACTIVE", "INTERNSHIP")).toBe(true);
    expect(isValidApplicationStatusTransition("ACTIVE", "COMPLETED", "INTERNSHIP")).toBe(true);
    expect(isValidApplicationStatusTransition("ACCEPTED", "ACTIVE", "PLACEMENT")).toBe(false);
  });

  it("still allows withdrawing after ACCEPTED", () => {
    expect(isValidApplicationStatusTransition("ACCEPTED", "WITHDRAWN", "PLACEMENT")).toBe(true);
  });
});
