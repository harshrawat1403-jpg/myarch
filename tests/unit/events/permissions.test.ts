import { describe, expect, it } from "vitest";
import { canCreateEvent, canManageEvent, canRegisterForEvent, canViewEvent } from "../../../src/modules/events/domain/permissions";
import type { AuthenticatedActor } from "../../../src/modules/auth";

const SECRETARY: AuthenticatedActor = { userId: "sec-1", role: "SECRETARY" };
const UNPRIVILEGED_COORDINATOR: AuthenticatedActor = { userId: "coord-1", role: "COORDINATOR", batchScope: [], permissions: [] };
const MANAGE_COORDINATOR: AuthenticatedActor = { userId: "coord-2", role: "COORDINATOR", batchScope: [], permissions: ["events.manage"] };
const CREATE_COORDINATOR: AuthenticatedActor = { userId: "coord-3", role: "COORDINATOR", batchScope: [], permissions: ["events.create"] };
const VIEW_COORDINATOR: AuthenticatedActor = { userId: "coord-4", role: "COORDINATOR", batchScope: [], permissions: ["events.view"] };
const ORGANIZER_STUDENT: AuthenticatedActor = { userId: "organizer-1", role: "STUDENT", studentProfileId: "sp-1" };
const STUDENT: AuthenticatedActor = { userId: "stu-1", role: "STUDENT", studentProfileId: "sp-2" };
const RECRUITER: AuthenticatedActor = { userId: "rec-1", role: "RECRUITER" };
const ALUMNI: AuthenticatedActor = { userId: "al-1", role: "ALUMNI" };

const DRAFT_EVENT = { organizerId: "organizer-1", status: "DRAFT" as const };
const PUBLISHED_EVENT = { organizerId: "organizer-1", status: "PUBLISHED" as const };

describe("canCreateEvent", () => {
  it("allows Secretary and a Coordinator with events.create/manage", () => {
    expect(canCreateEvent(SECRETARY)).toBe(true);
    expect(canCreateEvent(CREATE_COORDINATOR)).toBe(true);
    expect(canCreateEvent(MANAGE_COORDINATOR)).toBe(true);
  });

  it("denies an unprivileged Coordinator or a Student", () => {
    expect(canCreateEvent(UNPRIVILEGED_COORDINATOR)).toBe(false);
    expect(canCreateEvent(STUDENT)).toBe(false);
  });
});

describe("canViewEvent", () => {
  it("a DRAFT event is visible to Secretary, the organizer, and a Coordinator with events.view/manage", () => {
    expect(canViewEvent(SECRETARY, DRAFT_EVENT)).toBe(true);
    expect(canViewEvent(ORGANIZER_STUDENT, DRAFT_EVENT)).toBe(true);
    expect(canViewEvent(VIEW_COORDINATOR, DRAFT_EVENT)).toBe(true);
    expect(canViewEvent(MANAGE_COORDINATOR, DRAFT_EVENT)).toBe(true);
  });

  it("a DRAFT event is invisible to everyone else", () => {
    expect(canViewEvent(STUDENT, DRAFT_EVENT)).toBe(false);
    expect(canViewEvent(UNPRIVILEGED_COORDINATOR, DRAFT_EVENT)).toBe(false);
    expect(canViewEvent(RECRUITER, DRAFT_EVENT)).toBe(false);
  });

  it("a PUBLISHED event is visible to everyone", () => {
    expect(canViewEvent(STUDENT, PUBLISHED_EVENT)).toBe(true);
    expect(canViewEvent(RECRUITER, PUBLISHED_EVENT)).toBe(true);
    expect(canViewEvent(ALUMNI, PUBLISHED_EVENT)).toBe(true);
  });
});

describe("canManageEvent", () => {
  it("allows Secretary, a Coordinator with events.manage, and the organizer", () => {
    expect(canManageEvent(SECRETARY, DRAFT_EVENT)).toBe(true);
    expect(canManageEvent(MANAGE_COORDINATOR, DRAFT_EVENT)).toBe(true);
    expect(canManageEvent(ORGANIZER_STUDENT, DRAFT_EVENT)).toBe(true);
  });

  it("denies an unrelated Coordinator without events.manage", () => {
    expect(canManageEvent(UNPRIVILEGED_COORDINATOR, DRAFT_EVENT)).toBe(false);
    expect(canManageEvent(CREATE_COORDINATOR, DRAFT_EVENT)).toBe(false);
  });
});

describe("canRegisterForEvent", () => {
  it("allows Student and Alumni only", () => {
    expect(canRegisterForEvent(STUDENT)).toBe(true);
    expect(canRegisterForEvent(ALUMNI)).toBe(true);
  });

  it("denies Secretary, Coordinator, and Recruiter", () => {
    expect(canRegisterForEvent(SECRETARY)).toBe(false);
    expect(canRegisterForEvent(MANAGE_COORDINATOR)).toBe(false);
    expect(canRegisterForEvent(RECRUITER)).toBe(false);
  });
});
