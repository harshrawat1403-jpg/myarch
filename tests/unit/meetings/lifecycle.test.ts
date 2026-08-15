import { describe, expect, it } from "vitest";
import { isValidMeetingTransition } from "../../../src/modules/meetings/domain/lifecycle";

describe("isValidMeetingTransition", () => {
  it("allows SCHEDULED -> COMPLETED or CANCELLED", () => {
    expect(isValidMeetingTransition("SCHEDULED", "COMPLETED")).toBe(true);
    expect(isValidMeetingTransition("SCHEDULED", "CANCELLED")).toBe(true);
  });

  it("rejects any transition out of a terminal state", () => {
    expect(isValidMeetingTransition("COMPLETED", "SCHEDULED")).toBe(false);
    expect(isValidMeetingTransition("CANCELLED", "COMPLETED")).toBe(false);
  });
});
