// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Footer } from "../../../src/components/public/footer";

describe("Footer — public site shared footer", () => {
  it("renders department information and VNIT attribution", () => {
    render(<Footer />);
    expect(screen.getAllByText(/Department of Architecture & Planning/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/VNIT Nagpur/i).length).toBeGreaterThan(0);
  });

  it("renders quick links to every other public page", () => {
    render(<Footer />);
    for (const label of ["About", "Placements", "Students", "Recruiters", "Contact"]) {
      expect(screen.getByRole("link", { name: label })).toBeInTheDocument();
    }
  });

  it("renders contact details", () => {
    render(<Footer />);
    expect(screen.getByRole("link", { name: /contact@tnparch\.in/i })).toHaveAttribute(
      "href",
      "mailto:contact@tnparch.in",
    );
  });

  it("renders social placeholders as non-interactive text, not dead links", () => {
    render(<Footer />);
    for (const label of ["Twitter / X", "Instagram", "LinkedIn"]) {
      expect(screen.getByText(new RegExp(label.replace("/", "\\/")))).toBeInTheDocument();
    }
    // None of the placeholders should be actual <a> elements.
    expect(screen.queryByRole("link", { name: /twitter|instagram|linkedin/i })).not.toBeInTheDocument();
  });

  it("renders the copyright line with the current year and policy placeholders", () => {
    render(<Footer />);
    const year = new Date().getFullYear().toString();
    expect(screen.getByText(new RegExp(`© ${year}`))).toBeInTheDocument();
    expect(screen.getByText(/Privacy Policy/i)).toBeInTheDocument();
    expect(screen.getByText(/Terms of Use/i)).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /privacy policy|terms of use/i })).not.toBeInTheDocument();
  });
});
