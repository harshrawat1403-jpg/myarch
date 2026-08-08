// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

let mockSearch = "";

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(mockSearch),
}));

import { ContactForm } from "../../../src/components/public/contact-form";

describe("ContactForm — visual-only enquiry form", () => {
  it("shows validation errors for empty required fields and does not show the confirmation", async () => {
    mockSearch = "";
    const user = userEvent.setup();
    render(<ContactForm contactEmail="contact@tnparch.in" />);

    await user.click(screen.getByRole("button", { name: /send message/i }));

    expect(screen.getByText("Enter your name.")).toBeInTheDocument();
    expect(screen.getByText("Enter your email.")).toBeInTheDocument();
    expect(screen.getByText("Enter a message.")).toBeInTheDocument();
    expect(screen.queryByText(/message ready/i)).not.toBeInTheDocument();
  });

  it("rejects an invalid email format", async () => {
    mockSearch = "";
    const user = userEvent.setup();
    render(<ContactForm contactEmail="contact@tnparch.in" />);

    await user.type(screen.getByLabelText("Name"), "Test Recruiter");
    await user.type(screen.getByLabelText("Email"), "not-an-email");
    await user.type(screen.getByLabelText("Message"), "Hello");
    await user.click(screen.getByRole("button", { name: /send message/i }));

    expect(screen.getByText("Enter a valid email address.")).toBeInTheDocument();
  });

  it("shows the interim confirmation, linking to the given contact email, once every field validates", async () => {
    mockSearch = "";
    const user = userEvent.setup();
    render(<ContactForm contactEmail="contact@tnparch.in" />);

    await user.type(screen.getByLabelText("Name"), "Test Recruiter");
    await user.type(screen.getByLabelText("Email"), "recruiter@example.com");
    await user.type(screen.getByLabelText("Message"), "We'd like to request recruiter access.");
    await user.click(screen.getByRole("button", { name: /send message/i }));

    expect(screen.getByText(/message ready/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "contact@tnparch.in" })).toHaveAttribute("href", "mailto:contact@tnparch.in");
  });

  it("preselects the Reason field from a ?reason= query param", () => {
    mockSearch = "reason=recruiter";
    render(<ContactForm contactEmail="contact@tnparch.in" />);

    expect(screen.getByLabelText("Reason")).toHaveValue("recruiter");
  });

  it("falls back to General Enquiry for an unrecognized reason value", () => {
    mockSearch = "reason=nonsense";
    render(<ContactForm contactEmail="contact@tnparch.in" />);

    expect(screen.getByLabelText("Reason")).toHaveValue("general");
  });
});
