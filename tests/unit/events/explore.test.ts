import { describe, expect, it } from "vitest";
import { derivePublicEventStatus, isValidEventSlug, slugifyEventTitle } from "../../../src/modules/events/domain/explore";

describe("Explore event presentation", () => {
  it("creates URL-safe stable slugs", () => {
    expect(slugifyEventTitle("Architecture Day 2026!")).toBe("architecture-day-2026");
    expect(isValidEventSlug("architecture-day-2026")).toBe(true);
    expect(isValidEventSlug("Architecture Day")).toBe(false);
  });

  it("derives public status from dates without changing Event lifecycle status", () => {
    const now = new Date("2026-09-06T12:00:00Z");
    expect(derivePublicEventStatus(new Date("2026-09-07T12:00:00Z"), null, now)).toBe("UPCOMING");
    expect(derivePublicEventStatus(new Date("2026-09-06T10:00:00Z"), new Date("2026-09-06T13:00:00Z"), now)).toBe("ONGOING");
    expect(derivePublicEventStatus(new Date("2026-09-05T10:00:00Z"), null, now)).toBe("COMPLETED");
  });
});
