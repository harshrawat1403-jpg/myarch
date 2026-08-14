import { describe, expect, it } from "vitest";
import { isValidMaintenanceIssueTransition } from "../../../src/modules/maintenance/domain/lifecycle";

describe("isValidMaintenanceIssueTransition", () => {
  it("allows the documented §3.3 chain", () => {
    expect(isValidMaintenanceIssueTransition("SUBMITTED", "ACKNOWLEDGED")).toBe(true);
    expect(isValidMaintenanceIssueTransition("ACKNOWLEDGED", "ASSIGNED")).toBe(true);
    expect(isValidMaintenanceIssueTransition("ASSIGNED", "IN_PROGRESS")).toBe(true);
    expect(isValidMaintenanceIssueTransition("IN_PROGRESS", "RESOLVED")).toBe(true);
    expect(isValidMaintenanceIssueTransition("RESOLVED", "VERIFIED")).toBe(true);
    expect(isValidMaintenanceIssueTransition("VERIFIED", "CLOSED")).toBe(true);
  });

  it("rejects skipping steps", () => {
    expect(isValidMaintenanceIssueTransition("SUBMITTED", "ASSIGNED")).toBe(false);
    expect(isValidMaintenanceIssueTransition("SUBMITTED", "RESOLVED")).toBe(false);
    expect(isValidMaintenanceIssueTransition("ACKNOWLEDGED", "IN_PROGRESS")).toBe(false);
  });

  it("treats CLOSED as terminal — reopening is a distinct action, not a forward transition", () => {
    expect(isValidMaintenanceIssueTransition("CLOSED", "SUBMITTED")).toBe(false);
    expect(isValidMaintenanceIssueTransition("CLOSED", "REOPENED")).toBe(false);
  });

  it("REOPENED resumes at ASSIGNED or IN_PROGRESS, never back through ACKNOWLEDGED", () => {
    expect(isValidMaintenanceIssueTransition("REOPENED", "ASSIGNED")).toBe(true);
    expect(isValidMaintenanceIssueTransition("REOPENED", "IN_PROGRESS")).toBe(true);
    expect(isValidMaintenanceIssueTransition("REOPENED", "ACKNOWLEDGED")).toBe(false);
  });
});
