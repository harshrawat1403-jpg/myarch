import { describe, expect, it } from "vitest";
import { resolveNotificationDestination } from "../../../src/modules/notifications/application/templates/destinations";

describe("resolveNotificationDestination — V4.0 UX fix (notification deep links)", () => {
  it("PROFILE_APPROVED and PROFILE_CHANGES_REQUESTED point to the student's own profile editor", () => {
    expect(resolveNotificationDestination("PROFILE_APPROVED", {})).toBe("/student/profile");
    expect(resolveNotificationDestination("PROFILE_CHANGES_REQUESTED", { reviewComment: "fix this" })).toBe("/student/profile");
  });

  it("REGISTRATION_SUBMITTED and REGISTRATION_REVIEWED point to the specific registration request when a requestId is present", () => {
    expect(resolveNotificationDestination("REGISTRATION_SUBMITTED", { requestId: "req-1" })).toBe("/dashboard/registrations/req-1");
    expect(resolveNotificationDestination("REGISTRATION_REVIEWED", { requestId: "req-2" })).toBe("/dashboard/registrations/req-2");
  });

  it("falls back to the registrations queue when requestId is missing (older notifications predating this field)", () => {
    expect(resolveNotificationDestination("REGISTRATION_SUBMITTED", {})).toBe("/dashboard/registrations");
    expect(resolveNotificationDestination("REGISTRATION_REVIEWED", { status: "REVIEWED" })).toBe("/dashboard/registrations");
  });

  it("REGISTRATION_DECIDED points to the student's Career Hub only on APPROVED", () => {
    expect(resolveNotificationDestination("REGISTRATION_DECIDED", { decision: "APPROVED" })).toBe("/student");
    expect(resolveNotificationDestination("REGISTRATION_DECIDED", { decision: "REJECTED" })).toBeNull();
  });

  it("RECRUITER_INTEREST_RECEIVED points to the student's Interests page", () => {
    expect(resolveNotificationDestination("RECRUITER_INTEREST_RECEIVED", { companyName: "Acme" })).toBe("/student/interests");
  });

  it("RECRUITER_INTEREST_RESPONDED points to the recruiter's Interests page", () => {
    expect(resolveNotificationDestination("RECRUITER_INTEREST_RESPONDED", { studentName: "Alice", decision: "ACCEPTED" })).toBe(
      "/recruiter/interests",
    );
  });

  it("PLACEMENT_DRIVE_ANNOUNCED and APPLICATION_STATUS_CHANGED point to the student's applications page (no per-item detail route exists)", () => {
    expect(resolveNotificationDestination("PLACEMENT_DRIVE_ANNOUNCED", { companyName: "Acme", title: "SDE", type: "PLACEMENT" })).toBe(
      "/student/applications",
    );
    expect(resolveNotificationDestination("APPLICATION_STATUS_CHANGED", { companyName: "Acme", title: "SDE", toStatus: "OFFER" })).toBe(
      "/student/applications",
    );
  });

  it("has no destination for templates with no meaningful owning page", () => {
    expect(resolveNotificationDestination("ACCOUNT_CREDENTIALS_ISSUED", { reason: "account_created" })).toBeNull();
    expect(resolveNotificationDestination("INTEREST_FACILITATION_REQUIRED", { studentName: "Alice", companyName: "Acme" })).toBeNull();
  });
});
