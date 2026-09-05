import { describe, expect, it } from "vitest";
import {
  assertDraft,
  assertTransition,
  electionConfigSchema,
  positionSchema,
  validateSchedule,
  validateWeights,
} from "../../../src/modules/elections/domain/election";

export const config = () =>
  electionConfigSchema.parse({
    title: "Council",
    academicYear: "2026-2027",
    type: "COUNCIL",
    applicationOpenAt: "2026-09-01T00:00:00Z",
    applicationCloseAt: "2026-09-10T00:00:00Z",
  });
describe("election foundation rules", () => {
  it("exposes only forward intake transitions", () => {
    expect(() => assertTransition("DRAFT", "APPLICATION_OPEN")).not.toThrow();
    expect(() => assertTransition("APPLICATION_OPEN", "APPLICATION_CLOSED")).not.toThrow();
    for (const [from, to] of [
      ["DRAFT", "APPLICATION_CLOSED"],
      ["APPLICATION_CLOSED", "APPLICATION_OPEN"],
      ["APPLICATION_OPEN", "DRAFT"],
      ["APPLICATION_OPEN", "APPLICATION_OPEN"],
    ] as const)
      expect(() => assertTransition(from, to)).toThrow();
  });
  it("locks all configuration after opening", () => {
    expect(() => assertDraft("DRAFT")).not.toThrow();
    expect(() => assertDraft("APPLICATION_OPEN")).toThrow();
    expect(() => assertDraft("APPLICATION_CLOSED")).toThrow();
  });
  it("requires consecutive academic years and known election types", () => {
    expect(electionConfigSchema.safeParse({ ...config(), academicYear: "2026-2028" }).success).toBe(
      false,
    );
    expect(electionConfigSchema.safeParse({ ...config(), academicYear: "26-27" }).success).toBe(
      false,
    );
    expect(electionConfigSchema.safeParse({ ...config(), type: "FACULTY" }).success).toBe(false);
    expect(electionConfigSchema.safeParse({ ...config(), type: "CORE_COMMITTEE" }).success).toBe(
      true,
    );
  });
  it("requires valid application dates", () => {
    expect(electionConfigSchema.safeParse({ ...config(), applicationOpenAt: null }).success).toBe(
      false,
    );
    expect(() => validateSchedule(config())).not.toThrow();
    expect(() =>
      validateSchedule({ ...config(), applicationCloseAt: config().applicationOpenAt }),
    ).toThrow();
    expect(
      electionConfigSchema.safeParse({ ...config(), applicationOpenAt: "not-a-date" }).success,
    ).toBe(false);
  });
  it("validates paired correction and optional campaign chronology", () => {
    const correctionOpenAt = new Date("2026-09-11"),
      correctionCloseAt = new Date("2026-09-12");
    expect(() => validateSchedule({ ...config(), correctionOpenAt })).toThrow();
    expect(() =>
      validateSchedule({ ...config(), correctionOpenAt, correctionCloseAt }),
    ).not.toThrow();
    expect(() =>
      validateSchedule({
        ...config(),
        correctionOpenAt: new Date("2026-09-09"),
        correctionCloseAt,
      }),
    ).toThrow();
    expect(() => validateSchedule({ ...config(), campaignEnabled: true })).toThrow();
    expect(() =>
      validateSchedule({
        ...config(),
        correctionOpenAt,
        correctionCloseAt,
        campaignEnabled: true,
        campaignOpenAt: correctionOpenAt,
        campaignCloseAt: new Date("2026-09-15"),
      }),
    ).toThrow();
  });
  it("allows incomplete draft weights but requires exactly 100% from all groups at locking", () => {
    expect(() => validateWeights([])).not.toThrow();
    expect(() => validateWeights([], true)).toThrow();
    const weights = [
      { voterGroup: "STUDENT", percentage: 33.33 },
      { voterGroup: "FACULTY", percentage: 33.33 },
      { voterGroup: "EX_COUNCIL", percentage: 33.34 },
    ] as const;
    expect(() => validateWeights([...weights], true)).not.toThrow();
    expect(() =>
      validateWeights(
        [...weights.slice(0, 2), { voterGroup: "EX_COUNCIL", percentage: 33.33 }],
        true,
      ),
    ).toThrow();
    expect(() => validateWeights([weights[0], weights[0]])).toThrow();
    expect(() => validateWeights([{ voterGroup: "STUDENT", percentage: 101 }])).toThrow();
    expect(() => validateWeights([{ voterGroup: "STUDENT", percentage: -1 }])).toThrow();
  });
  it("validates seats and two-decimal percentages", () => {
    expect(positionSchema.safeParse({ title: "President", seats: 0 }).success).toBe(false);
    expect(
      positionSchema.safeParse({
        title: "President",
        seats: 1,
        weights: [{ voterGroup: "STUDENT", percentage: 12.345 }],
      }).success,
    ).toBe(false);
  });
});
