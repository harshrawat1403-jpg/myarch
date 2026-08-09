// @vitest-environment jsdom
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const fetchMock = vi.fn();
let mockAuthState: { accessToken: string | null; role: string | null };

vi.mock("@/modules/auth/client", () => ({
  useAuth: () => mockAuthState,
}));

import { PlacementDriveListPage } from "../../../src/components/placements/placement-drive-list-page";

function jsonResponse(body: unknown) {
  return { ok: true, status: 200, json: async () => ({ data: body }) };
}

const COMPANIES = [{ id: "c1", name: "Acme Architects", sector: null, website: null, logoFileId: null, isActive: true, createdAt: "", updatedAt: "" }];
const BATCHES = [{ id: "b1", name: "B.Arch 2026", year: 2026, status: "ACTIVE", createdAt: "", updatedAt: "" }];

const PLACEMENT_DRIVE = {
  id: "drive-1",
  companyId: "c1",
  companyName: "Acme Architects",
  title: "Campus Placement 2026",
  type: "PLACEMENT",
  eligibility: { eligibleBatchIds: ["b1"] },
  packageOrStipend: "12 LPA",
  description: null,
  status: "DRAFT",
  applicationDeadline: null,
  createdByUserId: "sec-1",
  createdAt: "",
  updatedAt: "",
};

const INTERNSHIP_DRIVE = { ...PLACEMENT_DRIVE, id: "drive-2", type: "INTERNSHIP", title: "Summer Internship 2026" };

function mockFetchWith(drives: unknown[]) {
  fetchMock.mockImplementation((url: string) => {
    if (url.includes("/api/placements/drives")) return Promise.resolve(jsonResponse(drives));
    if (url.includes("/api/companies")) return Promise.resolve(jsonResponse(COMPANIES));
    if (url.includes("/api/batches")) return Promise.resolve(jsonResponse(BATCHES));
    throw new Error(`Unexpected fetch: ${url}`);
  });
}

describe("PlacementDriveListPage (V4.0 D2)", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
    mockAuthState = { accessToken: "test-access-token", role: "SECRETARY" };
  });

  it("renders 'Placement Drives' heading and lists drives with no fixedType", async () => {
    mockFetchWith([PLACEMENT_DRIVE]);
    render(<PlacementDriveListPage />);

    expect(await screen.findByRole("heading", { name: "Placement Drives" })).toBeInTheDocument();
    expect(screen.getByText("Campus Placement 2026")).toBeInTheDocument();
  });

  it("renders 'Internships' heading and requests type=INTERNSHIP when fixedType is set", async () => {
    mockFetchWith([INTERNSHIP_DRIVE]);
    render(<PlacementDriveListPage fixedType="INTERNSHIP" />);

    expect(await screen.findByRole("heading", { name: "Internships" })).toBeInTheDocument();
    expect(screen.getByText("Summer Internship 2026")).toBeInTheDocument();
    const [driveUrl] = fetchMock.mock.calls.find((call) => (call[0] as string).includes("/api/placements/drives"))!;
    expect(driveUrl).toContain("type=INTERNSHIP");
  });

  it("shows an empty state when there are no drives", async () => {
    mockFetchWith([]);
    render(<PlacementDriveListPage />);
    expect(await screen.findByText(/no drives yet/i)).toBeInTheDocument();
  });

  it("opens the create-drive modal and submits a new drive", async () => {
    mockFetchWith([]);
    const user = userEvent.setup();
    render(<PlacementDriveListPage />);
    await screen.findByText(/no drives yet/i);

    await user.click(screen.getByRole("button", { name: /new drive/i }));
    expect(screen.getByRole("dialog", { name: /new placement drive/i })).toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText(/company/i), "c1");
    await user.type(screen.getByLabelText(/^title$/i), "New Drive");
    fetchMock.mockResolvedValueOnce({ ok: true, status: 201, json: async () => ({ data: { ...PLACEMENT_DRIVE, id: "drive-new" } }) });
    mockFetchWith([{ ...PLACEMENT_DRIVE, id: "drive-new", title: "New Drive" }]);

    await user.click(screen.getByRole("button", { name: /^create drive$/i }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("each drive links to its detail page", async () => {
    mockFetchWith([PLACEMENT_DRIVE]);
    render(<PlacementDriveListPage />);
    const title = await screen.findByText("Campus Placement 2026");
    expect(title.closest("a")).toHaveAttribute("href", "/dashboard/placement-drives/drive-1");
  });
});
