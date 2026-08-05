import { describe, expect, it } from "vitest";
import { computeBackoffMs, shouldRetry } from "../../../src/modules/jobs";

describe("shouldRetry", () => {
  it("allows retrying while attempts is below maxAttempts", () => {
    expect(shouldRetry(1, 5)).toBe(true);
    expect(shouldRetry(4, 5)).toBe(true);
  });

  it("refuses to retry once attempts reaches maxAttempts (dead-letter)", () => {
    expect(shouldRetry(5, 5)).toBe(false);
    expect(shouldRetry(6, 5)).toBe(false);
  });
});

describe("computeBackoffMs", () => {
  const fixedRandom = () => 0.5; // jitterFactor = 1.0 exactly, for deterministic assertions

  it("grows exponentially with attempt count", () => {
    const delay1 = computeBackoffMs(1, fixedRandom);
    const delay2 = computeBackoffMs(2, fixedRandom);
    const delay3 = computeBackoffMs(3, fixedRandom);

    expect(delay1).toBe(1000);
    expect(delay2).toBe(2000);
    expect(delay3).toBe(4000);
  });

  it("caps the delay so a high attempt count never produces an unbounded wait", () => {
    const delay = computeBackoffMs(20, fixedRandom);
    expect(delay).toBe(5 * 60 * 1000);
  });

  it("applies +/-20% jitter around the exponential base", () => {
    const min = computeBackoffMs(3, () => 0);
    const max = computeBackoffMs(3, () => 1);

    expect(min).toBe(Math.round(4000 * 0.8));
    expect(max).toBe(Math.round(4000 * 1.2));
  });

  it("never produces a negative or zero delay for attempts=0", () => {
    const delay = computeBackoffMs(0, fixedRandom);
    expect(delay).toBeGreaterThan(0);
  });
});
