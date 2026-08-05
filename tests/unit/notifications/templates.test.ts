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

describe("shared email layout — branding and footer applied uniformly", () => {
  it("every template's html includes the TNPArch brand name and the automated-message footer", () => {
    const approved = renderEmailTemplate("PROFILE_APPROVED", { studentName: "Alice" }, "a@vnit.ac.in");
    const changesRequested = renderEmailTemplate(
      "PROFILE_CHANGES_REQUESTED",
      { studentName: "Alice", reviewComment: "fix" },
      "a@vnit.ac.in",
    );

    for (const message of [approved, changesRequested]) {
      expect(message.html).toContain("TNPArch");
      expect(message.html).toContain("automated message");
      expect(message.text).toContain("TNPArch");
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
