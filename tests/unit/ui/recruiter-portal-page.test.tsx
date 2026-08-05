// @vitest-environment jsdom
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const fetchMock = vi.fn();

vi.mock("@/modules/auth/client", () => ({
  useAuth: () => ({ accessToken: "test-access-token" }),
}));

import RecruiterPortalPage from "../../../src/app/(recruiter)/recruiter/page";

function jsonResponse(body: unknown) {
  return { ok: true, status: 200, json: async () => ({ data: body }) };
}

const STATS = { totalAvailableStudents: 2, graduationBatchesAvailable: 1, skillsRepresented: 3 };

const STUDENTS = [
  {
    studentId: "s1",
    fullName: "Alice Architect",
    batchId: "batch-a",
    batchName: "B.Arch 2026",
    bio: "Aspiring architect",
    skills: ["Rendering"],
    software: ["Rhino"],
    selectedProjects: [],
    portfolioLinks: [],
    certifications: [],
    internships: [],
    hasResume: true,
    profilePhotoUrl: null,
  },
  {
    studentId: "s2",
    fullName: "Bob Builder",
    batchId: "batch-a",
    batchName: "B.Arch 2026",
    bio: null,
    skills: ["Modeling"],
    software: ["AutoCAD"],
    selectedProjects: [],
    portfolioLinks: [],
    certifications: [],
    internships: [],
    hasResume: false,
    profilePhotoUrl: null,
  },
];

describe("Recruiter portal landing page — dashboard, search, filters, directory", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  it("renders quick statistics and the student directory on load", async () => {
    fetchMock.mockImplementation((url: string) => {
      if (url.includes("/api/recruiters/dashboard")) return Promise.resolve(jsonResponse(STATS));
      return Promise.resolve(jsonResponse(STUDENTS));
    });

    render(<RecruiterPortalPage />);

    expect(await screen.findByRole("heading", { name: "Alice Architect" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Bob Builder" })).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument(); // totalAvailableStudents stat tile
  });

  it("never renders a private field anywhere on the directory (CGPA, backlog, phone, email, remarks)", async () => {
    fetchMock.mockImplementation((url: string) => {
      if (url.includes("/api/recruiters/dashboard")) return Promise.resolve(jsonResponse(STATS));
      return Promise.resolve(jsonResponse(STUDENTS));
    });

    render(<RecruiterPortalPage />);
    await screen.findByRole("heading", { name: "Alice Architect" });

    for (const forbidden of ["CGPA", "Backlog", "9999999999", "@example.edu", "Internal Remarks"]) {
      expect(screen.queryByText(new RegExp(forbidden, "i"))).not.toBeInTheDocument();
    }
  });

  it("submits the search/filter form and calls the directory endpoint with the correct query string", async () => {
    fetchMock.mockImplementation((url: string) => {
      if (url.includes("/api/recruiters/dashboard")) return Promise.resolve(jsonResponse(STATS));
      return Promise.resolve(jsonResponse(STUDENTS));
    });

    const user = userEvent.setup();
    render(<RecruiterPortalPage />);
    await screen.findByRole("heading", { name: "Alice Architect" });

    fetchMock.mockClear();
    fetchMock.mockImplementation(() => Promise.resolve(jsonResponse([STUDENTS[0]])));

    await user.type(screen.getByLabelText(/^search$/i), "rhino");
    await user.type(screen.getByLabelText(/skills/i), "Rendering");
    await user.click(screen.getByRole("button", { name: /^search$/i }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const [calledUrl, calledInit] = fetchMock.mock.calls[0]!;
    expect(calledUrl).toContain("/api/recruiters/students");
    expect(calledUrl).toContain("query=rhino");
    expect(calledUrl).toContain("skills=Rendering");
    expect(calledInit.headers.Authorization).toBe("Bearer test-access-token");
  });

  it("links each student card to their dedicated recruiter profile page", async () => {
    fetchMock.mockImplementation((url: string) => {
      if (url.includes("/api/recruiters/dashboard")) return Promise.resolve(jsonResponse(STATS));
      return Promise.resolve(jsonResponse(STUDENTS));
    });

    render(<RecruiterPortalPage />);
    const heading = await screen.findByRole("heading", { name: "Alice Architect" });
    const link = heading.closest("a");
    expect(link).toHaveAttribute("href", "/recruiter/students/s1");
  });
});
