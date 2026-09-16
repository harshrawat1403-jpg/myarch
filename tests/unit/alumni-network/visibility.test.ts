import { describe, expect, it } from "vitest";
import { canEditOwnAlumniProfile } from "../../../src/modules/platform";

describe("Alumni Network ownership", () => {
  it("does not let an alumni account edit a different alumni profile", () => {
    const actor = { userId: "alumni-1", role: "ALUMNI" as const };
    expect(canEditOwnAlumniProfile(actor, "alumni-1")).toBe(true);
    expect(canEditOwnAlumniProfile(actor, "alumni-2")).toBe(false);
  });
});
