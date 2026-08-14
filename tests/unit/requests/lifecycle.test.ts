import { describe, expect, it } from "vitest";
import { isValidRequestTransition } from "../../../src/modules/requests/domain/lifecycle";

describe("isValidRequestTransition", () => {
  it("allows the documented §3.7 chain", () => {
    expect(isValidRequestTransition("SUBMITTED", "REVIEW")).toBe(true);
    expect(isValidRequestTransition("REVIEW", "ASSIGNED")).toBe(true);
    expect(isValidRequestTransition("ASSIGNED", "IN_PROGRESS")).toBe(true);
    expect(isValidRequestTransition("IN_PROGRESS", "COMPLETED")).toBe(true);
    expect(isValidRequestTransition("COMPLETED", "CLOSED")).toBe(true);
  });

  it("allows REVIEW straight to CLOSED — the rejection path", () => {
    expect(isValidRequestTransition("REVIEW", "CLOSED")).toBe(true);
  });

  it("rejects skipping steps", () => {
    expect(isValidRequestTransition("SUBMITTED", "ASSIGNED")).toBe(false);
    expect(isValidRequestTransition("SUBMITTED", "COMPLETED")).toBe(false);
  });

  it("treats CLOSED as terminal", () => {
    expect(isValidRequestTransition("CLOSED", "SUBMITTED")).toBe(false);
  });
});
