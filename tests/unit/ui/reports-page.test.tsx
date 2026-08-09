// @vitest-environment jsdom
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const fetchMock = vi.fn();

let mockAuthState: { accessToken: string | null; role: string | null };

vi.mock("@/modules/auth/client", () => ({
  useAuth: () => mockAuthState,
}));

import ReportsPage from "../../../src/app/(admin)/dashboard/reports/page";

function csvResponse(body: string, filename: string) {
  return {
    ok: true,
    status: 200,
    headers: { get: (name: string) => (name === "Content-Disposition" ? `attachment; filename="${filename}"` : null) },
    blob: async () => new Blob([body], { type: "text/csv" }),
  };
}

describe("Admin dashboard — Reports page (V4.0 E7, renamed/extended from Exports)", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal("URL", { ...URL, createObjectURL: vi.fn(() => "blob:mock"), revokeObjectURL: vi.fn() });
    mockAuthState = { accessToken: "test-access-token", role: "SECRETARY" };
  });

  it("shows all four institutional report links", () => {
    render(<ReportsPage />);

    expect(screen.getByRole("link", { name: /placement statistics/i })).toHaveAttribute("href", "/dashboard/reports/placements");
    expect(screen.getByRole("link", { name: /internship statistics/i })).toHaveAttribute("href", "/dashboard/reports/internships");
    expect(screen.getByRole("link", { name: /alumni report/i })).toHaveAttribute("href", "/dashboard/reports/alumni");
    expect(screen.getByRole("link", { name: /publications usage/i })).toHaveAttribute("href", "/dashboard/reports/publications");
  });

  it("shows all four directory-export cards for the Secretary, each with CSV and XLSX buttons", () => {
    render(<ReportsPage />);

    expect(screen.getByText("Student Directory")).toBeInTheDocument();
    expect(screen.getByText("Batch Report")).toBeInTheDocument();
    expect(screen.getByText("Public Placement Dataset")).toBeInTheDocument();
    expect(screen.getByText("Recruiter Directory")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /export csv/i })).toHaveLength(4);
    expect(screen.getAllByRole("button", { name: /export xlsx/i })).toHaveLength(4);
  });

  it("hides the Recruiter Directory card for a Coordinator (Secretary-only export)", () => {
    mockAuthState = { accessToken: "test-access-token", role: "COORDINATOR" };
    render(<ReportsPage />);

    expect(screen.getByText("Student Directory")).toBeInTheDocument();
    expect(screen.queryByText("Recruiter Directory")).not.toBeInTheDocument();
  });

  it("requests the correct endpoint and triggers a browser download when Export CSV is clicked", async () => {
    fetchMock.mockResolvedValueOnce(csvResponse("Name,Roll Number\r\nAlice,BA001\r\n", "student-directory-2026-08-05.csv"));

    const user = userEvent.setup();
    render(<ReportsPage />);

    const [exportButton] = screen.getAllByRole("button", { name: /export csv/i });
    await user.click(exportButton!);

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe("/api/exports/students");
    expect(init.headers.Authorization).toBe("Bearer test-access-token");
  });

  it("requests the format=xlsx variant when Export XLSX is clicked", async () => {
    fetchMock.mockResolvedValueOnce(csvResponse("ignored", "student-directory-2026-08-05.xlsx"));

    const user = userEvent.setup();
    render(<ReportsPage />);

    const [exportButton] = screen.getAllByRole("button", { name: /export xlsx/i });
    await user.click(exportButton!);

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const [url] = fetchMock.mock.calls[0]!;
    expect(url).toBe("/api/exports/students?format=xlsx");
  });

  it("shows an error message when the export request fails", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 403,
      json: async () => ({ error: { code: "FORBIDDEN", message: "Not authorized to export the student directory" } }),
    });

    const user = userEvent.setup();
    render(<ReportsPage />);

    const [exportButton] = screen.getAllByRole("button", { name: /export csv/i });
    await user.click(exportButton!);

    expect(await screen.findByText("Not authorized to export the student directory")).toBeInTheDocument();
  });
});
