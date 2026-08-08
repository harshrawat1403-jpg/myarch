// @vitest-environment jsdom
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const fetchMock = vi.fn();
let mockAuthState: { accessToken: string | null; role: string | null };

vi.mock("@/modules/auth/client", () => ({
  useAuth: () => mockAuthState,
}));

import BatchesPage from "../../../src/app/(admin)/dashboard/batches/page";

function jsonResponse(body: unknown) {
  return { ok: true, status: 200, json: async () => ({ data: body }) };
}

const BATCHES = [
  { id: "b1", name: "B.Arch 2026", year: 2026, status: "ACTIVE", createdAt: "2024-01-01", updatedAt: "2024-01-01" },
  { id: "b2", name: "B.Arch 2025", year: 2025, status: "GRADUATED", createdAt: "2023-01-01", updatedAt: "2023-01-01" },
];

const STUDENTS = [
  { id: "s1", batchId: "b1", isActive: true },
  { id: "s2", batchId: "b1", isActive: true },
  { id: "s3", batchId: "b1", isActive: false },
];

function mockFetchWith(overrides: Partial<{ batches: unknown; students: unknown }> = {}) {
  fetchMock.mockImplementation((url: string) => {
    if (url.includes("/api/batches")) return Promise.resolve(jsonResponse(overrides.batches ?? BATCHES));
    if (url.includes("/api/students")) return Promise.resolve(jsonResponse(overrides.students ?? STUDENTS));
    throw new Error(`Unexpected fetch: ${url}`);
  });
}

describe("Batch Management page", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
    mockAuthState = { accessToken: "test-access-token", role: "SECRETARY" };
  });

  it("shows a loading state before data resolves", () => {
    fetchMock.mockImplementation(() => new Promise(() => {}));
    render(<BatchesPage />);
    expect(screen.getByText(/loading batches/i)).toBeInTheDocument();
  });

  it("renders batch cards with computed active/total counts and a status badge", async () => {
    mockFetchWith();
    render(<BatchesPage />);

    expect(await screen.findByRole("heading", { name: "B.Arch 2026" })).toBeInTheDocument();
    // "ACTIVE"/"GRADUATED" also appear as <option> text in each batch's status Select.
    expect(screen.getAllByText("ACTIVE").length).toBeGreaterThan(0);
    expect(screen.getAllByText("GRADUATED").length).toBeGreaterThan(0);
    expect(screen.getByText("2")).toBeInTheDocument(); // active count for b1
    expect(screen.getByText("3")).toBeInTheDocument(); // total count for b1
  });

  it("shows an empty state when there are no batches", async () => {
    mockFetchWith({ batches: [] });
    render(<BatchesPage />);
    expect(await screen.findByText("No batches yet.")).toBeInTheDocument();
  });

  it("shows the create-batch form and status controls for a Secretary", async () => {
    mockFetchWith();
    render(<BatchesPage />);
    await screen.findByRole("heading", { name: "B.Arch 2026" });

    expect(screen.getByLabelText("Batch name")).toBeInTheDocument();
    expect(screen.getAllByLabelText("Status").length).toBe(2);
  });

  it("hides the create-batch form and status controls for a Coordinator", async () => {
    mockAuthState = { accessToken: "test-access-token", role: "COORDINATOR" };
    mockFetchWith();
    render(<BatchesPage />);
    await screen.findByRole("heading", { name: "B.Arch 2026" });

    expect(screen.queryByLabelText("Batch name")).not.toBeInTheDocument();
    expect(screen.queryAllByLabelText("Status")).toHaveLength(0);
  });

  it("creates a batch via POST and reloads the list", async () => {
    const user = userEvent.setup();
    mockFetchWith();
    render(<BatchesPage />);
    await screen.findByRole("heading", { name: "B.Arch 2026" });

    fetchMock.mockClear();
    fetchMock.mockImplementation((url: string, init?: RequestInit) => {
      if (url === "/api/batches" && init?.method === "POST") return Promise.resolve(jsonResponse({ id: "b3" }));
      if (url.includes("/api/batches")) return Promise.resolve(jsonResponse(BATCHES));
      return Promise.resolve(jsonResponse(STUDENTS));
    });

    await user.type(screen.getByLabelText("Batch name"), "B.Arch 2027");
    await user.type(screen.getByLabelText("Year"), "2027");
    await user.click(screen.getByRole("button", { name: "Create Batch" }));

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith("/api/batches", expect.objectContaining({ method: "POST" })),
    );
    expect(await screen.findByText("Batch created.")).toBeInTheDocument();
  });

  it("changes a batch's status via POST and reloads the list", async () => {
    const user = userEvent.setup();
    mockFetchWith();
    render(<BatchesPage />);
    await screen.findByRole("heading", { name: "B.Arch 2026" });

    fetchMock.mockClear();
    fetchMock.mockImplementation((url: string, init?: RequestInit) => {
      if (url === "/api/batches/b1/status" && init?.method === "POST") return Promise.resolve(jsonResponse({}));
      if (url.includes("/api/batches")) return Promise.resolve(jsonResponse(BATCHES));
      return Promise.resolve(jsonResponse(STUDENTS));
    });

    const [firstStatusSelect] = screen.getAllByLabelText("Status");
    await user.selectOptions(firstStatusSelect!, "ARCHIVED");

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith("/api/batches/b1/status", expect.objectContaining({ method: "POST" })),
    );
  });

  it("shows an error message when loading fails", async () => {
    fetchMock.mockImplementation(() =>
      Promise.resolve({ ok: false, status: 500, json: async () => ({ error: { code: "INTERNAL", message: "Unable to load batches." } }) }),
    );
    render(<BatchesPage />);
    expect(await screen.findByText("Unable to load batches.")).toBeInTheDocument();
  });
});
