import { describe, expect, it } from "vitest";
import { canCreateAnnouncement, canManageAnnouncement, canViewAnnouncement } from "../../../src/modules/announcements/domain/permissions";
import type { AuthenticatedActor } from "../../../src/modules/auth";

const SECRETARY: AuthenticatedActor = { userId: "sec-1", role: "SECRETARY" };
const UNPRIVILEGED_COORDINATOR: AuthenticatedActor = { userId: "coord-1", role: "COORDINATOR", batchScope: [], permissions: [] };
const MANAGE_COORDINATOR: AuthenticatedActor = { userId: "coord-2", role: "COORDINATOR", batchScope: [], permissions: ["announcements.manage"] };
const AUTHOR: AuthenticatedActor = { userId: "author-1", role: "COORDINATOR", batchScope: [], permissions: [] };
const STUDENT: AuthenticatedActor = { userId: "stu-1", role: "STUDENT", studentProfileId: "sp-1" };

const ACTIVE_ANNOUNCEMENT = {
  authorId: "author-1",
  audienceType: "EVERYONE" as const,
  audienceValue: null,
  publishAt: new Date("2020-01-01T00:00:00Z"),
  expiresAt: null,
};
// canViewAnnouncement/isAnnouncementActive default `now` to the real wall
// clock (no injectable clock) — a genuinely far-future date keeps this
// "not yet published" no matter when the suite actually runs.
const DRAFT_FUTURE_ANNOUNCEMENT = { ...ACTIVE_ANNOUNCEMENT, publishAt: new Date("2099-01-01T00:00:00Z") };

describe("canCreateAnnouncement", () => {
  it("allows Secretary and a Coordinator delegated announcements.manage", () => {
    expect(canCreateAnnouncement(SECRETARY)).toBe(true);
    expect(canCreateAnnouncement(MANAGE_COORDINATOR)).toBe(true);
  });

  it("denies an unprivileged Coordinator or a Student", () => {
    expect(canCreateAnnouncement(UNPRIVILEGED_COORDINATOR)).toBe(false);
    expect(canCreateAnnouncement(STUDENT)).toBe(false);
  });
});

describe("canManageAnnouncement", () => {
  it("allows Secretary, a Coordinator with announcements.manage, and the author", () => {
    expect(canManageAnnouncement(SECRETARY, ACTIVE_ANNOUNCEMENT)).toBe(true);
    expect(canManageAnnouncement(MANAGE_COORDINATOR, ACTIVE_ANNOUNCEMENT)).toBe(true);
    expect(canManageAnnouncement(AUTHOR, ACTIVE_ANNOUNCEMENT)).toBe(true);
  });

  it("denies an unrelated Coordinator", () => {
    expect(canManageAnnouncement(UNPRIVILEGED_COORDINATOR, ACTIVE_ANNOUNCEMENT)).toBe(false);
  });
});

describe("canViewAnnouncement", () => {
  it("whoever manages it can view it even before publishAt (still editing a future-dated draft)", () => {
    expect(canViewAnnouncement(AUTHOR, DRAFT_FUTURE_ANNOUNCEMENT, { batchId: null, isSelectedRecipient: false, committeeIds: [], isCouncilMember: false })).toBe(true);
  });

  it("a matched, active audience member can view it", () => {
    expect(canViewAnnouncement(STUDENT, ACTIVE_ANNOUNCEMENT, { batchId: null, isSelectedRecipient: false, committeeIds: [], isCouncilMember: false })).toBe(true);
  });

  it("denies viewing a future-dated announcement for a non-manager, even if they'd match the audience", () => {
    expect(canViewAnnouncement(STUDENT, DRAFT_FUTURE_ANNOUNCEMENT, { batchId: null, isSelectedRecipient: false, committeeIds: [], isCouncilMember: false })).toBe(false);
  });
});
