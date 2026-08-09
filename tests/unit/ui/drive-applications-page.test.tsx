// @vitest-environment jsdom
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const fetchMock = vi.fn();

vi.mock("next/navigation", () => ({
  useParams: () => ({ id: "drive-1" }),
}));

vi.mock("@/modules/auth/client", () => ({
  useAuth: () => ({ accessToken: "test-access-token" }),
}));

import DriveApplicationsPage from "../../../src/app/(admin)/dashboard/placement-drives/[id]/applications/page";
import { ToastProvider } from "../../../src/components/ui/toast";

function renderPage() {
  return render(
    <ToastProvider>
      <DriveApplicationsPage />
    </ToastProvider>,
  );
}

function jsonResponse(body: unknown) {
  return { ok: true, status: 200, json: async () => ({ data: body }) };
}

const DRIVE = {
  id: "drive-1",
  companyId: "c1",
  companyName: "Acme Architects",
  title: "Campus Placement 2026",
  type: "PLACEMENT",
  eligibility: { eligibleBatchIds: ["b1"] },
  packageOrStipend: null,
  description: null,
  status: "ANNOUNCED",
  applicationDeadline: null,
  createdByUserId: "sec-1",
  createdAt: "",
  updatedAt: "",
};

const APPLIED_ROW = {
  applicationId: "app-1",
  studentProfileId: "s1",
  studentName: "Alice Architect",
  batchName: "B.Arch 2026",
  currentStatus: "APPLIED",
  currentRound: null,
  interviewScheduledAt: null,
  interviewMode: null,
  appliedAt: "2026-01-01T00:00:00.000Z",
};

function mockFetchWith(applications: unknown[], drive: unknown = DRIVE) {
  fetchMock.mockImplementation((url: string) => {
    if (url.includes("/applications")) return Promise.resolve(jsonResponse(applications));
    if (url.includes("/api/placements/drives/drive-1")) return Promise.resolve(jsonResponse(drive));
    throw new Error(`Unexpected fetch: ${url}`);
  });
}

const OUTCOME = {
  id: "outcome-1",
  applicationId: "app-1",
  certificateFileId: null,
  companyFeedback: null,
  studentFeedback: null,
  completedAt: null,
  createdAt: "",
  updatedAt: "",
};

describe("DriveApplicationsPage (V4.0 D3)", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  it("shows an empty state when no one has applied", async () => {
    mockFetchWith([]);
    renderPage();
    expect(await screen.findByText(/no one has applied to this drive yet/i)).toBeInTheDocument();
  });

  it("groups applications under a status heading with a count badge", async () => {
    mockFetchWith([APPLIED_ROW]);
    renderPage();

    expect(await screen.findByRole("heading", { name: "Applied" })).toBeInTheDocument();
    expect(screen.getByText("Alice Architect")).toBeInTheDocument();
    expect(screen.getByText("B.Arch 2026")).toBeInTheDocument();
    expect(screen.getByText("Not scheduled")).toBeInTheDocument();
  });

  it("updates an application's status", async () => {
    mockFetchWith([APPLIED_ROW]);
    const user = userEvent.setup();
    renderPage();
    await screen.findByText("Alice Architect");

    fetchMock.mockResolvedValueOnce(jsonResponse({ ...APPLIED_ROW, currentStatus: "SHORTLISTED" }));
    mockFetchWith([{ ...APPLIED_ROW, currentStatus: "SHORTLISTED" }]);

    await user.selectOptions(screen.getByLabelText(/move alice architect to/i), "SHORTLISTED");
    await user.click(screen.getByRole("button", { name: /^update$/i }));

    await waitFor(() => expect(screen.getByRole("heading", { name: "Shortlisted" })).toBeInTheDocument());
    const [url, init] = fetchMock.mock.calls.find((call) => (call[0] as string).includes("/status"))!;
    expect(url).toBe("/api/placements/applications/app-1/status");
    expect(JSON.parse((init as { body: string }).body)).toEqual({ toStatus: "SHORTLISTED" });
  });

  it("opens the schedule-interview modal and submits it", async () => {
    mockFetchWith([APPLIED_ROW]);
    const user = userEvent.setup();
    renderPage();
    await screen.findByText("Alice Architect");

    await user.click(screen.getByRole("button", { name: /^schedule$/i }));
    expect(screen.getByRole("dialog", { name: /schedule interview — alice architect/i })).toBeInTheDocument();

    await user.type(screen.getByLabelText(/date & time/i), "2026-03-01T10:00");
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ ...APPLIED_ROW, interviewScheduledAt: "2026-03-01T10:00:00.000Z", interviewMode: "ONLINE" }),
    );
    mockFetchWith([{ ...APPLIED_ROW, interviewScheduledAt: "2026-03-01T10:00:00.000Z", interviewMode: "ONLINE" }]);

    await user.click(screen.getByRole("button", { name: /^save$/i }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(await screen.findByText(/online/i)).toBeInTheDocument();
  });

  it("shows an Internship Outcome column only for an INTERNSHIP drive, and only for ACTIVE/COMPLETED rows", async () => {
    mockFetchWith(
      [
        { ...APPLIED_ROW, currentStatus: "ACTIVE" },
        { ...APPLIED_ROW, applicationId: "app-2", studentName: "Bob Builder", currentStatus: "SHORTLISTED" },
      ],
      { ...DRIVE, type: "INTERNSHIP" },
    );
    renderPage();
    await screen.findByText("Alice Architect");

    expect(screen.getAllByRole("columnheader", { name: /internship outcome/i }).length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: /view \/ edit outcome/i })).toBeInTheDocument();
  });

  it("opens the internship outcome modal and saves company feedback", async () => {
    mockFetchWith([{ ...APPLIED_ROW, currentStatus: "ACTIVE" }], { ...DRIVE, type: "INTERNSHIP" });
    const user = userEvent.setup();
    renderPage();
    await screen.findByText("Alice Architect");

    fetchMock.mockResolvedValueOnce(jsonResponse(OUTCOME));
    await user.click(screen.getByRole("button", { name: /view \/ edit outcome/i }));
    expect(await screen.findByRole("dialog", { name: /internship outcome — alice architect/i })).toBeInTheDocument();

    await user.type(screen.getByLabelText(/company feedback/i), "Excellent work ethic.");
    fetchMock.mockResolvedValueOnce(jsonResponse({ ...OUTCOME, companyFeedback: "Excellent work ethic." }));
    await user.click(screen.getByRole("button", { name: /^save feedback$/i }));

    const [url, init] = fetchMock.mock.calls.find(
      (call) => (call[0] as string).includes("/outcome") && (call[1] as { method?: string })?.method === "PATCH",
    )!;
    expect(url).toBe("/api/placements/applications/app-1/outcome");
    expect(JSON.parse((init as { body: string }).body)).toEqual({ companyFeedback: "Excellent work ethic." });
  });
});
