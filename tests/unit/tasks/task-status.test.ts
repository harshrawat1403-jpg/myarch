import { describe, expect, it } from "vitest";
import { isValidTaskStatusTransition } from "../../../src/modules/tasks/domain/task-status";

describe("isValidTaskStatusTransition", () => {
  it("allows the documented forward transitions", () => {
    expect(isValidTaskStatusTransition("TODO", "IN_PROGRESS")).toBe(true);
    expect(isValidTaskStatusTransition("TODO", "BLOCKED")).toBe(true);
    expect(isValidTaskStatusTransition("TODO", "CANCELLED")).toBe(true);
    expect(isValidTaskStatusTransition("IN_PROGRESS", "BLOCKED")).toBe(true);
    expect(isValidTaskStatusTransition("IN_PROGRESS", "DONE")).toBe(true);
    expect(isValidTaskStatusTransition("IN_PROGRESS", "CANCELLED")).toBe(true);
    expect(isValidTaskStatusTransition("BLOCKED", "IN_PROGRESS")).toBe(true);
    expect(isValidTaskStatusTransition("BLOCKED", "CANCELLED")).toBe(true);
  });

  it("rejects skipping straight to DONE from TODO", () => {
    expect(isValidTaskStatusTransition("TODO", "DONE")).toBe(false);
  });

  it("rejects BLOCKED straight to DONE", () => {
    expect(isValidTaskStatusTransition("BLOCKED", "DONE")).toBe(false);
  });

  it("treats DONE and CANCELLED as terminal — no forward transition escapes them", () => {
    expect(isValidTaskStatusTransition("DONE", "TODO")).toBe(false);
    expect(isValidTaskStatusTransition("DONE", "IN_PROGRESS")).toBe(false);
    expect(isValidTaskStatusTransition("CANCELLED", "TODO")).toBe(false);
    expect(isValidTaskStatusTransition("CANCELLED", "IN_PROGRESS")).toBe(false);
  });
});
