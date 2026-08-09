// @vitest-environment jsdom
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const fetchMock = vi.fn();

import PublicDirectoryPage from "../../../src/app/(marketing)/directory/page";

function jsonResponse(body: unknown) {
  return { ok: true, status: 200, json: async () => ({ data: body }) };
}

const STUDENTS = [
  {
    studentId: "s1",
    fullName: "Alice Architect",
    batchId: "batch-a",
    batchName: "B.Arch 2026",
    bio: "Aspiring architect focused on sustainable design",
    skills: ["Rendering"],
    software: ["Rhino"],
    selectedProjects: [],
    portfolioLinks: [],
    certifications: [],
    internships: [],
    hasResume: true,
    profilePhotoUrl: null,
    cgpa: null,
  },
];

describe("PublicDirectoryPage (/directory) — V4.0 B5", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  it("loads and renders the directory on mount, without needing an access token", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(STUDENTS));
    render(<PublicDirectoryPage />);

    expect(await screen.findByText("Alice Architect")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith("/api/public/directory");
  });

  it("submits the search filters as a query string against the public endpoint", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(STUDENTS));
    fetchMock.mockResolvedValueOnce(jsonResponse([]));
    const user = userEvent.setup();
    render(<PublicDirectoryPage />);

    await screen.findByText("Alice Architect");
    await user.type(screen.getByLabelText("Search"), "Rendering");
    await user.click(screen.getByRole("button", { name: /^search$/i }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    expect(fetchMock.mock.calls[1]?.[0]).toBe("/api/public/directory?query=Rendering");
  });

  it("shows an empty state when no students match", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse([]));
    render(<PublicDirectoryPage />);

    expect(await screen.findByText(/no students are available yet/i)).toBeInTheDocument();
  });

  it("shows the server's error message when the request fails", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 429,
      json: async () => ({ error: { code: "RATE_LIMITED", message: "Too many requests" } }),
    });
    render(<PublicDirectoryPage />);

    expect(await screen.findByText("Too many requests")).toBeInTheDocument();
  });

  it("links each card to /directory/[id]", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(STUDENTS));
    render(<PublicDirectoryPage />);

    const link = await screen.findByRole("link", { name: /alice architect/i });
    expect(link).toHaveAttribute("href", "/directory/s1");
  });
});
