// @vitest-environment jsdom
import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const fetchMock = vi.fn();
let mockAuthState: { accessToken: string | null; role: string | null };

vi.mock("@/modules/auth/client", () => ({
  useAuth: () => mockAuthState,
}));

import DashboardOverviewPage from "../../../src/app/(admin)/dashboard/page";

function jsonResponse(body: unknown) {
  return { ok: true, status: 200, json: async () => ({ data: body }) };
}

const STUDENTS = [
  { id: "s1", isActive: true },
  { id: "s2", isActive: true },
  { id: "s3", isActive: false },
];

const BATCHES = [
  { id: "b1", name: "B.Arch 2026", year: 2026, status: "ACTIVE", createdAt: "2024-01-01", updatedAt: "2024-01-01" },
  { id: "b2", name: "B.Arch 2025", year: 2025, status: "GRADUATED", createdAt: "2023-01-01", updatedAt: "2023-01-01" },
];

const APPROVAL_QUEUE = [
  { draftId: "d1", studentProfileId: "sp1", studentFullName: "Alice Architect", batchId: "b1", submittedAt: "2026-01-01" },
];

const AUDIT_ENTRIES = [
  {
    id: "a1",
    actorUserId: "u1",
    action: "PROFILE_APPROVED",
    targetEntityType: "StudentProfile",
    targetEntityId: "sp1",
    metadata: {},
    occurredAt: "2026-01-02T00:00:00.000Z",
  },
];

const PENDING_REGISTRATIONS = [
  { id: "r1", email: "new@vnit.ac.in", fullName: "New Applicant", rollNumber: "BA2026099", batchId: "b1", status: "SUBMITTED", createdAt: "2026-01-01" },
];

// Deliberately distinct from every other number rendered on this page (student/batch
// counts, badges) — this page renders many small numbers, so incidental collisions
// between unrelated fixtures make `getByText` assertions ambiguous.
const PLACEMENT_FUNNEL = {
  type: "PLACEMENT",
  applied: 41,
  reachedShortlisted: 33,
  reachedInterview: 27,
  reachedOffer: 19,
  reachedAccepted: 13,
  placed: 13,
  interviewsScheduled: 22,
  currentStatusBreakdown: [],
  companiesRecruited: [],
  filters: { type: "PLACEMENT" },
};

function mockFetchWith(
  overrides: Partial<{ students: unknown; batches: unknown; approvalQueue: unknown; audit: unknown; registrations: unknown; placementFunnel: unknown }>,
) {
  fetchMock.mockImplementation((url: string) => {
    if (url.includes("/api/students")) return Promise.resolve(jsonResponse(overrides.students ?? STUDENTS));
    if (url.includes("/api/batches")) return Promise.resolve(jsonResponse(overrides.batches ?? BATCHES));
    if (url.includes("/api/profiles/approval-queue")) return Promise.resolve(jsonResponse(overrides.approvalQueue ?? APPROVAL_QUEUE));
    if (url.includes("/api/audit/recent")) return Promise.resolve(jsonResponse(overrides.audit ?? AUDIT_ENTRIES));
    if (url.includes("/api/registration")) return Promise.resolve(jsonResponse(overrides.registrations ?? PENDING_REGISTRATIONS));
    if (url.includes("/api/reports/placements")) return Promise.resolve(jsonResponse(overrides.placementFunnel ?? PLACEMENT_FUNNEL));
    throw new Error(`Unexpected fetch: ${url}`);
  });
}

describe("Dashboard Overview page — operational control center", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
    mockAuthState = { accessToken: "test-access-token", role: "SECRETARY" };
  });

  it("shows a loading state before data resolves", () => {
    fetchMock.mockImplementation(() => new Promise(() => {}));
    render(<DashboardOverviewPage />);

    expect(screen.getByText(/loading dashboard/i)).toBeInTheDocument();
  });

  it("renders the four key statistics computed from existing data only", async () => {
    mockFetchWith({});
    render(<DashboardOverviewPage />);

    expect(await screen.findByText("Total Students")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument(); // total students: STUDENTS.length
    expect(screen.getByText("2")).toBeInTheDocument(); // active students: s1 + s2
    expect(screen.getByText("Active Batches")).toBeInTheDocument();
    expect(screen.getByText("Of 2 total")).toBeInTheDocument(); // 1 ACTIVE of 2 batches total
  });

  it("renders the quick action links (V4.0 E8 — Registrations, Placement Drives, and Publications join the existing four)", async () => {
    mockFetchWith({});
    render(<DashboardOverviewPage />);
    await screen.findByText("Total Students");

    for (const label of ["Review Approvals", "Registrations", "Placement Drives", "Manage Batches", "View Students", "Publications"]) {
      expect(screen.getByRole("link", { name: label })).toBeInTheDocument();
    }
  });

  it("renders the pending approvals list with a Review link per item", async () => {
    mockFetchWith({});
    render(<DashboardOverviewPage />);

    expect(await screen.findByText("Alice Architect")).toBeInTheDocument();
    const reviewLinks = screen.getAllByRole("link", { name: "Review" });
    expect(reviewLinks.some((link) => link.getAttribute("href") === "/dashboard/approvals/sp1")).toBe(true);
  });

  it("shows an empty state when there are no pending approvals", async () => {
    mockFetchWith({ approvalQueue: [] });
    render(<DashboardOverviewPage />);

    expect(await screen.findByText("No submissions waiting for review.")).toBeInTheDocument();
  });

  it("renders recent activity from the existing audit endpoint, in human-readable form", async () => {
    mockFetchWith({});
    render(<DashboardOverviewPage />);

    expect(await screen.findByText("Profile approved")).toBeInTheDocument();
  });

  it("shows an empty state when there is no recent activity", async () => {
    mockFetchWith({ audit: [] });
    render(<DashboardOverviewPage />);

    expect(await screen.findByText("No recent activity.")).toBeInTheDocument();
  });

  it("renders batch overview cards with a status badge", async () => {
    mockFetchWith({});
    render(<DashboardOverviewPage />);

    expect(await screen.findByRole("heading", { name: "B.Arch 2026" })).toBeInTheDocument();
    expect(screen.getByText("ACTIVE")).toBeInTheDocument();
    expect(screen.getByText("GRADUATED")).toBeInTheDocument();
  });

  it("V4.0 E8: renders Pending Registrations, reusing the same real endpoint the Registrations page uses", async () => {
    mockFetchWith({});
    render(<DashboardOverviewPage />);

    expect(await screen.findByText("New Applicant")).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: "Review" }).length).toBeGreaterThanOrEqual(1);
  });

  it("shows an empty state when there are no pending registrations", async () => {
    mockFetchWith({ registrations: [] });
    render(<DashboardOverviewPage />);

    expect(await screen.findByText("No registration requests awaiting review.")).toBeInTheDocument();
  });

  it("V4.0 E8: renders the Placement Pipeline panel from the real E7 Reports API, not a re-derived computation", async () => {
    mockFetchWith({});
    render(<DashboardOverviewPage />);

    await screen.findByText("Total Students");
    expect(screen.getByText("Placement Pipeline")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Full Report" })).toHaveAttribute("href", "/dashboard/reports/placements");
    // fetched from /api/reports/placements — asserts the panel is wired to the real E7 endpoint, not a duplicate aggregation.
    expect(fetchMock.mock.calls.some(([url]) => String(url).includes("/api/reports/placements?type=PLACEMENT"))).toBe(true);
  });

  it("shows an empty state when there is no placement activity yet", async () => {
    mockFetchWith({ placementFunnel: { ...PLACEMENT_FUNNEL, applied: 0 } });
    render(<DashboardOverviewPage />);

    expect(await screen.findByText("No placement applications yet this cycle.")).toBeInTheDocument();
  });

  it("shows an error message if any dashboard fetch fails", async () => {
    fetchMock.mockImplementation(() =>
      Promise.resolve({ ok: false, status: 500, json: async () => ({ error: { code: "INTERNAL", message: "Unable to load dashboard statistics." } }) }),
    );
    render(<DashboardOverviewPage />);

    await waitFor(() => expect(screen.getByText("Unable to load dashboard statistics.")).toBeInTheDocument());
  });
});
