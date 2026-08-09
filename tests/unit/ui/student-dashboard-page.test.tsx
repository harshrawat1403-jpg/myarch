// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const fetchMock = vi.fn();

vi.mock("@/modules/auth/client", () => ({
  useAuth: () => ({ accessToken: "test-access-token", studentProfileId: "student-1" }),
}));

import StudentDashboardPage from "../../../src/app/(student)/student/page";

function jsonResponse(body: unknown, ok = true, status = ok ? 200 : 404) {
  return {
    ok,
    status,
    json: async () => (ok ? { data: body } : { error: { code: "NOT_FOUND", message: "Not found" } }),
  };
}

const APPLICATION_APPLIED = {
  applicationId: "app-1",
  driveId: "drive-1",
  companyName: "Acme Architects",
  title: "Junior Architect",
  type: "PLACEMENT",
  currentStatus: "APPLIED",
  interviewScheduledAt: null,
  interviewMode: null,
  appliedAt: "2026-08-01T00:00:00.000Z",
};

const APPLICATION_WITH_INTERVIEW = {
  applicationId: "app-2",
  driveId: "drive-2",
  companyName: "Studio Beta",
  title: "Design Intern",
  type: "INTERNSHIP",
  currentStatus: "INTERVIEW",
  interviewScheduledAt: "2026-08-15T10:00:00.000Z",
  interviewMode: "ONLINE",
  appliedAt: "2026-08-02T00:00:00.000Z",
};

const APPLICATION_WITH_OFFER = {
  applicationId: "app-3",
  driveId: "drive-3",
  companyName: "Foundation Works",
  title: "Structural Intern",
  type: "INTERNSHIP",
  currentStatus: "OFFER",
  interviewScheduledAt: null,
  interviewMode: null,
  appliedAt: "2026-08-03T00:00:00.000Z",
};

const APPLICATION_ACTIVE_INTERNSHIP = {
  applicationId: "app-4",
  driveId: "drive-4",
  companyName: "Horizon Works",
  title: "Site Intern",
  type: "INTERNSHIP",
  currentStatus: "ACTIVE",
  interviewScheduledAt: null,
  interviewMode: null,
  appliedAt: "2026-08-04T00:00:00.000Z",
};

const OPEN_DRIVE_NOT_APPLIED = {
  driveId: "drive-5",
  companyName: "Newline Studio",
  title: "Graduate Architect",
  type: "PLACEMENT",
  packageOrStipend: "10 LPA",
  description: null,
  applicationDeadline: null,
  hasApplied: false,
  applicationStatus: null,
};

const INTEREST_SENT = {
  id: "interest-1",
  companyName: "Vertex Studio",
  message: null,
  status: "SENT",
  sentAt: "2026-08-01T00:00:00.000Z",
  respondedAt: null,
};

const DRAFT = {
  id: "draft-1",
  studentProfileId: "student-1",
  status: "APPROVED",
  bio: "An aspiring architect.",
  skills: ["Rendering", "Sketching"],
  software: ["Rhino", "AutoCAD"],
  selectedProjects: [],
  portfolioLinks: ["https://alice.design"],
  resumeFileId: null,
  certifications: [],
  internships: [{ company: "Studio X", role: "Intern" }],
  reviewComment: null,
  submittedAt: "2026-07-20T00:00:00.000Z",
  reviewedByUserId: "sec-1",
  reviewedAt: "2026-07-25T00:00:00.000Z",
  createdAt: "2026-07-01T00:00:00.000Z",
  updatedAt: "2026-07-25T00:00:00.000Z",
};

const PUBLISHED = {
  id: "pub-1",
  studentProfileId: "student-1",
  bio: "An aspiring architect.",
  skills: ["Rendering", "Sketching"],
  software: ["Rhino", "AutoCAD"],
  selectedProjects: [],
  portfolioLinks: ["https://alice.design"],
  resumeFileId: null,
  certifications: [],
  internships: [{ company: "Studio X", role: "Intern" }],
  publishedFromDraftId: "draft-1",
  publishedAt: "2026-07-25T00:00:00.000Z",
  publishedByUserId: "sec-1",
  isPubliclyDiscoverable: true,
  showCgpa: false,
};

interface FixtureOptions {
  applications?: unknown[];
  openDrives?: unknown[];
  interests?: unknown[];
  draft?: unknown | null;
  published?: unknown | null;
}

function mockFetchWith({ applications = [], openDrives = [], interests = [], draft = DRAFT, published = null }: FixtureOptions) {
  fetchMock.mockImplementation((url: string) => {
    if (url.includes("/api/student/applications")) return Promise.resolve(jsonResponse(applications));
    if (url.includes("/api/student/drives")) return Promise.resolve(jsonResponse(openDrives));
    if (url.includes("/api/student/interests")) return Promise.resolve(jsonResponse(interests));
    if (url.includes("/profile/published")) return Promise.resolve(published ? jsonResponse(published) : jsonResponse(null, false));
    if (url.includes("/profile/draft")) return Promise.resolve(draft ? jsonResponse(draft) : jsonResponse(null, false));
    throw new Error(`Unexpected fetch: ${url}`);
  });
}

describe("Student Career Hub dashboard (/student — V4.0 D6)", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  it("shows correct application, interview, offer, and interest counts", async () => {
    mockFetchWith({ applications: [APPLICATION_APPLIED, APPLICATION_WITH_INTERVIEW, APPLICATION_WITH_OFFER], interests: [INTEREST_SENT] });
    render(<StudentDashboardPage />);

    expect(await screen.findByText("Career Hub")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument(); // Applications
    expect(screen.getAllByText("1")).toHaveLength(3); // Interviews, Offers, Interests each = 1
  });

  it("lists the upcoming interview with its date and mode", async () => {
    mockFetchWith({ applications: [APPLICATION_WITH_INTERVIEW] });
    render(<StudentDashboardPage />);

    // "Studio Beta" appears as its own text node in both "My Applications"
    // and "Upcoming Interviews" (the "Recent Activity" mention is embedded
    // inside a longer sentence, not a standalone node). The exact date
    // appears in both "Upcoming Interviews" and the synthesized "Recent
    // Activity" entry for the same interview.
    expect(await screen.findAllByText("Studio Beta")).toHaveLength(2);
    expect(screen.getAllByText(/2026-08-15/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/2026-08-15 · ONLINE/)).toBeInTheDocument();
  });

  it("shows empty states when there is no data yet", async () => {
    mockFetchWith({ draft: null });
    render(<StudentDashboardPage />);

    expect(await screen.findByText(/no interviews scheduled yet/i)).toBeInTheDocument();
    expect(screen.getByText(/haven't applied to any drives yet/i)).toBeInTheDocument();
    expect(screen.getByText(/no new open drives right now/i)).toBeInTheDocument();
    expect(screen.getByText(/no recruiters have expressed interest yet/i)).toBeInTheDocument();
    expect(screen.getByText(/nothing yet/i)).toBeInTheDocument();
  });

  it("shows the profile status badge, skills/software chips, and links to /student/profile", async () => {
    mockFetchWith({ draft: DRAFT });
    render(<StudentDashboardPage />);

    await screen.findByText("Career Hub");
    expect(screen.getByText("Approved")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /edit profile/i })).toHaveAttribute("href", "/student/profile");
    expect(screen.getByText("Rendering")).toBeInTheDocument();
    expect(screen.getByText("Rhino")).toBeInTheDocument();
    expect(screen.getByText(/1 portfolio link/)).toBeInTheDocument();
    expect(screen.getByText(/1 internship/)).toBeInTheDocument();
  });

  it("shows a 'View Public Profile' link only when the profile is published and publicly discoverable", async () => {
    mockFetchWith({ draft: DRAFT, published: PUBLISHED });
    render(<StudentDashboardPage />);

    await screen.findByText("Career Hub");
    expect(screen.getByRole("link", { name: /view public profile/i })).toHaveAttribute("href", "/directory/student-1");
    expect(screen.getByText(/visible to recruiters/i)).toBeInTheDocument();
  });

  it("does not show a 'View Public Profile' link when nothing is published yet", async () => {
    mockFetchWith({ draft: DRAFT, published: null });
    render(<StudentDashboardPage />);

    await screen.findByText("Career Hub");
    expect(screen.queryByRole("link", { name: /view public profile/i })).not.toBeInTheDocument();
  });

  it("shows an open drive not yet applied to in Placement Opportunities", async () => {
    mockFetchWith({ openDrives: [OPEN_DRIVE_NOT_APPLIED] });
    render(<StudentDashboardPage />);

    expect(await screen.findByText("Newline Studio")).toBeInTheDocument();
  });

  it("shows recruiter interest with an 'Awaiting response' label for SENT status", async () => {
    mockFetchWith({ interests: [INTEREST_SENT] });
    render(<StudentDashboardPage />);

    expect(await screen.findByText("Vertex Studio")).toBeInTheDocument();
    expect(screen.getByText(/awaiting response/i)).toBeInTheDocument();
  });

  it("shows a highlight banner for an ongoing internship", async () => {
    mockFetchWith({ applications: [APPLICATION_ACTIVE_INTERNSHIP] });
    render(<StudentDashboardPage />);

    expect(await screen.findByText(/ongoing internship/i)).toBeInTheDocument();
    // "Horizon Works" also appears in the "My Applications" panel below the banner.
    expect(screen.getAllByText("Horizon Works").length).toBeGreaterThanOrEqual(1);
  });

  it("synthesizes a Recent Activity feed from real application/interest/profile timestamps, without fabricating data", async () => {
    mockFetchWith({ applications: [APPLICATION_APPLIED], interests: [INTEREST_SENT], draft: DRAFT });
    render(<StudentDashboardPage />);

    await screen.findByText("Career Hub");
    expect(screen.getByText(/applied to acme architects/i)).toBeInTheDocument();
    expect(screen.getByText(/vertex studio expressed interest/i)).toBeInTheDocument();
    expect(screen.getByText(/submitted your profile for review/i)).toBeInTheDocument();
    expect(screen.getByText(/your profile was approved/i)).toBeInTheDocument();
  });

  it("links quick actions to applications, profile, interests, and reports", async () => {
    mockFetchWith({ draft: null });
    render(<StudentDashboardPage />);

    await screen.findByText("Career Hub");
    expect(screen.getByRole("link", { name: /browse open drives/i })).toHaveAttribute("href", "/student/applications");
    expect(screen.getByRole("link", { name: /^my profile$/i })).toHaveAttribute("href", "/student/profile");
    expect(screen.getByRole("link", { name: /my interests/i })).toHaveAttribute("href", "/student/interests");
    expect(screen.getByRole("link", { name: /my reports/i })).toHaveAttribute("href", "/student/reports");
  });
});
