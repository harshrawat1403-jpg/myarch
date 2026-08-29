// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { ToastProvider } from "../../../src/components/ui/toast";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/modules/auth/client", () => ({ useAuth: () => ({ role: null, accessToken: null }) }));
vi.mock("@/modules/content-overrides", () => ({ getPageContentOverridesUseCase: { execute: vi.fn().mockResolvedValue({}) } }));

import HomeMarketingContent from "../../../src/app/(marketing)/home-content";

describe("HomeMarketingContent — the actual `/` marketing content", () => {
  it("has exactly one h1 and every section heading as an h2", async () => {
    render(<ToastProvider>{await HomeMarketingContent()}</ToastProvider>);

    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.getByRole("heading", { level: 1, name: /where design thinking becomes built practice/i })).toBeInTheDocument();

    const h2Labels = [
      "About the Department",
      "Placement Highlights",
      "Featured Student Work",
      "Why Recruit From VNIT Architecture",
      "Latest Updates",
      "Quick Actions",
      "Ready to get started?",
    ];
    for (const label of h2Labels) {
      expect(screen.getByRole("heading", { level: 2, name: label })).toBeInTheDocument();
    }
  });

  it("renders the three placement StatPanels", async () => {
    render(<ToastProvider>{await HomeMarketingContent()}</ToastProvider>);

    for (const label of ["Placement Rate", "Recruiting Partners", "Average Package"]) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
  });

  it("renders all four Quick Action links to their correct destinations", async () => {
    render(<ToastProvider>{await HomeMarketingContent()}</ToastProvider>);

    expect(screen.getByRole("link", { name: /view placements/i })).toHaveAttribute("href", "/placements");
    expect(screen.getByRole("link", { name: /recruit students/i })).toHaveAttribute("href", "/recruiters");
    expect(screen.getAllByRole("link", { name: /student login/i })[0]).toHaveAttribute("href", "/login");
    expect(screen.getAllByRole("link", { name: /recruiter login/i })[0]).toHaveAttribute("href", "/login");
  });

  it("the hero's primary CTA leads to Placements and secondary CTA leads to Sign In", async () => {
    render(<ToastProvider>{await HomeMarketingContent()}</ToastProvider>);

    expect(screen.getAllByRole("link", { name: /explore placements/i })[0]).toHaveAttribute("href", "/placements");
    expect(screen.getAllByRole("link", { name: /^sign in$/i })[0]).toHaveAttribute("href", "/login");
  });
});
