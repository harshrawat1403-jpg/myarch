import { describe, expect, it } from "vitest";
import { isActorInAudience, isAnnouncementActive } from "../../../src/modules/announcements";

describe("isAnnouncementActive", () => {
  const now = new Date("2026-04-15T12:00:00Z");

  it("is false before publishAt", () => {
    expect(isAnnouncementActive({ publishAt: new Date("2026-05-01T00:00:00Z"), expiresAt: null }, now)).toBe(false);
  });

  it("is true once published with no expiry", () => {
    expect(isAnnouncementActive({ publishAt: new Date("2026-04-01T00:00:00Z"), expiresAt: null }, now)).toBe(true);
  });

  it("is false once expired", () => {
    expect(
      isAnnouncementActive({ publishAt: new Date("2026-04-01T00:00:00Z"), expiresAt: new Date("2026-04-10T00:00:00Z") }, now),
    ).toBe(false);
  });

  it("is true while published and not yet expired", () => {
    expect(
      isAnnouncementActive({ publishAt: new Date("2026-04-01T00:00:00Z"), expiresAt: new Date("2026-04-20T00:00:00Z") }, now),
    ).toBe(true);
  });
});

describe("isActorInAudience", () => {
  const noContext = { batchId: null, isSelectedRecipient: false };

  it("EVERYONE reaches everyone except Recruiter", () => {
    const announcement = { audienceType: "EVERYONE" as const, audienceValue: null };
    expect(isActorInAudience({ userId: "u1", role: "STUDENT" }, announcement, noContext)).toBe(true);
    expect(isActorInAudience({ userId: "u2", role: "ALUMNI" }, announcement, noContext)).toBe(true);
    expect(isActorInAudience({ userId: "u3", role: "RECRUITER" }, announcement, noContext)).toBe(false);
  });

  it("COORDINATORS reaches Coordinator and Secretary only", () => {
    const announcement = { audienceType: "COORDINATORS" as const, audienceValue: null };
    expect(isActorInAudience({ userId: "u1", role: "COORDINATOR" }, announcement, noContext)).toBe(true);
    expect(isActorInAudience({ userId: "u2", role: "SECRETARY" }, announcement, noContext)).toBe(true);
    expect(isActorInAudience({ userId: "u3", role: "STUDENT" }, announcement, noContext)).toBe(false);
  });

  it("YEAR reaches only a Student in the matching batch", () => {
    const announcement = { audienceType: "YEAR" as const, audienceValue: "batch-2026" };
    expect(isActorInAudience({ userId: "u1", role: "STUDENT" }, announcement, { batchId: "batch-2026", isSelectedRecipient: false })).toBe(true);
    expect(isActorInAudience({ userId: "u2", role: "STUDENT" }, announcement, { batchId: "batch-2025", isSelectedRecipient: false })).toBe(false);
    expect(isActorInAudience({ userId: "u3", role: "COORDINATOR" }, announcement, { batchId: "batch-2026", isSelectedRecipient: false })).toBe(false);
  });

  it("SELECTED_GROUP reaches only an explicit recipient", () => {
    const announcement = { audienceType: "SELECTED_GROUP" as const, audienceValue: null };
    expect(isActorInAudience({ userId: "u1", role: "STUDENT" }, announcement, { batchId: null, isSelectedRecipient: true })).toBe(true);
    expect(isActorInAudience({ userId: "u2", role: "STUDENT" }, announcement, noContext)).toBe(false);
  });

  it("PROGRAM/COMMITTEE/COUNCIL never resolve — no backing entity yet", () => {
    for (const audienceType of ["PROGRAM", "COMMITTEE", "COUNCIL"] as const) {
      expect(isActorInAudience({ userId: "u1", role: "SECRETARY" }, { audienceType, audienceValue: null }, noContext)).toBe(false);
    }
  });
});
