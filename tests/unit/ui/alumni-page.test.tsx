// @vitest-environment jsdom
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const fetchMock = vi.fn();
let mockAuthState: { accessToken: string | null; role: string | null };

vi.mock("@/modules/auth/client", () => ({
  useAuth: () => mockAuthState,
}));

import AlumniPage from "../../../src/app/(admin)/dashboard/alumni/page";
import { ToastProvider } from "../../../src/components/ui/toast";

function renderPage() {
  return render(
    <ToastProvider>
      <AlumniPage />
    </ToastProvider>,
  );
}

function jsonResponse(body: unknown) {
  return { ok: true, status: 200, json: async () => ({ data: body }) };
}

const ALUMNI_RECORD = {
  id: "alumni-1",
  studentProfileId: null,
  fullName: "Priya Iyer",
  graduationYear: 2020,
  currentCompany: "Acme Architects",
  designation: "Senior Architect",
  location: "Mumbai",
  portfolioUrl: null,
  linkedInUrl: null,
  mentorshipAvailable: true,
  createdAt: "",
  updatedAt: "",
};

function mockFetchWith(records: unknown[]) {
  fetchMock.mockImplementation((url: string) => {
    if (url.includes("/api/alumni")) return Promise.resolve(jsonResponse(records));
    throw new Error(`Unexpected fetch: ${url}`);
  });
}

describe("Alumni page (/dashboard/alumni) — V4.0 D5", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  it("shows an empty state when there are no alumni records", async () => {
    mockAuthState = { accessToken: "test-access-token", role: "SECRETARY" };
    mockFetchWith([]);
    renderPage();
    expect(await screen.findByText(/no alumni records yet/i)).toBeInTheDocument();
  });

  it("lists an alumni record with company/designation/mentorship badge", async () => {
    mockAuthState = { accessToken: "test-access-token", role: "SECRETARY" };
    mockFetchWith([ALUMNI_RECORD]);
    renderPage();

    expect(await screen.findByText("Priya Iyer")).toBeInTheDocument();
    expect(screen.getByText("Class of 2020")).toBeInTheDocument();
    expect(screen.getByText("Senior Architect at Acme Architects")).toBeInTheDocument();
    expect(screen.getByText("Mentorship")).toBeInTheDocument();
  });

  it("shows Edit and Delete actions for a Coordinator too (identical access to Secretary)", async () => {
    mockAuthState = { accessToken: "test-access-token", role: "COORDINATOR" };
    mockFetchWith([ALUMNI_RECORD]);
    renderPage();
    await screen.findByText("Priya Iyer");

    expect(screen.getByRole("button", { name: /^edit$/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^delete$/i })).toBeInTheDocument();
  });

  it("creates a new alumni record", async () => {
    mockAuthState = { accessToken: "test-access-token", role: "SECRETARY" };
    mockFetchWith([]);
    const user = userEvent.setup();
    renderPage();
    await screen.findByText(/no alumni records yet/i);

    await user.click(screen.getByRole("button", { name: /new alumni record/i }));
    const createDialog = screen.getByRole("dialog", { name: /^new alumni record$/i });
    await user.type(within(createDialog).getByLabelText(/full name/i), "Rahul Verma");
    await user.type(within(createDialog).getByLabelText(/graduation year/i), "2019");

    fetchMock.mockResolvedValueOnce({ ok: true, status: 201, json: async () => ({ data: { ...ALUMNI_RECORD, id: "alumni-2", fullName: "Rahul Verma" } }) });
    mockFetchWith([{ ...ALUMNI_RECORD, id: "alumni-2", fullName: "Rahul Verma" }]);

    await user.click(within(createDialog).getByRole("button", { name: /^create record$/i }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(await screen.findByText("Rahul Verma")).toBeInTheDocument();
  });

  it("deletes an alumni record after confirmation", async () => {
    mockAuthState = { accessToken: "test-access-token", role: "SECRETARY" };
    mockFetchWith([ALUMNI_RECORD]);
    const user = userEvent.setup();
    renderPage();
    await screen.findByText("Priya Iyer");

    await user.click(screen.getByRole("button", { name: /^delete$/i }));
    const confirmDialog = await screen.findByRole("dialog", { name: /remove this alumni record/i });

    fetchMock.mockResolvedValueOnce(jsonResponse({ id: "alumni-1" }));
    mockFetchWith([]);
    await user.click(within(confirmDialog).getByRole("button", { name: /^delete$/i }));

    await waitFor(() => expect(screen.queryByText("Priya Iyer")).not.toBeInTheDocument());
  });
});
