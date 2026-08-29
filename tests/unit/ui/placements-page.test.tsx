// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { ToastProvider } from "../../../src/components/ui/toast";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/modules/auth/client", () => ({ useAuth: () => ({ role: null, accessToken: null }) }));
vi.mock("@/modules/content-overrides", () => ({ getPageContentOverridesUseCase: { execute: vi.fn().mockResolvedValue({}) } }));

import PlacementsPage from "../../../src/app/(marketing)/placements/page";

describe("Placements page (/placements)", () => {
  it("renders exactly one h1", async () => {
    render(<ToastProvider>{await PlacementsPage()}</ToastProvider>);
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
  });

  it("renders every required section as an h2", async () => {
    render(<ToastProvider>{await PlacementsPage()}</ToastProvider>);

    const h2Labels = [
      "Placement Process",
      "Internship Opportunities",
      "Placement Statistics",
      "Recruiter Categories",
      "Student Preparation Process",
      "Recruiter Engagement Workflow",
      "Frequently Asked Questions",
      "Ready to connect with the department?",
    ];
    for (const label of h2Labels) {
      expect(screen.getByRole("heading", { level: 2, name: label })).toBeInTheDocument();
    }
  });

  it("renders all 5 placement process steps, in order, as h3s", async () => {
    render(<ToastProvider>{await PlacementsPage()}</ToastProvider>);
    const steps = ["Pre-Placement Talk", "Registration & Eligibility", "Assessment", "Interviews", "Offer & Onboarding"];
    const headings = screen.getAllByRole("heading", { level: 3 }).map((h) => h.textContent);
    const indices = steps.map((s) => headings.indexOf(s));
    expect(indices.every((i) => i !== -1)).toBe(true);
    expect(indices).toEqual([...indices].sort((a, b) => a - b));
  });

  it("renders all 4 student preparation steps and all 4 recruiter workflow steps", async () => {
    render(<ToastProvider>{await PlacementsPage()}</ToastProvider>);
    for (const title of ["Portfolio Compilation", "Mock Interviews", "Software & Tool Readiness", "Profile & Registration"]) {
      expect(screen.getByRole("heading", { level: 3, name: title })).toBeInTheDocument();
    }
    for (const title of ["Request Access", "Schedule a Drive", "Review & Shortlist", "Interview & Offer"]) {
      expect(screen.getByRole("heading", { level: 3, name: title })).toBeInTheDocument();
    }
  });

  it("renders the three placement StatPanels shared with Home", async () => {
    render(<ToastProvider>{await PlacementsPage()}</ToastProvider>);
    for (const label of ["Placement Rate", "Recruiting Partners", "Average Package"]) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
  });

  it("renders all 6 recruiter category cards", async () => {
    render(<ToastProvider>{await PlacementsPage()}</ToastProvider>);
    for (const category of [
      "Architecture & Design Studios",
      "Urban Planning Consultancies",
      "Real Estate & Infrastructure Firms",
      "Construction & Project Management Groups",
      "Government & Public Works Bodies",
      "Interior & Landscape Design Practices",
    ]) {
      expect(screen.getByText(category)).toBeInTheDocument();
    }
  });

  it("renders all 6 FAQ questions as accordion triggers", async () => {
    render(<ToastProvider>{await PlacementsPage()}</ToastProvider>);
    expect(screen.getByText("Who can access the student directory?")).toBeInTheDocument();
    expect(screen.getByText("Who do we contact with questions?")).toBeInTheDocument();
    expect(document.querySelectorAll("details").length).toBe(6);
  });

  it("the closing CTA links to Contact (recruiters) and Login (students)", async () => {
    render(<ToastProvider>{await PlacementsPage()}</ToastProvider>);
    expect(screen.getByRole("link", { name: /request recruiter access/i })).toHaveAttribute("href", "/contact");
    expect(screen.getByRole("link", { name: /student sign in/i })).toHaveAttribute("href", "/login");
  });
});
