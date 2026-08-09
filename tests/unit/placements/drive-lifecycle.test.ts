import { describe, expect, it } from "vitest";
import { isDriveOpenForApplications, isValidDriveStatusTransition } from "../../../src/modules/placements/domain/drive-lifecycle";

describe("isValidDriveStatusTransition", () => {
  it("allows DRAFT to ANNOUNCED (publish)", () => {
    expect(isValidDriveStatusTransition("DRAFT", "ANNOUNCED")).toBe(true);
  });

  it("allows ANNOUNCED to IN_PROGRESS or CLOSED", () => {
    expect(isValidDriveStatusTransition("ANNOUNCED", "IN_PROGRESS")).toBe(true);
    expect(isValidDriveStatusTransition("ANNOUNCED", "CLOSED")).toBe(true);
  });

  it("allows IN_PROGRESS to CLOSED only", () => {
    expect(isValidDriveStatusTransition("IN_PROGRESS", "CLOSED")).toBe(true);
    expect(isValidDriveStatusTransition("IN_PROGRESS", "ANNOUNCED")).toBe(false);
  });

  it("never allows moving out of CLOSED, or skipping backward", () => {
    expect(isValidDriveStatusTransition("CLOSED", "ANNOUNCED")).toBe(false);
    expect(isValidDriveStatusTransition("ANNOUNCED", "DRAFT")).toBe(false);
    expect(isValidDriveStatusTransition("DRAFT", "IN_PROGRESS")).toBe(false);
  });
});

describe("isDriveOpenForApplications", () => {
  it("is open for ANNOUNCED and IN_PROGRESS only", () => {
    expect(isDriveOpenForApplications("ANNOUNCED")).toBe(true);
    expect(isDriveOpenForApplications("IN_PROGRESS")).toBe(true);
    expect(isDriveOpenForApplications("DRAFT")).toBe(false);
    expect(isDriveOpenForApplications("CLOSED")).toBe(false);
  });
});
