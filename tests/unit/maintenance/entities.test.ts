import { describe, expect, it } from "vitest";
import { isCriticalMaintenancePriority, isMaintenanceIssueOverdue } from "../../../src/modules/maintenance";

describe("isMaintenanceIssueOverdue", () => {
  const now = new Date("2026-08-15T12:00:00Z");

  it("is false with no deadline", () => {
    expect(isMaintenanceIssueOverdue({ deadline: null, status: "IN_PROGRESS" }, now)).toBe(false);
  });

  it("is true once the deadline has passed and it's still open", () => {
    expect(isMaintenanceIssueOverdue({ deadline: new Date("2026-08-15T00:00:00Z"), status: "ASSIGNED" }, now)).toBe(true);
  });

  it("is false once resolved, verified, or closed, even past the deadline", () => {
    for (const status of ["RESOLVED", "VERIFIED", "CLOSED"] as const) {
      expect(isMaintenanceIssueOverdue({ deadline: new Date("2026-08-15T00:00:00Z"), status }, now)).toBe(false);
    }
  });
});

describe("isCriticalMaintenancePriority", () => {
  it("is true only for URGENT", () => {
    expect(isCriticalMaintenancePriority("URGENT")).toBe(true);
    expect(isCriticalMaintenancePriority("HIGH")).toBe(false);
    expect(isCriticalMaintenancePriority("MEDIUM")).toBe(false);
    expect(isCriticalMaintenancePriority("LOW")).toBe(false);
  });
});
