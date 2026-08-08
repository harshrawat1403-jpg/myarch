// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
}));

import ContactPage from "../../../src/app/(marketing)/contact/page";

describe("Contact page (/contact)", () => {
  it("renders exactly one h1", () => {
    render(<ContactPage />);
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
  });

  it("renders every required section as an h2", () => {
    render(<ContactPage />);

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

  it("renders both contact panels with correct mailto links", () => {
    render(<ContactPage />);
    expect(screen.getByRole("link", { name: "contact@tnparch.in" })).toHaveAttribute("href", "mailto:contact@tnparch.in");
    expect(screen.getByRole("link", { name: "placements@tnparch.in" })).toHaveAttribute("href", "mailto:placements@tnparch.in");
  });

  it("renders all three enquiry routing cards", () => {
    render(<ContactPage />);
    for (const title of ["General Enquiries", "Recruiter Enquiries", "Student Support"]) {
      expect(screen.getByRole("heading", { level: 3, name: title })).toBeInTheDocument();
    }
  });

  it("renders the contact form", () => {
    render(<ContactPage />);
    expect(screen.getByRole("button", { name: /send message/i })).toBeInTheDocument();
  });

  it("does not fabricate a map embed or a phone number", () => {
    render(<ContactPage />);
    expect(screen.getByText(/map integration pending/i)).toBeInTheDocument();
    expect(screen.getByText(/phone contact details are being finalised/i)).toBeInTheDocument();
  });

  it("the closing CTA links to the Placement Cell and to Placements", () => {
    render(<ContactPage />);
    expect(screen.getByRole("link", { name: /email the placement cell/i })).toHaveAttribute(
      "href",
      "mailto:placements@tnparch.in",
    );
    expect(screen.getByRole("link", { name: /browse placements/i })).toHaveAttribute("href", "/placements");
  });
});
