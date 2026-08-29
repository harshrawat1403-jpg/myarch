// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { ToastProvider } from "../../../src/components/ui/toast";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/modules/auth/client", () => ({ useAuth: () => ({ role: null, accessToken: null }) }));
vi.mock("@/modules/content-overrides", () => ({ getPageContentOverridesUseCase: { execute: vi.fn().mockResolvedValue({}) } }));

import StudentsPage from "../../../src/app/(marketing)/students/page";

describe("Students page (/students)", () => {
  it("renders exactly one h1", async () => {
    render(<ToastProvider>{await StudentsPage()}</ToastProvider>);
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
  });

  it("renders every required section as an h2", async () => {
    render(<ToastProvider>{await StudentsPage()}</ToastProvider>);

    const h2Labels = [
      "Academic Journey",
      "Studio Culture",
      "Skills Students Develop",
      "Software Ecosystem",
      "Design Process",
      "Portfolio Development",
      "Student Achievements",
      "Student Life",
      "Career Pathways",
      "Frequently Asked Questions",
      "Sign in to manage your placement profile.",
    ];
    for (const label of h2Labels) {
      expect(screen.getByRole("heading", { level: 2, name: label })).toBeInTheDocument();
    }
  });

  it("renders all 5 academic journey steps and all 5 design process steps, in order", async () => {
    render(<ToastProvider>{await StudentsPage()}</ToastProvider>);
    const headings = screen.getAllByRole("heading", { level: 3 }).map((h) => h.textContent);

    const journey = ["Foundation Year", "Design Fundamentals", "Core Studio Practice", "Electives & Urban Studies", "Thesis & Professional Practice"];
    const journeyIndices = journey.map((s) => headings.indexOf(s));
    expect(journeyIndices.every((i) => i !== -1)).toBe(true);
    expect(journeyIndices).toEqual([...journeyIndices].sort((a, b) => a - b));

    const process = ["Brief & Site Analysis", "Concept Development", "Iteration & Critique", "Design Development", "Final Presentation"];
    const processIndices = process.map((s) => headings.indexOf(s));
    expect(processIndices.every((i) => i !== -1)).toBe(true);
    expect(processIndices).toEqual([...processIndices].sort((a, b) => a - b));
  });

  it("renders the skill matrix categories and individual skills", async () => {
    render(<ToastProvider>{await StudentsPage()}</ToastProvider>);
    expect(screen.getByText("Design & Drafting")).toBeInTheDocument();
    expect(screen.getByText("Architectural drawing")).toBeInTheDocument();
    expect(screen.getByText("Communication")).toBeInTheDocument();
  });

  it("renders the same 4 software tools established on Home and About", async () => {
    render(<ToastProvider>{await StudentsPage()}</ToastProvider>);
    for (const tool of ["AutoCAD", "Revit", "SketchUp", "Rhino / Grasshopper"]) {
      expect(screen.getByText(tool)).toBeInTheDocument();
    }
  });

  it("marks Student Achievements as illustrative", async () => {
    render(<ToastProvider>{await StudentsPage()}</ToastProvider>);
    expect(screen.getByText(/illustrative categories/i)).toBeInTheDocument();
  });

  it("renders all 4 career pathways", async () => {
    render(<ToastProvider>{await StudentsPage()}</ToastProvider>);
    for (const title of ["Practicing Architect", "Urban & Regional Planner", "Design Research & Academia", "Allied Design Practice"]) {
      expect(screen.getByRole("heading", { level: 3, name: title })).toBeInTheDocument();
    }
  });

  it("the closing CTA's primary action is Sign In", async () => {
    render(<ToastProvider>{await StudentsPage()}</ToastProvider>);
    const links = screen.getAllByRole("link", { name: /^sign in$/i });
    expect(links[0]).toHaveAttribute("href", "/login");
  });
});
