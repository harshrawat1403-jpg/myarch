// @vitest-environment jsdom
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const fetchMock = vi.fn();

vi.mock("@/modules/auth/client", () => ({
  useAuth: () => ({ accessToken: "test-access-token" }),
}));

import RecruiterDirectoryPage from "../../../src/app/(recruiter)/recruiter/directory/page";
import { ToastProvider } from "../../../src/components/ui/toast";

function renderPage() {
  return render(
    <ToastProvider>
      <RecruiterDirectoryPage />
    </ToastProvider>,
  );
}

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
    isSaved: false,
    isShortlisted: false,
    interestStatus: null,
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
    isSaved: false,
    isShortlisted: false,
    interestStatus: null,
  },
];

describe("Recruiter directory page (/recruiter/directory) — V4.0 C4 (moved from /recruiter)", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  it("renders quick statistics and the student directory on load", async () => {
    fetchMock.mockImplementation((url: string) => {
      if (url.includes("/api/recruiters/dashboard")) return Promise.resolve(jsonResponse(STATS));
      return Promise.resolve(jsonResponse(STUDENTS));
    });

    renderPage();

    expect(await screen.findByRole("heading", { name: "Alice Architect" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Bob Builder" })).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument(); // totalAvailableStudents stat tile
  });

  it("never renders a private field anywhere on the directory (CGPA, backlog, phone, email, remarks)", async () => {
    fetchMock.mockImplementation((url: string) => {
      if (url.includes("/api/recruiters/dashboard")) return Promise.resolve(jsonResponse(STATS));
      return Promise.resolve(jsonResponse(STUDENTS));
    });

    renderPage();
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
    renderPage();
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

    renderPage();
    const heading = await screen.findByRole("heading", { name: "Alice Architect" });
    const link = heading.closest("a");
    expect(link).toHaveAttribute("href", "/recruiter/students/s1");
  });

  it("saves a student from the card without navigating to their profile (V4.0 C1)", async () => {
    fetchMock.mockImplementation((url: string) => {
      if (url.includes("/api/recruiters/dashboard")) return Promise.resolve(jsonResponse(STATS));
      if (url.includes("/save")) return Promise.resolve(jsonResponse({ studentProfileId: "s1", isSaved: true, isShortlisted: false }));
      return Promise.resolve(jsonResponse(STUDENTS));
    });

    const user = userEvent.setup();
    renderPage();
    await screen.findByRole("heading", { name: "Alice Architect" });

    const saveButtons = screen.getAllByRole("button", { name: /^save$/i });
    await user.click(saveButtons[0]!);

    await waitFor(() => expect(screen.getAllByRole("button", { name: /^saved$/i }).length).toBeGreaterThan(0));
    const [url, init] = fetchMock.mock.calls.find((call) => (call[0] as string).includes("/save"))!;
    expect(url).toBe("/api/recruiters/students/s1/save");
    expect(JSON.parse((init as { body: string }).body)).toEqual({ saved: true });
  });

  it("disables the Shortlist button until the student is saved", async () => {
    fetchMock.mockImplementation((url: string) => {
      if (url.includes("/api/recruiters/dashboard")) return Promise.resolve(jsonResponse(STATS));
      return Promise.resolve(jsonResponse(STUDENTS));
    });

    renderPage();
    await screen.findByRole("heading", { name: "Alice Architect" });

    const shortlistButtons = screen.getAllByRole("button", { name: /shortlist/i });
    expect(shortlistButtons[0]).toBeDisabled();
  });

  it("expresses interest from a card: opens an inline panel, sends, and shows the confirmed state (V4.0 C2)", async () => {
    fetchMock.mockImplementation((url: string) => {
      if (url.includes("/api/recruiters/dashboard")) return Promise.resolve(jsonResponse(STATS));
      if (url.includes("/interest")) return Promise.resolve(jsonResponse({ id: "int-1", status: "SENT" }));
      return Promise.resolve(jsonResponse(STUDENTS));
    });

    const user = userEvent.setup();
    renderPage();
    await screen.findByRole("heading", { name: "Alice Architect" });

    expect(screen.queryByRole("button", { name: /^send$/i })).not.toBeInTheDocument();
    await user.click(screen.getAllByRole("button", { name: /express interest/i })[0]!);
    expect(screen.getAllByRole("button", { name: /^send$/i }).length).toBeGreaterThan(0);

    await user.type(screen.getAllByLabelText(/message \(optional\)/i)[0]!, "Loved your portfolio.");
    await user.click(screen.getAllByRole("button", { name: /^send$/i })[0]!);

    await waitFor(() => expect(screen.getAllByText(/interest sent/i).length).toBeGreaterThan(0));
    const [url, init] = fetchMock.mock.calls.find((call) => (call[0] as string).includes("/interest"))!;
    expect(url).toBe("/api/recruiters/students/s1/interest");
    expect(JSON.parse((init as { body: string }).body)).toEqual({ message: "Loved your portfolio." });
  });
});
