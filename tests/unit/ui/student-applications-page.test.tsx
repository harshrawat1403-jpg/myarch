// @vitest-environment jsdom
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const fetchMock = vi.fn();

vi.mock("@/modules/auth/client", () => ({
  useAuth: () => ({ accessToken: "test-access-token" }),
}));

import StudentApplicationsPage from "../../../src/app/(student)/student/applications/page";
import { ToastProvider } from "../../../src/components/ui/toast";

function renderPage() {
  return render(
    <ToastProvider>
      <StudentApplicationsPage />
    </ToastProvider>,
  );
}

function jsonResponse(body: unknown) {
  return { ok: true, status: 200, json: async () => ({ data: body }) };
}

const OPEN_DRIVE = {
  driveId: "drive-1",
  companyName: "Acme Architects",
  title: "Campus Placement 2026",
  type: "PLACEMENT",
  packageOrStipend: "12 LPA",
  description: null,
  applicationDeadline: null,
  hasApplied: false,
  applicationStatus: null,
};

const MY_APPLICATION = {
  applicationId: "app-1",
  driveId: "drive-2",
  companyName: "Beta Corp",
  title: "Internship 2026",
  type: "INTERNSHIP",
  currentStatus: "APPLIED",
  appliedAt: "2026-01-01T00:00:00.000Z",
};

function mockFetchWith(openDrives: unknown[], applications: unknown[]) {
  fetchMock.mockImplementation((url: string) => {
    if (url.includes("/api/student/drives")) return Promise.resolve(jsonResponse(openDrives));
    if (url.includes("/api/student/applications")) return Promise.resolve(jsonResponse(applications));
    throw new Error(`Unexpected fetch: ${url}`);
  });
}

describe("Student applications page (/student/applications) — V4.0 D2", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  it("shows empty states when there are no open drives or applications", async () => {
    mockFetchWith([], []);
    renderPage();

    expect(await screen.findByText(/no open drives right now/i)).toBeInTheDocument();
    expect(screen.getByText(/haven't applied to any drives yet/i)).toBeInTheDocument();
  });

  it("lists an open drive with an Apply button", async () => {
    mockFetchWith([OPEN_DRIVE], []);
    renderPage();

    expect(await screen.findByText("Acme Architects")).toBeInTheDocument();
    expect(screen.getByText("Campus Placement 2026")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^apply$/i })).toBeInTheDocument();
  });

  it("applies to a drive and shows the applied badge instead of the Apply button", async () => {
    mockFetchWith([OPEN_DRIVE], []);
    const user = userEvent.setup();
    renderPage();
    await screen.findByText("Acme Architects");

    fetchMock.mockResolvedValueOnce(jsonResponse({ id: "app-new", currentStatus: "APPLIED" }));
    mockFetchWith([{ ...OPEN_DRIVE, hasApplied: true, applicationStatus: "APPLIED" }], []);

    await user.click(screen.getByRole("button", { name: /^apply$/i }));

    await waitFor(() => expect(screen.queryByRole("button", { name: /^apply$/i })).not.toBeInTheDocument());
    expect(await screen.findByText(/applied — applied/i)).toBeInTheDocument();
  });

  it("lists an application with a Withdraw button for a non-terminal status", async () => {
    mockFetchWith([], [MY_APPLICATION]);
    renderPage();

    expect(await screen.findByText("Beta Corp")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^withdraw$/i })).toBeInTheDocument();
  });

  it("never shows a Withdraw button for a terminal-status application", async () => {
    mockFetchWith([], [{ ...MY_APPLICATION, currentStatus: "REJECTED" }]);
    renderPage();

    await screen.findByText("Beta Corp");
    expect(screen.queryByRole("button", { name: /^withdraw$/i })).not.toBeInTheDocument();
  });

  it("withdraws an application", async () => {
    mockFetchWith([], [MY_APPLICATION]);
    const user = userEvent.setup();
    renderPage();
    await screen.findByText("Beta Corp");

    fetchMock.mockResolvedValueOnce(jsonResponse({ ...MY_APPLICATION, currentStatus: "WITHDRAWN" }));
    mockFetchWith([], [{ ...MY_APPLICATION, currentStatus: "WITHDRAWN" }]);

    await user.click(screen.getByRole("button", { name: /^withdraw$/i }));

    await waitFor(() => expect(screen.queryByRole("button", { name: /^withdraw$/i })).not.toBeInTheDocument());
  });

  it("shows an Internship Outcome action only for an INTERNSHIP application that has reached ACTIVE/COMPLETED (V4.0 D4)", async () => {
    mockFetchWith([], [{ ...MY_APPLICATION, currentStatus: "ACTIVE" }]);
    renderPage();
    await screen.findByText("Beta Corp");

    expect(screen.getByRole("button", { name: /internship outcome/i })).toBeInTheDocument();
  });

  it("never shows the Internship Outcome action for a PLACEMENT application", async () => {
    mockFetchWith([], [{ ...MY_APPLICATION, type: "PLACEMENT", currentStatus: "ACCEPTED" }]);
    renderPage();
    await screen.findByText("Beta Corp");

    expect(screen.queryByRole("button", { name: /internship outcome/i })).not.toBeInTheDocument();
  });

  it("opens the internship outcome modal and submits the student's own feedback", async () => {
    mockFetchWith([], [{ ...MY_APPLICATION, currentStatus: "ACTIVE" }]);
    const user = userEvent.setup();
    renderPage();
    await screen.findByText("Beta Corp");

    const outcome = {
      id: "outcome-1",
      applicationId: "app-1",
      certificateFileId: null,
      companyFeedback: "Great intern.",
      studentFeedback: null,
      completedAt: null,
      createdAt: "",
      updatedAt: "",
    };
    fetchMock.mockResolvedValueOnce(jsonResponse(outcome));
    await user.click(screen.getByRole("button", { name: /internship outcome/i }));
    expect(await screen.findByRole("dialog", { name: /internship outcome — beta corp/i })).toBeInTheDocument();
    expect(screen.getByText("Great intern.")).toBeInTheDocument();

    await user.type(screen.getByLabelText(/your feedback/i), "Learned a lot.");
    fetchMock.mockResolvedValueOnce(jsonResponse({ ...outcome, studentFeedback: "Learned a lot." }));
    await user.click(screen.getByRole("button", { name: /^save feedback$/i }));

    const [url, init] = fetchMock.mock.calls.find((call) => (call[0] as string).includes("student-feedback"))!;
    expect(url).toBe("/api/placements/applications/app-1/outcome/student-feedback");
    expect(JSON.parse((init as { body: string }).body)).toEqual({ studentFeedback: "Learned a lot." });
  });
});
