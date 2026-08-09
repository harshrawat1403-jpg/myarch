// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const fetchMock = vi.fn();

vi.mock("next/navigation", () => ({
  useParams: () => ({ id: "s1" }),
}));

import PublicDirectoryProfilePage from "../../../src/app/(marketing)/directory/[id]/page";

function jsonResponse(body: unknown) {
  return { ok: true, status: 200, json: async () => ({ data: body }) };
}

const PROFILE = {
  studentId: "s1",
  fullName: "Alice Architect",
  batchId: "batch-a",
  batchName: "B.Arch 2026",
  bio: "Aspiring architect",
  skills: ["Rendering"],
  software: ["Rhino"],
  selectedProjects: [{ title: "Urban Housing Complex" }],
  portfolioLinks: ["https://alice.example.com"],
  certifications: [],
  internships: [],
  hasResume: true,
  profilePhotoUrl: null,
  cgpa: null,
};

describe("PublicDirectoryProfilePage (/directory/[id]) — V4.0 B5", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  it("loads and renders the profile, without needing an access token", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(PROFILE));
    render(<PublicDirectoryProfilePage />);

    expect(await screen.findByText("Alice Architect")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith("/api/public/directory/s1");
    expect(screen.getByText("Urban Housing Complex")).toBeInTheDocument();
  });

  it("only renders the CGPA panel when cgpa is non-null (the student's own showCgpa opt-in)", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(PROFILE));
    render(<PublicDirectoryProfilePage />);

    await screen.findByText("Alice Architect");
    expect(screen.queryByText("CGPA")).not.toBeInTheDocument();
  });

  it("renders the CGPA panel when the API returns a value", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ ...PROFILE, cgpa: 8.7 }));
    render(<PublicDirectoryProfilePage />);

    await screen.findByText("Alice Architect");
    expect(screen.getByText("CGPA")).toBeInTheDocument();
    expect(screen.getByText("8.70")).toBeInTheDocument();
  });

  it("shows a 'Back to Directory' link", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(PROFILE));
    render(<PublicDirectoryProfilePage />);

    await screen.findByText("Alice Architect");
    expect(screen.getByRole("link", { name: /back to directory/i })).toHaveAttribute("href", "/directory");
  });

  it("shows an error and a way back when the profile is not found (private/unapproved/unknown)", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 404,
      json: async () => ({ error: { code: "NOT_FOUND", message: "Profile not found" } }),
    });
    render(<PublicDirectoryProfilePage />);

    expect(await screen.findByText("Profile not found")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /back to directory/i })).toHaveAttribute("href", "/directory");
  });
});
