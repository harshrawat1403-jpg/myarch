// @vitest-environment jsdom
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const fetchMock = vi.fn();

vi.mock("@/modules/auth/client", () => ({
  useAuth: () => ({ accessToken: "test-access-token" }),
}));

import ApprovalQueuePage from "../../../src/app/(admin)/dashboard/approvals/page";

function jsonResponse(body: unknown) {
  return { ok: true, status: 200, json: async () => ({ data: body }) };
}

const OLD_SUBMITTED = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString();
const RECENT_SUBMITTED = new Date().toISOString();

const BATCHES = [
  { id: "b1", name: "B.Arch 2026", year: 2026, status: "ACTIVE", createdAt: "2024-01-01", updatedAt: "2024-01-01" },
  { id: "b2", name: "B.Plan 2027", year: 2027, status: "ACTIVE", createdAt: "2024-01-01", updatedAt: "2024-01-01" },
];

const QUEUE = [
  { draftId: "d-recent", studentProfileId: "sp-recent", studentFullName: "Priya Planner", batchId: "b2", submittedAt: RECENT_SUBMITTED },
  { draftId: "d-old", studentProfileId: "sp-old", studentFullName: "Alice Architect", batchId: "b1", submittedAt: OLD_SUBMITTED },
];

const AUDIT_ENTRIES = [
  { id: "a1", actorUserId: "u1", action: "PROFILE_APPROVED", targetEntityType: "StudentPublicProfileDraft", targetEntityId: "x", metadata: {}, occurredAt: "2026-08-01T00:00:00.000Z" },
  { id: "a2", actorUserId: "u1", action: "PROFILE_CHANGES_REQUESTED", targetEntityType: "StudentPublicProfileDraft", targetEntityId: "y", metadata: {}, occurredAt: "2026-07-30T00:00:00.000Z" },
  { id: "a3", actorUserId: "u1", action: "LOGIN_SUCCESS", targetEntityType: "User", targetEntityId: "z", metadata: {}, occurredAt: "2026-07-29T00:00:00.000Z" },
];

function mockFetchWith(overrides: Partial<{ queue: unknown; batches: unknown; audit: unknown }> = {}) {
  fetchMock.mockImplementation((url: string) => {
    if (url.includes("/api/profiles/approval-queue")) return Promise.resolve(jsonResponse(overrides.queue ?? QUEUE));
    if (url.includes("/api/batches")) return Promise.resolve(jsonResponse(overrides.batches ?? BATCHES));
    if (url.includes("/api/audit/recent")) return Promise.resolve(jsonResponse(overrides.audit ?? AUDIT_ENTRIES));
    throw new Error(`Unexpected fetch: ${url}`);
  });
}

describe("Approval Workspace page", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  it("shows a loading state before data resolves", () => {
    fetchMock.mockImplementation(() => new Promise(() => {}));
    render(<ApprovalQueuePage />);
    expect(screen.getByText(/loading approval queue/i)).toBeInTheDocument();
  });

  it("loads the queue, resolving each item's batch name", async () => {
    mockFetchWith();
    render(<ApprovalQueuePage />);

    expect(await screen.findAllByText("Alice Architect")).not.toHaveLength(0);
    expect(screen.getAllByText("Priya Planner").length).toBeGreaterThan(0);
    expect(screen.getAllByText("B.Arch 2026").length).toBeGreaterThan(0);
    expect(screen.getAllByText("B.Plan 2027").length).toBeGreaterThan(0);
  });

  it("sorts the oldest submission first", async () => {
    mockFetchWith();
    render(<ApprovalQueuePage />);
    await screen.findAllByText("Alice Architect");

    const table = screen.getByRole("table");
    const rows = within(table).getAllByRole("row").slice(1); // drop header row
    expect(within(rows[0]!).getByText("Alice Architect")).toBeInTheDocument();
    expect(within(rows[1]!).getByText("Priya Planner")).toBeInTheDocument();
  });

  it("flags a submission waiting 3+ days with a priority badge", async () => {
    mockFetchWith();
    render(<ApprovalQueuePage />);
    await screen.findAllByText("Alice Architect");

    expect(screen.getAllByText(/waiting 10d/i).length).toBeGreaterThan(0);
  });

  it("shows the three summary stats", async () => {
    mockFetchWith();
    render(<ApprovalQueuePage />);
    await screen.findAllByText("Alice Architect");

    expect(screen.getByText("Pending Review")).toBeInTheDocument();
    expect(screen.getByText("Oldest Waiting")).toBeInTheDocument();
    expect(screen.getByText("Batches Represented")).toBeInTheDocument();
  });

  it("filters the queue by student name", async () => {
    const user = userEvent.setup();
    mockFetchWith();
    render(<ApprovalQueuePage />);
    await screen.findAllByText("Alice Architect");

    await user.type(screen.getByLabelText("Student name"), "Priya");

    expect(screen.queryAllByText("Alice Architect")).toHaveLength(0);
    expect(screen.getAllByText("Priya Planner").length).toBeGreaterThan(0);
    expect(await screen.findByRole("button", { name: "Clear filters" })).toBeInTheDocument();
  });

  it("clears filters when Clear filters is clicked", async () => {
    const user = userEvent.setup();
    mockFetchWith();
    render(<ApprovalQueuePage />);
    await screen.findAllByText("Alice Architect");

    await user.type(screen.getByLabelText("Student name"), "Priya");
    await user.click(await screen.findByRole("button", { name: "Clear filters" }));

    expect(screen.getAllByText("Alice Architect").length).toBeGreaterThan(0);
    expect(screen.getByLabelText("Student name")).toHaveValue("");
  });

  it("shows an empty state when the queue is empty", async () => {
    mockFetchWith({ queue: [] });
    render(<ApprovalQueuePage />);
    expect(await screen.findByText("No pending submissions.")).toBeInTheDocument();
  });

  it("shows a filtered-empty state distinct from a genuinely empty queue", async () => {
    const user = userEvent.setup();
    mockFetchWith();
    render(<ApprovalQueuePage />);
    await screen.findAllByText("Alice Architect");

    await user.type(screen.getByLabelText("Student name"), "Nobody");

    expect(await screen.findByText("No submissions match the current filters.")).toBeInTheDocument();
  });

  it("shows review history filtered to review-related audit actions only", async () => {
    mockFetchWith();
    render(<ApprovalQueuePage />);
    await screen.findAllByText("Alice Architect");

    expect(screen.getByText("Profile approved")).toBeInTheDocument();
    expect(screen.getByText("Changes requested")).toBeInTheDocument();
    expect(screen.queryByText(/login/i)).not.toBeInTheDocument();
  });

  it("links each queue item to its review page", async () => {
    mockFetchWith();
    render(<ApprovalQueuePage />);
    await screen.findAllByText("Alice Architect");

    const reviewLinks = screen.getAllByRole("link", { name: /review/i });
    expect(reviewLinks.some((link) => link.getAttribute("href") === "/dashboard/approvals/sp-old")).toBe(true);
  });

  it("shows an error message when a fetch fails", async () => {
    fetchMock.mockImplementation(() =>
      Promise.resolve({ ok: false, status: 500, json: async () => ({ error: { code: "INTERNAL", message: "Unable to load the approval queue." } }) }),
    );
    render(<ApprovalQueuePage />);
    expect(await screen.findByText("Unable to load the approval queue.")).toBeInTheDocument();
  });
});
