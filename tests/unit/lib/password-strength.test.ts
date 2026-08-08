import { describe, expect, it } from "vitest";
import { scorePasswordStrength } from "../../../src/lib/password-strength";

describe("scorePasswordStrength", () => {
  it("scores an empty password as 0 / Very weak, not meeting the minimum", () => {
    const result = scorePasswordStrength("");
    expect(result.score).toBe(0);
    expect(result.label).toBe("Very weak");
    expect(result.meetsMinimum).toBe(false);
  });

  it("scores a short, single-class password as weak, not meeting the minimum", () => {
    const result = scorePasswordStrength("abcdef");
    expect(result.score).toBe(1);
    expect(result.meetsMinimum).toBe(false);
  });

  it("does not meet the minimum below 10 characters even with 3+ character classes", () => {
    const result = scorePasswordStrength("Ab1!");
    expect(result.meetsMinimum).toBe(false);
  });

  it("does not meet the minimum with only 2 character classes, regardless of length", () => {
    const result = scorePasswordStrength("abcdefghijklmnop");
    expect(result.meetsMinimum).toBe(false);
  });

  it("meets the minimum at exactly 10 characters with enough character classes", () => {
    const result = scorePasswordStrength("Abcdefgh1!");
    expect(result.meetsMinimum).toBe(true);
  });

  it("scores a long password with all 4 character classes as Strong", () => {
    const result = scorePasswordStrength("Correct-Horse-Battery-Staple-1!");
    expect(result.score).toBe(4);
    expect(result.label).toBe("Strong");
    expect(result.meetsMinimum).toBe(true);
  });

  it("agrees with the server's ChangePasswordRequestSchema floor on a representative set of passwords", () => {
    const cases: Array<[string, boolean]> = [
      ["short1!", false], // < 10 chars
      ["alllowercase", false], // 1 class
      ["ALLUPPERCASE1234", false], // 2 classes
      ["MixedCase1234", true], // 3 classes, >= 10 chars
      ["mixedcase!!!!", false], // 2 classes (lower + symbol)
    ];
    for (const [password, expected] of cases) {
      expect(scorePasswordStrength(password).meetsMinimum).toBe(expected);
    }
  });
});
