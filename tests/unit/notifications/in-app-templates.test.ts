import { describe, expect, it } from "vitest";
import { renderInAppTemplate } from "../../../src/modules/notifications/application/templates/render";

describe("renderInAppTemplate — V4.0 E1", () => {
  it("renders PROFILE_APPROVED with a short title and message", () => {
    const result = renderInAppTemplate("PROFILE_APPROVED", {});
    expect(result.title).toBe("Profile approved");
    expect(result.message.length).toBeGreaterThan(0);
  });

  it("renders PROFILE_CHANGES_REQUESTED using the real reviewer comment when present", () => {
    const result = renderInAppTemplate("PROFILE_CHANGES_REQUESTED", { reviewComment: "Add a portfolio link" });
    expect(result.message).toBe("Add a portfolio link");
  });

  it("renders ACCOUNT_CREDENTIALS_ISSUED distinctly for account creation vs. password reset", () => {
    const created = renderInAppTemplate("ACCOUNT_CREDENTIALS_ISSUED", { reason: "account_created" });
    const reset = renderInAppTemplate("ACCOUNT_CREDENTIALS_ISSUED", { reason: "password_reset" });
    expect(created.title).toBe("Account created");
    expect(reset.title).toBe("Password reset");
  });

  it("renders INTEREST_FACILITATION_REQUIRED with the real student and company names", () => {
    const result = renderInAppTemplate("INTEREST_FACILITATION_REQUIRED", { studentName: "Alice", companyName: "Acme Architects" });
    expect(result.message).toContain("Alice");
    expect(result.message).toContain("Acme Architects");
  });
});
