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

function mockFetchWith(overrides: Partial<{ students: unknown; batches: unknown; approvalQueue: unknown; audit: unknown }>) {
  fetchMock.mockImplementation((url: string) => {
    if (url.includes("/api/students")) return Promise.resolve(jsonResponse(overrides.students ?? STUDENTS));
    if (url.includes("/api/batches")) return Promise.resolve(jsonResponse(overrides.batches ?? BATCHES));
    if (url.includes("/api/profiles/approval-queue")) return Promise.resolve(jsonResponse(overrides.approvalQueue ?? APPROVAL_QUEUE));
    if (url.includes("/api/audit/recent")) return Promise.resolve(jsonResponse(overrides.audit ?? AUDIT_ENTRIES));
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

  it("renders all four quick action links", async () => {
    mockFetchWith({});
    render(<DashboardOverviewPage />);
    await screen.findByText("Total Students");

    for (const label of ["Review Approvals", "Manage Batches", "View Students", "View Audit Log"]) {
      expect(screen.getByRole("link", { name: label })).toBeInTheDocument();
    }
  });

  it("renders the pending approvals list with a Review link per item", async () => {
    mockFetchWith({});
    render(<DashboardOverviewPage />);

    expect(await screen.findByText("Alice Architect")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Review" })).toHaveAttribute("href", "/dashboard/approvals/sp1");
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

  it("shows the Recruiter Directory export shortcut and recruiter-activity link for a Secretary", async () => {
    mockFetchWith({});
    render(<DashboardOverviewPage />);

    await screen.findByText("Total Students");
    expect(screen.getByText("Recruiter Directory")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /recruiter directory export/i })).toHaveAttribute("href", "/dashboard/exports");
  });

  it("hides the Secretary-only export shortcut and recruiter-activity link for a Coordinator", async () => {
    mockAuthState = { accessToken: "test-access-token", role: "COORDINATOR" };
    mockFetchWith({});
    render(<DashboardOverviewPage />);

    await screen.findByText("Total Students");
    expect(screen.queryByText("Recruiter Directory")).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /recruiter directory export/i })).not.toBeInTheDocument();
  });

  it("shows an error message if any dashboard fetch fails", async () => {
    fetchMock.mockImplementation(() =>
      Promise.resolve({ ok: false, status: 500, json: async () => ({ error: { code: "INTERNAL", message: "Unable to load dashboard statistics." } }) }),
    );
    render(<DashboardOverviewPage />);

    await waitFor(() => expect(screen.getByText("Unable to load dashboard statistics.")).toBeInTheDocument());
  });
});
