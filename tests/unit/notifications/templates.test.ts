/**
 * The "Email Template Architecture" requirement: Subject/Plain
 * Text/HTML/Branding/Footer are separated, and branding+footer are applied
 * uniformly by the shared layout rather than duplicated per template. These
 * tests verify both the per-template content and that every template goes
 * through the same layout.
 */
import { describe, expect, it } from "vitest";
import { renderEmailTemplate } from "../../../src/modules/notifications/application/templates/render";
import { escapeHtml } from "../../../src/modules/notifications/application/templates/layout";

describe("renderEmailTemplate — PROFILE_APPROVED", () => {
  it("renders subject, text, and html referencing the student's name", () => {
    const message = renderEmailTemplate(
      "PROFILE_APPROVED",
      { studentName: "Alice Architect" },
      "alice@vnit.ac.in",
    );

    expect(message.to).toBe("alice@vnit.ac.in");
    expect(message.subject).toBe("Your public profile has been approved");
    expect(message.text).toContain("Alice Architect");
    expect(message.text).toContain("approved");
    expect(message.html).toContain("Alice Architect");
  });
});

describe("renderEmailTemplate — PROFILE_CHANGES_REQUESTED", () => {
  it("renders subject, text, and html including the reviewer's comment", () => {
    const message = renderEmailTemplate(
      "PROFILE_CHANGES_REQUESTED",
      { studentName: "Alice Architect", reviewComment: "Add a portfolio link" },
      "alice@vnit.ac.in",
    );

    expect(message.subject).toBe("Changes requested on your public profile");
    expect(message.text).toContain("Add a portfolio link");
    expect(message.html).toContain("Add a portfolio link");
  });

  it("HTML-escapes the reviewer's free-text comment (no email HTML injection)", () => {
    const message = renderEmailTemplate(
      "PROFILE_CHANGES_REQUESTED",
      { studentName: "Alice", reviewComment: "<script>alert(1)</script>" },
      "alice@vnit.ac.in",
    );

    expect(message.html).not.toContain("<script>alert(1)</script>");
    expect(message.html).toContain("&lt;script&gt;");
  });
});

describe("renderEmailTemplate — ACCOUNT_CREDENTIALS_ISSUED", () => {
  it("renders a distinct subject for account creation vs. password reset", () => {
    const created = renderEmailTemplate(
      "ACCOUNT_CREDENTIALS_ISSUED",
      { recipientName: "Arjun Mehta", reason: "account_created" },
      "arjun@myarch.in",
    );
    const reset = renderEmailTemplate(
      "ACCOUNT_CREDENTIALS_ISSUED",
      { recipientName: "Arjun Mehta", reason: "password_reset" },
      "arjun@myarch.in",
    );

    expect(created.subject).toBe("Your MYARCH account is ready");
    expect(reset.subject).toBe("Your MYARCH password was reset");
  });

  it("never includes a password field in the rendered content", () => {
    const message = renderEmailTemplate(
      "ACCOUNT_CREDENTIALS_ISSUED",
      { recipientName: "Arjun Mehta", reason: "account_created", password: "should-never-appear" },
      "arjun@myarch.in",
    );

    expect(message.text).not.toContain("should-never-appear");
    expect(message.html).not.toContain("should-never-appear");
  });
});

describe("renderEmailTemplate — ACCOUNT_CREDENTIALS_DELIVERY", () => {
  it("renders the direct-only account-created email with the new temporary password", () => {
    const message = renderEmailTemplate(
      "ACCOUNT_CREDENTIALS_DELIVERY",
      {
        recipientName: "Priya New Student",
        loginUrl: "https://myarch.example.edu/login",
        loginEmail: "priya@example.edu",
        temporaryPassword: "NewTemp123!",
      },
      "priya@example.edu",
    );

    expect(message.subject).toBe("Your MYARCH account has been created");
    expect(message.text).toContain("NewTemp123!");
    expect(message.text).toContain("https://myarch.example.edu/login");
    expect(message.html).toContain("priya@example.edu");
  });
});

describe("shared email layout — branding and footer applied uniformly", () => {
  it("every template's html includes the MYARCH brand name and the automated-message footer", () => {
    const approved = renderEmailTemplate("PROFILE_APPROVED", { studentName: "Alice" }, "a@vnit.ac.in");
    const changesRequested = renderEmailTemplate(
      "PROFILE_CHANGES_REQUESTED",
      { studentName: "Alice", reviewComment: "fix" },
      "a@vnit.ac.in",
    );
    const credentialsIssued = renderEmailTemplate(
      "ACCOUNT_CREDENTIALS_ISSUED",
      { recipientName: "Alice", reason: "account_created" },
      "a@vnit.ac.in",
    );

    for (const message of [approved, changesRequested, credentialsIssued]) {
      expect(message.html).toContain("MYARCH");
      expect(message.html).toContain("automated message");
      expect(message.text).toContain("MYARCH");
      expect(message.text).toContain("automated message");
    }
  });
});

describe("escapeHtml", () => {
  it("escapes the five reserved HTML characters", () => {
    expect(escapeHtml(`<a href="x">&'test'</a>`)).toBe(
      "&lt;a href=&quot;x&quot;&gt;&amp;&#39;test&#39;&lt;/a&gt;",
    );
  });
});
