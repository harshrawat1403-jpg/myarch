import { describe, expect, it } from "vitest";
import { isTaskOverdue, isTerminalTaskStatus } from "../../../src/modules/tasks";

describe("isTaskOverdue", () => {
  const now = new Date("2026-08-14T12:00:00Z");

  it("is false when there is no deadline", () => {
    expect(isTaskOverdue({ deadline: null, status: "TODO" }, now)).toBe(false);
  });

  it("is true once the deadline has passed and the task is still active", () => {
    expect(isTaskOverdue({ deadline: new Date("2026-08-14T00:00:00Z"), status: "IN_PROGRESS" }, now)).toBe(true);
  });

  it("is false while the deadline is still in the future", () => {
    expect(isTaskOverdue({ deadline: new Date("2026-08-15T00:00:00Z"), status: "IN_PROGRESS" }, now)).toBe(false);
  });

  it("is false for a DONE task even past its deadline", () => {
    expect(isTaskOverdue({ deadline: new Date("2026-08-14T00:00:00Z"), status: "DONE" }, now)).toBe(false);
  });

  it("is false for a CANCELLED task even past its deadline", () => {
    expect(isTaskOverdue({ deadline: new Date("2026-08-14T00:00:00Z"), status: "CANCELLED" }, now)).toBe(false);
  });
});

describe("isTerminalTaskStatus", () => {
  it("is true only for DONE and CANCELLED", () => {
    expect(isTerminalTaskStatus("DONE")).toBe(true);
    expect(isTerminalTaskStatus("CANCELLED")).toBe(true);
    expect(isTerminalTaskStatus("TODO")).toBe(false);
    expect(isTerminalTaskStatus("IN_PROGRESS")).toBe(false);
    expect(isTerminalTaskStatus("BLOCKED")).toBe(false);
  });
});
