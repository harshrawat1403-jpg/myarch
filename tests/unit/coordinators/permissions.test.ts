import { describe, expect, it } from "vitest";
import {
  COORDINATOR_PERMISSION_KEYS,
  hasCoordinatorPermission,
  isCoordinatorPermissionKey,
} from "../../../src/modules/coordinators/domain/permissions";
import type { AuthenticatedActor } from "../../../src/modules/auth";

describe("hasCoordinatorPermission", () => {
  it("the Technical Secretary implicitly holds every capability, regardless of any stored grant", () => {
    const secretary: AuthenticatedActor = { userId: "sec-1", role: "SECRETARY" };
    for (const key of COORDINATOR_PERMISSION_KEYS) {
      expect(hasCoordinatorPermission(secretary, key)).toBe(true);
    }
  });

  it("a Coordinator with no delegated permissions has none", () => {
    const coordinator: AuthenticatedActor = { userId: "coord-1", role: "COORDINATOR", batchScope: [] };
    expect(hasCoordinatorPermission(coordinator, "maintenance.view")).toBe(false);
  });

  it("a Coordinator has exactly the capabilities delegated to them", () => {
    const coordinator: AuthenticatedActor = {
      userId: "coord-1",
      role: "COORDINATOR",
      batchScope: [],
      permissions: ["maintenance.view", "events.create"],
    };
    expect(hasCoordinatorPermission(coordinator, "maintenance.view")).toBe(true);
    expect(hasCoordinatorPermission(coordinator, "events.create")).toBe(true);
    expect(hasCoordinatorPermission(coordinator, "maintenance.manage")).toBe(false);
  });

  it("a Student/Recruiter/Alumni actor never holds a coordinator capability", () => {
    expect(hasCoordinatorPermission({ userId: "s-1", role: "STUDENT" }, "maintenance.view")).toBe(false);
    expect(hasCoordinatorPermission({ userId: "r-1", role: "RECRUITER" }, "maintenance.view")).toBe(false);
    expect(hasCoordinatorPermission({ userId: "a-1", role: "ALUMNI" }, "maintenance.view")).toBe(false);
  });
});

describe("isCoordinatorPermissionKey", () => {
  it("accepts every key in the canonical catalog", () => {
    for (const key of COORDINATOR_PERMISSION_KEYS) {
      expect(isCoordinatorPermissionKey(key)).toBe(true);
    }
  });

  it("rejects an unrecognized string", () => {
    expect(isCoordinatorPermissionKey("not.a.real.permission")).toBe(false);
  });
});
