// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const fetchMock = vi.fn();

vi.mock("@/modules/auth/client", () => ({
  useAuth: () => ({ accessToken: "test-access-token" }),
}));

import RecruiterDashboardPage from "../../../src/app/(recruiter)/recruiter/page";

function jsonResponse(body: unknown) {
  return { ok: true, status: 200, json: async () => ({ data: body }) };
}

const OVERVIEW = { companyName: "Acme Architects", savedCount: 2, shortlistedCount: 1, interestsSentCount: 3, interestsAcceptedCount: 1 };

const SAVED = [
  {
    studentId: "s1",
    fullName: "Alice Architect",
    batchId: "batch-a",
    batchName: "B.Arch 2026",
    bio: null,
    skills: [],
    software: [],
    selectedProjects: [],
    portfolioLinks: [],
    certifications: [],
    internships: [],
    hasResume: false,
    profilePhotoUrl: null,
    isSaved: true,
    isShortlisted: true,
    interestStatus: null,
  },
];

const INTERESTS = [
  {
    id: "int-1",
    studentId: "s2",
    studentName: "Bob Builder",
    batchName: "B.Arch 2026",
    message: null,
    status: "SENT",
    sentAt: "2026-01-01T00:00:00.000Z",
    respondedAt: null,
  },
];

describe("Recruiter dashboard page (/recruiter) — V4.0 C4", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    fetchMock.mockImplementation((url: string) => {
      if (url.includes("/api/recruiters/overview")) return Promise.resolve(jsonResponse(OVERVIEW));
      if (url.includes("/api/recruiters/saved")) return Promise.resolve(jsonResponse(SAVED));
      if (url.includes("/api/recruiters/interests")) return Promise.resolve(jsonResponse(INTERESTS));
      return Promise.resolve(jsonResponse([]));
    });
    vi.stubGlobal("fetch", fetchMock);
  });

  it("renders the consolidated saved/shortlisted/interests stat tiles", async () => {
    render(<RecruiterDashboardPage />);

    expect(await screen.findByText("2")).toBeInTheDocument(); // savedCount
    expect(screen.getByText("3")).toBeInTheDocument(); // interestsSentCount
    expect(screen.getByText(/^shortlisted$/i)).toBeInTheDocument();
    expect(screen.getByText(/interests sent/i)).toBeInTheDocument();
    expect(screen.getByText(/interests accepted/i)).toBeInTheDocument();
  });

  it("shows recently saved students and recent interests", async () => {
    render(<RecruiterDashboardPage />);

    expect(await screen.findByText("Alice Architect")).toBeInTheDocument();
    expect(screen.getByText("Bob Builder")).toBeInTheDocument();
  });

  it("links the quick actions to Directory, Saved, Interests, and Reports", async () => {
    render(<RecruiterDashboardPage />);
    await screen.findByText("Alice Architect");

    expect(screen.getByRole("link", { name: /browse directory/i })).toHaveAttribute("href", "/recruiter/directory");
    expect(screen.getByRole("link", { name: /saved students/i })).toHaveAttribute("href", "/recruiter/saved");
    expect(screen.getByRole("link", { name: /sent interests/i })).toHaveAttribute("href", "/recruiter/interests");
    expect(screen.getByRole("link", { name: /my reports/i })).toHaveAttribute("href", "/recruiter/reports");
  });

  it("V4.0 E8: shows the recruiter's own company name in the header", async () => {
    render(<RecruiterDashboardPage />);
    expect(await screen.findByText(/Acme Architects/)).toBeInTheDocument();
  });

  it("shows empty states when there is no saved/interest activity yet", async () => {
    fetchMock.mockReset();
    fetchMock.mockImplementation((url: string) => {
      if (url.includes("/api/recruiters/overview"))
        return Promise.resolve(jsonResponse({ savedCount: 0, shortlistedCount: 0, interestsSentCount: 0, interestsAcceptedCount: 0 }));
      return Promise.resolve(jsonResponse([]));
    });

    render(<RecruiterDashboardPage />);

    expect(await screen.findByText(/haven't saved any students yet/i)).toBeInTheDocument();
    expect(screen.getByText(/haven't expressed interest in any students yet/i)).toBeInTheDocument();
  });
});
