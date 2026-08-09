// @vitest-environment jsdom
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const fetchMock = vi.fn();
let mockAuthState: { accessToken: string | null; role: string | null };

vi.mock("next/navigation", () => ({
  useParams: () => ({ id: "drive-1" }),
}));

vi.mock("@/modules/auth/client", () => ({
  useAuth: () => mockAuthState,
}));

import PlacementDriveDetailPage from "../../../src/app/(admin)/dashboard/placement-drives/[id]/page";
import { ToastProvider } from "../../../src/components/ui/toast";

function renderPage() {
  return render(
    <ToastProvider>
      <PlacementDriveDetailPage />
    </ToastProvider>,
  );
}

function jsonResponse(body: unknown) {
  return { ok: true, status: 200, json: async () => ({ data: body }) };
}

const COMPANIES = [{ id: "c1", name: "Acme Architects", sector: null, website: null, logoFileId: null, isActive: true, createdAt: "", updatedAt: "" }];
const BATCHES = [{ id: "b1", name: "B.Arch 2026", year: 2026, status: "ACTIVE", createdAt: "", updatedAt: "" }];

const DRAFT_DRIVE = {
  id: "drive-1",
  companyId: "c1",
  companyName: "Acme Architects",
  title: "Campus Placement 2026",
  type: "PLACEMENT",
  eligibility: { eligibleBatchIds: ["b1"], minCgpa: 7 },
  packageOrStipend: "12 LPA",
  description: "Great opportunity",
  status: "DRAFT",
  applicationDeadline: null,
  createdByUserId: "sec-1",
  createdAt: "",
  updatedAt: "",
};

function mockFetchWith(drive: unknown) {
  fetchMock.mockImplementation((url: string) => {
    if (url.includes("/api/placements/drives/drive-1")) return Promise.resolve(jsonResponse(drive));
    if (url.includes("/api/companies")) return Promise.resolve(jsonResponse(COMPANIES));
    if (url.includes("/api/batches")) return Promise.resolve(jsonResponse(BATCHES));
    throw new Error(`Unexpected fetch: ${url}`);
  });
}

describe("PlacementDriveDetailPage (V4.0 D2)", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  it("renders drive details", async () => {
    mockAuthState = { accessToken: "test-access-token", role: "SECRETARY" };
    mockFetchWith(DRAFT_DRIVE);
    renderPage();

    expect(await screen.findByRole("heading", { name: "Campus Placement 2026" })).toBeInTheDocument();
    expect(screen.getByText("Acme Architects")).toBeInTheDocument();
    expect(screen.getByText("12 LPA")).toBeInTheDocument();
  });

  it("shows a Publish button for a Secretary on a DRAFT drive, and it announces the drive", async () => {
    mockAuthState = { accessToken: "test-access-token", role: "SECRETARY" };
    mockFetchWith(DRAFT_DRIVE);
    const user = userEvent.setup();
    renderPage();
    await screen.findByRole("heading", { name: "Campus Placement 2026" });

    fetchMock.mockResolvedValueOnce(jsonResponse({ ...DRAFT_DRIVE, status: "ANNOUNCED" }));
    mockFetchWith({ ...DRAFT_DRIVE, status: "ANNOUNCED" });
    await user.click(screen.getByRole("button", { name: /^publish$/i }));

    await waitFor(() => expect(screen.getByText("ANNOUNCED")).toBeInTheDocument());
  });

  it("never shows a Publish button for a Coordinator — publishing is Secretary-only", async () => {
    mockAuthState = { accessToken: "test-access-token", role: "COORDINATOR" };
    mockFetchWith(DRAFT_DRIVE);
    renderPage();
    await screen.findByRole("heading", { name: "Campus Placement 2026" });

    expect(screen.queryByRole("button", { name: /^publish$/i })).not.toBeInTheDocument();
    expect(screen.getByText(/only the secretary can publish/i)).toBeInTheDocument();
  });

  it("shows a status-transition button for an ANNOUNCED drive", async () => {
    mockAuthState = { accessToken: "test-access-token", role: "SECRETARY" };
    mockFetchWith({ ...DRAFT_DRIVE, status: "ANNOUNCED" });
    renderPage();
    await screen.findByRole("heading", { name: "Campus Placement 2026" });

    expect(screen.getByRole("button", { name: /move to in progress/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /move to closed/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^publish$/i })).not.toBeInTheDocument();
  });

  it("links to the application board (V4.0 D3)", async () => {
    mockAuthState = { accessToken: "test-access-token", role: "SECRETARY" };
    mockFetchWith(DRAFT_DRIVE);
    renderPage();
    await screen.findByRole("heading", { name: "Campus Placement 2026" });

    expect(screen.getByRole("link", { name: /view applications/i })).toHaveAttribute(
      "href",
      "/dashboard/placement-drives/drive-1/applications",
    );
  });

  it("links back to /dashboard/placement-drives for a PLACEMENT drive", async () => {
    mockAuthState = { accessToken: "test-access-token", role: "SECRETARY" };
    mockFetchWith(DRAFT_DRIVE);
    renderPage();
    await screen.findByRole("heading", { name: "Campus Placement 2026" });

    expect(screen.getByRole("link", { name: /back to placement drives/i })).toHaveAttribute(
      "href",
      "/dashboard/placement-drives",
    );
  });

  it("links back to /dashboard/internships for an INTERNSHIP drive", async () => {
    mockAuthState = { accessToken: "test-access-token", role: "SECRETARY" };
    mockFetchWith({ ...DRAFT_DRIVE, type: "INTERNSHIP" });
    renderPage();
    await screen.findByRole("heading", { name: "Campus Placement 2026" });

    expect(screen.getByRole("link", { name: /back to internships/i })).toHaveAttribute("href", "/dashboard/internships");
  });

  it("opens the edit modal", async () => {
    mockAuthState = { accessToken: "test-access-token", role: "SECRETARY" };
    mockFetchWith(DRAFT_DRIVE);
    const user = userEvent.setup();
    renderPage();
    await screen.findByRole("heading", { name: "Campus Placement 2026" });

    await user.click(screen.getByRole("button", { name: /^edit$/i }));
    expect(screen.getByRole("dialog", { name: /edit drive/i })).toBeInTheDocument();
  });
});
