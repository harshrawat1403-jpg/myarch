// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { ToastProvider } from "../../../src/components/ui/toast";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("@/modules/auth/client", () => ({ useAuth: () => ({ role: null, accessToken: null }) }));
vi.mock("@/modules/content-overrides", () => ({ getPageContentOverridesUseCase: { execute: vi.fn().mockResolvedValue({}) } }));

import ContactPage from "../../../src/app/(marketing)/contact/page";

describe("Contact page (/contact)", () => {
  it("renders exactly one h1", async () => {
    render(<ToastProvider>{await ContactPage()}</ToastProvider>);
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
  });

  it("renders every required section as an h2", async () => {
    render(<ToastProvider>{await ContactPage()}</ToastProvider>);

    const h2Labels = [
      "Contact Information",
      "Office Location & Hours",
      "Who To Contact",
      "Frequently Asked Questions",
      "Send a Message",
      "We typically respond within 2–3 working days.",
    ];
    for (const label of h2Labels) {
      expect(screen.getByRole("heading", { level: 2, name: label })).toBeInTheDocument();
    }
  });

  it("renders both contact panels with correct mailto links", async () => {
    render(<ToastProvider>{await ContactPage()}</ToastProvider>);
    expect(screen.getByRole("link", { name: "contact@myarch.in" })).toHaveAttribute("href", "mailto:contact@myarch.in");
    expect(screen.getByRole("link", { name: "support@myarch.in" })).toHaveAttribute("href", "mailto:support@myarch.in");
  });

  it("renders all three enquiry routing cards", async () => {
    render(<ToastProvider>{await ContactPage()}</ToastProvider>);
    for (const title of ["General Enquiries", "Recruiter Enquiries", "Student Support"]) {
      expect(screen.getByRole("heading", { level: 3, name: title })).toBeInTheDocument();
    }
  });

  it("renders the contact form", async () => {
    render(<ToastProvider>{await ContactPage()}</ToastProvider>);
    expect(screen.getByRole("button", { name: /send message/i })).toBeInTheDocument();
  });

  it("does not fabricate a map embed or a phone number", async () => {
    render(<ToastProvider>{await ContactPage()}</ToastProvider>);
    // The map slot is a placeholder (ImagePlaceholder renders no visible
    // caption — see that component's own doc comment); the honest "not
    // real yet" disclosure survives as its accessible name, not as painted
    // text, so a screen-reader user still learns it, a sighted visitor
    // doesn't see instructional copy.
    expect(screen.getByRole("img", { name: /map integration pending/i })).toBeInTheDocument();
    expect(screen.getByText(/phone contact details are being finalised/i)).toBeInTheDocument();
  });

  it("the closing CTA links to the Technical Team and to Placements", async () => {
    render(<ToastProvider>{await ContactPage()}</ToastProvider>);
    expect(screen.getByRole("link", { name: /email the technical team/i })).toHaveAttribute(
      "href",
      "mailto:support@myarch.in",
    );
    expect(screen.getByRole("link", { name: /browse placements/i })).toHaveAttribute("href", "/placements");
  });
});
