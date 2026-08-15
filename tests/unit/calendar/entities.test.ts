import { describe, expect, it } from "vitest";
import { calendarRangeSpanDays, isValidCalendarRange } from "../../../src/modules/calendar";

describe("isValidCalendarRange", () => {
  it("accepts from before or equal to to", () => {
    const from = new Date("2026-01-01T00:00:00Z");
    expect(isValidCalendarRange({ from, to: new Date("2026-01-31T00:00:00Z") })).toBe(true);
    expect(isValidCalendarRange({ from, to: from })).toBe(true);
  });

  it("rejects from after to", () => {
    expect(
      isValidCalendarRange({ from: new Date("2026-02-01T00:00:00Z"), to: new Date("2026-01-01T00:00:00Z") }),
    ).toBe(false);
  });
});

describe("calendarRangeSpanDays", () => {
  it("computes the number of days between from and to", () => {
    const from = new Date("2026-01-01T00:00:00Z");
    const to = new Date("2026-01-08T00:00:00Z");
    expect(calendarRangeSpanDays({ from, to })).toBe(7);
  });
});
