import { describe, expect, it } from "vitest";
import { isValidEventTransition } from "../../../src/modules/events/domain/lifecycle";

describe("isValidEventTransition", () => {
  it("allows DRAFT -> PUBLISHED -> COMPLETED", () => {
    expect(isValidEventTransition("DRAFT", "PUBLISHED")).toBe(true);
    expect(isValidEventTransition("PUBLISHED", "COMPLETED")).toBe(true);
  });

  it("allows CANCELLED from DRAFT or PUBLISHED", () => {
    expect(isValidEventTransition("DRAFT", "CANCELLED")).toBe(true);
    expect(isValidEventTransition("PUBLISHED", "CANCELLED")).toBe(true);
  });

  it("rejects skipping straight to COMPLETED from DRAFT", () => {
    expect(isValidEventTransition("DRAFT", "COMPLETED")).toBe(false);
  });

  it("rejects any transition out of a terminal state", () => {
    expect(isValidEventTransition("COMPLETED", "PUBLISHED")).toBe(false);
    expect(isValidEventTransition("CANCELLED", "DRAFT")).toBe(false);
  });
});
