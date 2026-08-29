import { describe, expect, it } from "vitest";
import type { AuthenticatedActor } from "../../../src/modules/auth";
import { canManageContentOverrides } from "../../../src/modules/content-overrides";

const SECRETARY: AuthenticatedActor = { userId: "sec-1", role: "SECRETARY" };
const COORDINATOR: AuthenticatedActor = { userId: "co-1", role: "COORDINATOR" };
const STUDENT: AuthenticatedActor = { userId: "stu-1", role: "STUDENT", studentProfileId: "sp-1" };

describe("canManageContentOverrides", () => {
  it("allows Secretary", () => {
    expect(canManageContentOverrides(SECRETARY)).toBe(true);
  });

  it("rejects Coordinator — Edit Mode is strictly SECRETARY-only, no delegated permission", () => {
    expect(canManageContentOverrides(COORDINATOR)).toBe(false);
  });

  it("rejects every other role", () => {
    expect(canManageContentOverrides(STUDENT)).toBe(false);
  });
});
