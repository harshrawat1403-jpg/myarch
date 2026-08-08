// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import AboutPage from "../../../src/app/(marketing)/about/page";

describe("About page (/about)", () => {
  it("renders exactly one h1", () => {
    render(<AboutPage />);
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
  });

  it("renders every required section as an h2", () => {
    render(<AboutPage />);

    const h2Labels = [
      "Vision & Mission",
      "History",
      "Academic Philosophy",
      "Studio Culture",
      "Facilities Overview",
      "Faculty",
      "Why Architecture at VNIT",
      "See what our students go on to do.",
    ];
    for (const label of h2Labels) {
      expect(screen.getByRole("heading", { level: 2, name: label })).toBeInTheDocument();
    }
  });

  it("renders both Vision and Mission content", () => {
    render(<AboutPage />);
    expect(screen.getByText("Vision")).toBeInTheDocument();
    expect(screen.getByText("Mission")).toBeInTheDocument();
  });

  it("renders all three Studio Culture traits and all four Why-VNIT reasons", () => {
    render(<AboutPage />);
    for (const title of ["Critique Culture", "Iterative Process", "Collaborative Making"]) {
      expect(screen.getByRole("heading", { level: 3, name: title })).toBeInTheDocument();
    }
    for (const title of [
      "Design-First Curriculum",
      "Hands-On Software Training",
      "A Studio You Actually Work In",
      "Design Thinking, Applied Broadly",
    ]) {
      expect(screen.getByRole("heading", { level: 3, name: title })).toBeInTheDocument();
    }
  });

  it("renders all four facilities", () => {
    render(<AboutPage />);
    for (const title of ["Design Studios", "Model-Making Workshop", "Computer & CAD Lab", "Resource Library"]) {
      expect(screen.getByRole("heading", { level: 3, name: title })).toBeInTheDocument();
    }
  });

  it("the Faculty section links to Contact, not to fabricated faculty data", () => {
    render(<AboutPage />);
    expect(screen.getByRole("link", { name: /contact the department/i })).toHaveAttribute("href", "/contact");
  });

  it("the closing CTA links to Placements and Students", () => {
    render(<AboutPage />);
    expect(screen.getByRole("link", { name: /see placement outcomes/i })).toHaveAttribute("href", "/placements");
    expect(screen.getByRole("link", { name: /meet our students/i })).toHaveAttribute("href", "/students");
  });
});
