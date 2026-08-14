import { describe, expect, it } from "vitest";
import { isRequestOverdue } from "../../../src/modules/requests";

describe("isRequestOverdue", () => {
  const now = new Date("2026-08-15T12:00:00Z");

  it("is false with no deadline", () => {
    expect(isRequestOverdue({ deadline: null, status: "IN_PROGRESS" }, now)).toBe(false);
  });

  it("is true once the deadline has passed and the request is still open", () => {
    expect(isRequestOverdue({ deadline: new Date("2026-08-15T00:00:00Z"), status: "ASSIGNED" }, now)).toBe(true);
  });

  it("is false once completed or closed, even past the deadline", () => {
    expect(isRequestOverdue({ deadline: new Date("2026-08-15T00:00:00Z"), status: "COMPLETED" }, now)).toBe(false);
    expect(isRequestOverdue({ deadline: new Date("2026-08-15T00:00:00Z"), status: "CLOSED" }, now)).toBe(false);
  });
});
