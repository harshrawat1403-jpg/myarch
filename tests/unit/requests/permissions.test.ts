import { describe, expect, it } from "vitest";
import { canManageRequest, canSubmitRequest, canViewRequest } from "../../../src/modules/requests/domain/permissions";
import type { AuthenticatedActor } from "../../../src/modules/auth";

const SECRETARY: AuthenticatedActor = { userId: "sec-1", role: "SECRETARY" };
const UNPRIVILEGED_COORDINATOR: AuthenticatedActor = { userId: "coord-1", role: "COORDINATOR", batchScope: [], permissions: [] };
const MANAGE_COORDINATOR: AuthenticatedActor = { userId: "coord-2", role: "COORDINATOR", batchScope: [], permissions: ["requests.manage"] };
const VIEW_COORDINATOR: AuthenticatedActor = { userId: "coord-3", role: "COORDINATOR", batchScope: [], permissions: ["requests.view"] };
const STUDENT: AuthenticatedActor = { userId: "stu-1", role: "STUDENT", studentProfileId: "sp-1" };
const OTHER_STUDENT: AuthenticatedActor = { userId: "stu-2", role: "STUDENT", studentProfileId: "sp-2" };

const REQUEST = { requesterId: "stu-1", ownerId: "coord-2" };

describe("canSubmitRequest", () => {
  it("allows Secretary/Coordinator/Student, denies Recruiter", () => {
    expect(canSubmitRequest(SECRETARY)).toBe(true);
    expect(canSubmitRequest(UNPRIVILEGED_COORDINATOR)).toBe(true);
    expect(canSubmitRequest(STUDENT)).toBe(true);
    expect(canSubmitRequest({ userId: "rec-1", role: "RECRUITER" })).toBe(false);
  });
});

describe("canViewRequest", () => {
  it("Secretary and requests.view Coordinator see any request", () => {
    expect(canViewRequest(SECRETARY, REQUEST)).toBe(true);
    expect(canViewRequest(VIEW_COORDINATOR, REQUEST)).toBe(true);
  });

  it("an unprivileged Coordinator sees only requests they own", () => {
    expect(canViewRequest(MANAGE_COORDINATOR, REQUEST)).toBe(true);
    expect(canViewRequest(UNPRIVILEGED_COORDINATOR, REQUEST)).toBe(false);
  });

  it("the requester can view their own request; a different Student cannot", () => {
    expect(canViewRequest(STUDENT, REQUEST)).toBe(true);
    expect(canViewRequest(OTHER_STUDENT, REQUEST)).toBe(false);
  });
});

describe("canManageRequest", () => {
  it("Secretary, requests.manage Coordinator, and the owning Coordinator can manage", () => {
    expect(canManageRequest(SECRETARY, REQUEST)).toBe(true);
    expect(canManageRequest(MANAGE_COORDINATOR, REQUEST)).toBe(true);
    expect(canManageRequest({ userId: "coord-2", role: "COORDINATOR", batchScope: [], permissions: [] }, REQUEST)).toBe(true);
  });

  it("denies an unrelated, unprivileged Coordinator or a Student", () => {
    expect(canManageRequest(UNPRIVILEGED_COORDINATOR, REQUEST)).toBe(false);
    expect(canManageRequest(STUDENT, REQUEST)).toBe(false);
  });
});
