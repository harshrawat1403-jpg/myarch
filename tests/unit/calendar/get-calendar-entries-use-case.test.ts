import { describe, expect, it } from "vitest";
import type { AuthenticatedActor } from "../../../src/modules/auth";
import {
  CalendarSourceRegistry,
  GetCalendarEntriesUseCase,
  InvalidCalendarRangeError,
  type CalendarEntry,
  type CalendarSource,
} from "../../../src/modules/calendar";

const SECRETARY: AuthenticatedActor = { userId: "sec-1", role: "SECRETARY" };

function fakeSource(sourceModule: string, entries: CalendarEntry[]): CalendarSource {
  return {
    sourceModule,
    async findEntries() {
      return entries;
    },
  };
}

function entry(overrides: Partial<CalendarEntry> = {}): CalendarEntry {
  return {
    id: "x:1",
    sourceModule: "x",
    activityType: "EVENT",
    title: "Sample",
    description: null,
    startAt: new Date("2026-03-05T10:00:00Z"),
    endAt: null,
    location: null,
    ownerId: "owner-1",
    status: "PUBLISHED",
    relatedEntityType: null,
    relatedEntityId: null,
    ...overrides,
  };
}

describe("GetCalendarEntriesUseCase", () => {
  it("aggregates and sorts entries from every registered source", async () => {
    const registry = new CalendarSourceRegistry();
    registry.register(
      fakeSource("tasks", [entry({ id: "task:1", activityType: "TASK_DEADLINE", startAt: new Date("2026-03-10T00:00:00Z") })]),
    );
    registry.register(
      fakeSource("events", [entry({ id: "event:1", activityType: "EVENT", startAt: new Date("2026-03-05T00:00:00Z") })]),
    );
    const useCase = new GetCalendarEntriesUseCase({ registry });

    const result = await useCase.execute({
      actor: SECRETARY,
      range: { from: new Date("2026-03-01T00:00:00Z"), to: new Date("2026-03-31T00:00:00Z") },
    });

    expect(result.map((e) => e.id)).toEqual(["event:1", "task:1"]);
  });

  it("drops entries from a source that rejects, without failing the whole call", async () => {
    const registry = new CalendarSourceRegistry();
    registry.register({
      sourceModule: "broken",
      async findEntries() {
        throw new Error("boom");
      },
    });
    registry.register(fakeSource("events", [entry({ id: "event:1" })]));
    const useCase = new GetCalendarEntriesUseCase({ registry });

    const result = await useCase.execute({
      actor: SECRETARY,
      range: { from: new Date("2026-03-01T00:00:00Z"), to: new Date("2026-03-31T00:00:00Z") },
    });

    expect(result.map((e) => e.id)).toEqual(["event:1"]);
  });

  it("applies activityType/ownerId/status filters defensively, even if a source ignores them", async () => {
    const registry = new CalendarSourceRegistry();
    registry.register(
      fakeSource("mixed", [
        entry({ id: "a", activityType: "EVENT", ownerId: "owner-1", status: "PUBLISHED" }),
        entry({ id: "b", activityType: "MEETING", ownerId: "owner-2", status: "SCHEDULED" }),
      ]),
    );
    const useCase = new GetCalendarEntriesUseCase({ registry });

    const result = await useCase.execute({
      actor: SECRETARY,
      range: { from: new Date("2026-03-01T00:00:00Z"), to: new Date("2026-03-31T00:00:00Z") },
      filters: { activityType: "EVENT" },
    });

    expect(result.map((e) => e.id)).toEqual(["a"]);
  });

  it("rejects a range where from is after to", async () => {
    const registry = new CalendarSourceRegistry();
    const useCase = new GetCalendarEntriesUseCase({ registry });

    await expect(
      useCase.execute({
        actor: SECRETARY,
        range: { from: new Date("2026-03-31T00:00:00Z"), to: new Date("2026-03-01T00:00:00Z") },
      }),
    ).rejects.toBeInstanceOf(InvalidCalendarRangeError);
  });

  it("rejects a range longer than MAX_CALENDAR_RANGE_DAYS", async () => {
    const registry = new CalendarSourceRegistry();
    const useCase = new GetCalendarEntriesUseCase({ registry });

    await expect(
      useCase.execute({
        actor: SECRETARY,
        range: { from: new Date("2020-01-01T00:00:00Z"), to: new Date("2026-01-01T00:00:00Z") },
      }),
    ).rejects.toBeInstanceOf(InvalidCalendarRangeError);
  });
});
