// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const fetchMock = vi.fn();

vi.mock("@/modules/auth/client", () => ({
  useAuth: () => ({ accessToken: "test-access-token" }),
}));

import StudentsPage from "../../../src/app/(admin)/dashboard/students/page";
import { ToastProvider } from "../../../src/components/ui/toast";

function renderPage() {
  return render(
    <ToastProvider>
      <StudentsPage />
    </ToastProvider>,
  );
}

function jsonResponse(body: unknown) {
  return { ok: true, status: 200, json: async () => ({ data: body }) };
}

const BATCHES = [
  { id: "b1", name: "B.Arch 2026", year: 2026, status: "ACTIVE", createdAt: "2024-01-01", updatedAt: "2024-01-01" },
  { id: "b2", name: "B.Plan 2027", year: 2027, status: "ACTIVE", createdAt: "2024-01-01", updatedAt: "2024-01-01" },
];

const STUDENTS = [
  {
    id: "s1",
    rollNumber: "BA001",
    fullName: "Alice Architect",
    batchId: "b1",
    batchName: "B.Arch 2026",
    batchStatus: "ACTIVE",
    isActive: true,
    cgpa: 8.5,
    hasActiveBacklog: false,
    skills: [],
    software: [],
  },
  {
    id: "s2",
    rollNumber: "BP001",
    fullName: "Priya Planner",
    batchId: "b2",
    batchName: "B.Plan 2027",
    batchStatus: "ACTIVE",
    isActive: false,
    cgpa: null,
    hasActiveBacklog: false,
    skills: [],
    software: [],
  },
];

function mockDefaultFetch(students: unknown = STUDENTS) {
  fetchMock.mockImplementation((url: string) => {
    if (url.includes("/api/batches")) return Promise.resolve(jsonResponse(BATCHES));
    if (url.includes("/api/students")) return Promise.resolve(jsonResponse(students));
    throw new Error(`Unexpected fetch: ${url}`);
  });
}

describe("Student Management page", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  it("loads and renders students grouped by batch on mount", async () => {
    mockDefaultFetch();
    renderPage();

    expect(await screen.findAllByText("Alice Architect")).not.toHaveLength(0);
    expect(screen.getAllByText("Priya Planner").length).toBeGreaterThan(0);
    // "B.Arch 2026" also appears as a <select> option, so more than one match is expected.
    expect(screen.getAllByText("B.Arch 2026").length).toBeGreaterThan(0);
    expect(screen.getAllByText("B.Plan 2027").length).toBeGreaterThan(0);
  });

  it("shows the summary stats computed from the current result set", async () => {
    mockDefaultFetch();
    renderPage();
    await screen.findAllByText("Alice Architect");

    expect(screen.getByText("Results")).toBeInTheDocument();
    expect(screen.getAllByText("2").length).toBeGreaterThan(0); // Results = 2
    // "Active"/"Archived" appear both as StatPanel labels and as Badge text.
    expect(screen.getAllByText("Active").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Archived").length).toBeGreaterThan(0);
  });

  it("shows a status badge and CGPA fallback for each student", async () => {
    mockDefaultFetch();
    renderPage();
    await screen.findAllByText("Alice Architect");

    expect(screen.getAllByText("Active").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Archived").length).toBeGreaterThan(0);
    expect(screen.getAllByText("—").length).toBeGreaterThan(0); // Priya's null CGPA
  });

  it("shows a loading state while the search is in flight", async () => {
    fetchMock.mockImplementation((url: string) => {
      if (url.includes("/api/batches")) return Promise.resolve(jsonResponse(BATCHES));
      return new Promise(() => {});
    });
    renderPage();

    expect(await screen.findByText(/loading students/i)).toBeInTheDocument();
  });

  it("shows an empty state with no active filters", async () => {
    mockDefaultFetch([]);
    renderPage();

    expect(await screen.findByText("No students found.")).toBeInTheDocument();
  });

  it("shows a filtered empty state with a Clear filters action once a filter is entered and searched", async () => {
    const user = userEvent.setup();
    mockDefaultFetch(STUDENTS);
    renderPage();
    await screen.findAllByText("Alice Architect");

    mockDefaultFetch([]);
    await user.type(screen.getByLabelText("Name"), "Nobody");
    await user.click(screen.getByRole("button", { name: "Search" }));

    expect(await screen.findByText("No students match the current filters.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Clear filters" })).toBeInTheDocument();
  });

  it("submits the search with the entered filters", async () => {
    const user = userEvent.setup();
    mockDefaultFetch();
    renderPage();
    await screen.findAllByText("Alice Architect");

    fetchMock.mockClear();
    mockDefaultFetch();
    await user.type(screen.getByLabelText("Roll Number"), "BA001");
    await user.click(screen.getByRole("button", { name: "Search" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const studentsCall = fetchMock.mock.calls.find((call: unknown[]) => (call[0] as string).includes("/api/students"));
    expect(studentsCall?.[0]).toContain("rollNumber=BA001");
  });

  it("resets filters and re-searches when Reset filters is clicked", async () => {
    const user = userEvent.setup();
    mockDefaultFetch();
    renderPage();
    await screen.findAllByText("Alice Architect");

    await user.type(screen.getByLabelText("Name"), "Alice");
    expect(await screen.findByRole("button", { name: "Reset filters" })).toBeInTheDocument();

    fetchMock.mockClear();
    mockDefaultFetch();
    await user.click(screen.getByRole("button", { name: "Reset filters" }));

    await waitFor(() => expect(screen.getByLabelText("Name")).toHaveValue(""));
    const studentsCall = fetchMock.mock.calls.find((call: unknown[]) => (call[0] as string).includes("/api/students"));
    expect(studentsCall?.[0]).not.toContain("name=");
  });

  it("archives an active student and re-fetches the list", async () => {
    const user = userEvent.setup();
    mockDefaultFetch();
    renderPage();
    await screen.findAllByText("Alice Architect");

    fetchMock.mockClear();
    fetchMock.mockImplementation((url: string, init?: RequestInit) => {
      if (url === "/api/students/s1/archive" && init?.method === "POST") return Promise.resolve(jsonResponse({}));
      if (url.includes("/api/students")) return Promise.resolve(jsonResponse(STUDENTS));
      return Promise.resolve(jsonResponse(BATCHES));
    });

    const [archiveButton] = screen.getAllByRole("button", { name: "Archive" });
    await user.click(archiveButton!);

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith("/api/students/s1/archive", expect.objectContaining({ method: "POST" })),
    );
  });

  it("has an Export Student Directory link to the existing Exports page", async () => {
    mockDefaultFetch();
    renderPage();
    await screen.findAllByText("Alice Architect");

    expect(screen.getByRole("link", { name: "Export Student Directory" })).toHaveAttribute("href", "/dashboard/reports");
  });

  it("does not let the Bulk Import form reappear if the first status poll fails, preventing a duplicate submission", async () => {
    const user = userEvent.setup();
    mockDefaultFetch();
    renderPage();
    await screen.findAllByText("Alice Architect");

    await user.click(screen.getByRole("button", { name: "Bulk Import" }));
    await screen.findByText("Bulk Import Students");
    const dialog = within(screen.getByRole("dialog"));

    await user.selectOptions(dialog.getByLabelText("Batch"), "b1");
    const file = new File(["email,fullName,rollNumber\na@x.com,A,R1\n"], "roster.csv", { type: "text/csv" });
    await user.upload(dialog.getByLabelText("CSV File"), file);

    fetchMock.mockImplementation((url: string, init?: RequestInit) => {
      if (url === "/api/students/bulk-import" && init?.method === "POST") {
        return Promise.resolve(jsonResponse({ bulkImportRunId: "run-1", totalRows: 1 }));
      }
      if (url.includes("/api/students/bulk-import/run-1")) {
        return Promise.resolve({
          ok: false,
          status: 500,
          json: async () => ({ error: { code: "INTERNAL", message: "Unable to check import status." } }),
        });
      }
      throw new Error(`Unexpected fetch: ${url}`);
    });

    // fireEvent.submit (rather than clicking the submit button) bypasses a
    // jsdom quirk where a `required` file input's constraint validation
    // isn't recognized as satisfied after userEvent.upload, which would
    // otherwise silently block native form submission before React's
    // onSubmit ever runs — unrelated to the app code under test.
    fireEvent.submit(dialog.getByRole("button", { name: "Start Import" }).closest("form")!);

    expect(await dialog.findByText("Unable to check import status.")).toBeInTheDocument();
    expect(dialog.queryByRole("button", { name: "Start Import" })).not.toBeInTheDocument();
    expect(dialog.queryByLabelText("CSV File")).not.toBeInTheDocument();
  });

  it("shows an error message when the search fails", async () => {
    fetchMock.mockImplementation((url: string) => {
      if (url.includes("/api/batches")) return Promise.resolve(jsonResponse(BATCHES));
      return Promise.resolve({ ok: false, status: 500, json: async () => ({ error: { code: "INTERNAL", message: "Unable to load students." } }) });
    });
    renderPage();

    expect(await screen.findByText("Unable to load students.")).toBeInTheDocument();
  });
});
