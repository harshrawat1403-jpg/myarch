// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import RecruitersPage from "../../../src/app/(marketing)/recruiters/page";

describe("Recruiters page (/recruiters)", () => {
  it("renders exactly one h1", () => {
    render(<RecruitersPage />);
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
  });

  it("renders every required section as an h2", () => {
    render(<RecruitersPage />);

    const h2Labels = [
      "Why Recruit From VNIT Architecture",
      "Student Capabilities",
      "Software Proficiency",
      "Recruitment Process",
      "Internship Engagement",
      "Available Hiring Models",
      "Placement Support Provided by the Department",
      "Frequently Asked Questions",
      "Ready to recruit from VNIT Architecture?",
    ];
    for (const label of h2Labels) {
      expect(screen.getByRole("heading", { level: 2, name: label })).toBeInTheDocument();
    }
  });

  it("reuses the exact 'Why Recruit' content from Home, not a rewritten copy", () => {
    render(<RecruitersPage />);
    for (const title of ["Rigorous Design Training", "Software Fluency", "Studio Culture", "Design Thinking"]) {
      expect(screen.getByRole("heading", { level: 3, name: title })).toBeInTheDocument();
    }
  });

  it("reuses the same skill matrix and software ecosystem content as Students", () => {
    render(<RecruitersPage />);
    expect(screen.getByText("Design & Drafting")).toBeInTheDocument();
    expect(screen.getByText("Architectural drawing")).toBeInTheDocument();
    for (const tool of ["AutoCAD", "Revit", "SketchUp", "Rhino / Grasshopper"]) {
      expect(screen.getByText(tool)).toBeInTheDocument();
    }
  });

  it("reuses the recruiter engagement workflow steps from Placements, in order", () => {
    render(<RecruitersPage />);
    const headings = screen.getAllByRole("heading", { level: 3 }).map((h) => h.textContent);
    const steps = ["Request Access", "Schedule a Drive", "Review & Shortlist", "Interview & Offer"];
    const indices = steps.map((s) => headings.indexOf(s));
    expect(indices.every((i) => i !== -1)).toBe(true);
    expect(indices).toEqual([...indices].sort((a, b) => a - b));
  });

  it("renders all 4 hiring models with commitment and duration details", () => {
    render(<RecruitersPage />);
    for (const title of ["Full-Time Placement", "Pre-Placement Internship", "Internship Only", "Sponsored Studio Project"]) {
      expect(screen.getByRole("heading", { level: 3, name: title })).toBeInTheDocument();
    }
    expect(screen.getAllByText("Commitment").length).toBe(4);
    expect(screen.getAllByText("Duration").length).toBe(4);
  });

  it("renders 6 FAQ items, reusing 4 from Placements and adding 2 new ones", () => {
    render(<RecruitersPage />);
    expect(document.querySelectorAll("details").length).toBe(6);
    expect(screen.getByText("Who can access the student directory?")).toBeInTheDocument();
    expect(screen.getByText("How do we schedule a pre-placement talk?")).toBeInTheDocument();
  });

  it("the closing CTA links to Contact and Placements", () => {
    render(<RecruitersPage />);
    expect(screen.getByRole("link", { name: /request recruiter access/i })).toHaveAttribute("href", "/contact");
    expect(screen.getByRole("link", { name: /see placement outcomes/i })).toHaveAttribute("href", "/placements");
  });
});
