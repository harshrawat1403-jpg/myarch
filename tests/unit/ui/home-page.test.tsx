// @vitest-environment jsdom
import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const replaceMock = vi.fn();
let mockAuthState: { isLoading: boolean; isAuthenticated: boolean; role: string | null };

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: replaceMock }),
}));

vi.mock("@/modules/auth/client", () => ({
  useAuth: () => mockAuthState,
}));

import Home from "../../../src/app/(marketing)/page";

describe("Home (/) — public marketing page, still routes an authenticated session away", () => {
  beforeEach(() => {
    replaceMock.mockClear();
  });

  it("shows a loading state and does not redirect while auth status is resolving", () => {
    mockAuthState = { isLoading: true, isAuthenticated: false, role: null };
    render(<Home />);

    expect(screen.getByText(/loading/i)).toBeInTheDocument();
    expect(replaceMock).not.toHaveBeenCalled();
  });

  it("redirects a Secretary to /dashboard instead of showing marketing content", async () => {
    mockAuthState = { isLoading: false, isAuthenticated: true, role: "SECRETARY" };
    render(<Home />);

    await waitFor(() => expect(replaceMock).toHaveBeenCalledWith("/dashboard"));
    expect(screen.queryByRole("heading", { name: /where design thinking becomes built practice/i })).not.toBeInTheDocument();
  });

  it("redirects a Coordinator to /dashboard", async () => {
    mockAuthState = { isLoading: false, isAuthenticated: true, role: "COORDINATOR" };
    render(<Home />);

    await waitFor(() => expect(replaceMock).toHaveBeenCalledWith("/dashboard"));
  });

  it("redirects a Student to /student", async () => {
    mockAuthState = { isLoading: false, isAuthenticated: true, role: "STUDENT" };
    render(<Home />);

    await waitFor(() => expect(replaceMock).toHaveBeenCalledWith("/student"));
  });

  it("redirects a Recruiter to /recruiter", async () => {
    mockAuthState = { isLoading: false, isAuthenticated: true, role: "RECRUITER" };
    render(<Home />);

    await waitFor(() => expect(replaceMock).toHaveBeenCalledWith("/recruiter"));
  });

  it("renders the marketing Home page for an unauthenticated visitor, without redirecting", () => {
    mockAuthState = { isLoading: false, isAuthenticated: false, role: null };
    render(<Home />);

    expect(replaceMock).not.toHaveBeenCalled();
    expect(screen.getByRole("heading", { level: 1, name: /where design thinking becomes built practice/i })).toBeInTheDocument();
  });

  it("has exactly one h1 and every section heading as an h2", () => {
    mockAuthState = { isLoading: false, isAuthenticated: false, role: null };
    render(<Home />);

    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
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

  it("renders the three placement StatPanels", () => {
    mockAuthState = { isLoading: false, isAuthenticated: false, role: null };
    render(<Home />);

    for (const label of ["Placement Rate", "Recruiting Partners", "Average Package"]) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
  });

  it("renders all four Quick Action links to their correct destinations", () => {
    mockAuthState = { isLoading: false, isAuthenticated: false, role: null };
    render(<Home />);

    expect(screen.getByRole("link", { name: /view placements/i })).toHaveAttribute("href", "/placements");
    expect(screen.getByRole("link", { name: /recruit students/i })).toHaveAttribute("href", "/recruiters");
    expect(screen.getAllByRole("link", { name: /student login/i })[0]).toHaveAttribute("href", "/login");
    expect(screen.getAllByRole("link", { name: /recruiter login/i })[0]).toHaveAttribute("href", "/login");
  });

  it("the hero's primary CTA leads to Placements and secondary CTA leads to Sign In", () => {
    mockAuthState = { isLoading: false, isAuthenticated: false, role: null };
    render(<Home />);

    expect(screen.getAllByRole("link", { name: /explore placements/i })[0]).toHaveAttribute("href", "/placements");
    expect(screen.getAllByRole("link", { name: /^sign in$/i })[0]).toHaveAttribute("href", "/login");
  });
});
