import { describe, expect, it } from "vitest";
import { isCommitteeLead, isCommitteeMember } from "../../../src/modules/committees";

describe("isCommitteeMember", () => {
  it("is true for an active membership belonging to that user", () => {
    expect(isCommitteeMember("u1", [{ userId: "u1", isActive: true }])).toBe(true);
  });

  it("is false for a former (inactive) membership — a former member is not a current member", () => {
    expect(isCommitteeMember("u1", [{ userId: "u1", isActive: false }])).toBe(false);
  });

  it("is false when the user has no membership row at all", () => {
    expect(isCommitteeMember("u1", [{ userId: "u2", isActive: true }])).toBe(false);
  });
});

describe("isCommitteeLead", () => {
  it("is true only for an active membership with isLead true", () => {
    expect(isCommitteeLead("u1", [{ userId: "u1", isActive: true, isLead: true }])).toBe(true);
  });

  it("is false for an active, non-lead member — a member is not automatically a lead", () => {
    expect(isCommitteeLead("u1", [{ userId: "u1", isActive: true, isLead: false }])).toBe(false);
  });

  it("is false for a former lead — leadership ends when membership ends", () => {
    expect(isCommitteeLead("u1", [{ userId: "u1", isActive: false, isLead: true }])).toBe(false);
  });
});
