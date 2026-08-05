import { describe, expect, it } from "vitest";
import { resolveAuditFilter } from "../../../src/lib/audit";

describe("resolveAuditFilter — Day 7 audit-history scoping", () => {
  it("gives the Secretary an unfiltered (system-wide) view", () => {
    expect(resolveAuditFilter({ role: "SECRETARY", userId: "sec-1" })).toEqual({});
  });

  it("restricts a Coordinator to their own actions only", () => {
    expect(resolveAuditFilter({ role: "COORDINATOR", userId: "coord-1" })).toEqual({
      actorUserId: "coord-1",
    });
  });

  it("restricts a Student to their own actions only (defensive — route never actually allows Student)", () => {
    expect(resolveAuditFilter({ role: "STUDENT", userId: "stu-1" })).toEqual({ actorUserId: "stu-1" });
  });
});
