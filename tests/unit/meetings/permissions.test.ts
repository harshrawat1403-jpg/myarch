import { describe, expect, it } from "vitest";
import { canCreateMeeting, canManageMeeting, canViewMeeting } from "../../../src/modules/meetings/domain/permissions";
import type { AuthenticatedActor } from "../../../src/modules/auth";

const SECRETARY: AuthenticatedActor = { userId: "sec-1", role: "SECRETARY" };
const UNPRIVILEGED_COORDINATOR: AuthenticatedActor = { userId: "coord-1", role: "COORDINATOR", batchScope: [], permissions: [] };
const MANAGE_COORDINATOR: AuthenticatedActor = { userId: "coord-2", role: "COORDINATOR", batchScope: [], permissions: ["meetings.manage"] };
const ORGANIZER: AuthenticatedActor = { userId: "organizer-1", role: "COORDINATOR", batchScope: [], permissions: [] };
const STUDENT: AuthenticatedActor = { userId: "stu-1", role: "STUDENT", studentProfileId: "sp-1" };

const MEETING = { organizerId: "organizer-1" };

describe("canCreateMeeting", () => {
  it("allows Secretary and a Coordinator delegated meetings.manage", () => {
    expect(canCreateMeeting(SECRETARY)).toBe(true);
    expect(canCreateMeeting(MANAGE_COORDINATOR)).toBe(true);
  });

  it("denies an unprivileged Coordinator or a Student", () => {
    expect(canCreateMeeting(UNPRIVILEGED_COORDINATOR)).toBe(false);
    expect(canCreateMeeting(STUDENT)).toBe(false);
  });
});

describe("canManageMeeting", () => {
  it("allows Secretary, a Coordinator with meetings.manage, and the organizer", () => {
    expect(canManageMeeting(SECRETARY, MEETING)).toBe(true);
    expect(canManageMeeting(MANAGE_COORDINATOR, MEETING)).toBe(true);
    expect(canManageMeeting(ORGANIZER, MEETING)).toBe(true);
  });

  it("denies an unrelated Coordinator without meetings.manage", () => {
    expect(canManageMeeting(UNPRIVILEGED_COORDINATOR, MEETING)).toBe(false);
  });
});

describe("canViewMeeting — no public/published state, unlike Events", () => {
  it("management implies view", () => {
    expect(canViewMeeting(SECRETARY, MEETING, false)).toBe(true);
    expect(canViewMeeting(ORGANIZER, MEETING, false)).toBe(true);
  });

  it("a listed participant may view even without managing", () => {
    expect(canViewMeeting(STUDENT, MEETING, true)).toBe(true);
  });

  it("an unrelated, non-participant actor cannot view", () => {
    expect(canViewMeeting(STUDENT, MEETING, false)).toBe(false);
    expect(canViewMeeting(UNPRIVILEGED_COORDINATOR, MEETING, false)).toBe(false);
  });
});
