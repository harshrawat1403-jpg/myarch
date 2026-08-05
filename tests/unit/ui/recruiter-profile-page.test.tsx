// @vitest-environment jsdom
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const fetchMock = vi.fn();
const pushMock = vi.fn();

vi.mock("next/navigation", () => ({
  useParams: () => ({ id: "s1" }),
  useRouter: () => ({ push: pushMock }),
}));

vi.mock("@/modules/auth/client", () => ({
  useAuth: () => ({ accessToken: "test-access-token" }),
}));

import RecruiterStudentProfilePage from "../../../src/app/(recruiter)/recruiter/students/[id]/page";

function jsonResponse(body: unknown, ok = true, status = ok ? 200 : 404) {
  return { ok, status, json: async () => (ok ? { data: body } : { error: { code: "NOT_FOUND", message: body } }) };
}

const PROFILE = {
  studentId: "s1",
  fullName: "Alice Architect",
  batchId: "batch-a",
  batchName: "B.Arch 2026",
  bio: "Aspiring architect and researcher",
  skills: ["Rendering"],
  software: ["Rhino"],
  selectedProjects: [{ title: "Pavilion Design" }],
  portfolioLinks: ["https://alice.design"],
  certifications: [{ title: "LEED Green Associate" }],
  internships: [{ company: "Studio X" }],
  hasResume: true,
  profilePhotoUrl: null,
};

describe("Recruiter student profile page — approved public information only", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    pushMock.mockClear();
    vi.stubGlobal("fetch", fetchMock);
  });

  it("renders only approved public fields", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(PROFILE));
    render(<RecruiterStudentProfilePage />);

    expect(await screen.findByRole("heading", { name: "Alice Architect" })).toBeInTheDocument();
    expect(screen.getByText("Aspiring architect and researcher")).toBeInTheDocument();
    expect(screen.getByText("Pavilion Design")).toBeInTheDocument();
    expect(screen.getByText("LEED Green Associate")).toBeInTheDocument();
    expect(screen.getByText("Studio X")).toBeInTheDocument();
  });

  it("never renders any forbidden private field", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(PROFILE));
    render(<RecruiterStudentProfilePage />);
    await screen.findByRole("heading", { name: "Alice Architect" });

    for (const forbidden of [/cgpa/i, /internal remarks/i, /coordinator notes/i, /backlog/i, /approval history/i, /draft/i]) {
      expect(screen.queryByText(forbidden)).not.toBeInTheDocument();
    }
  });

  it("requests the resume reference when Download Resume is clicked", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(PROFILE));
    const user = userEvent.setup();
    render(<RecruiterStudentProfilePage />);
    await screen.findByRole("heading", { name: "Alice Architect" });

    fetchMock.mockResolvedValueOnce(jsonResponse({ storageKey: "resumes/s1.pdf", mimeType: "application/pdf" }));
    await user.click(screen.getByRole("button", { name: /download resume/i }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    const [url, init] = fetchMock.mock.calls[1]!;
    expect(url).toBe("/api/recruiters/students/s1/resume");
    expect(init.headers.Authorization).toBe("Bearer test-access-token");
    expect(await screen.findByText(/resumes\/s1\.pdf/)).toBeInTheDocument();
  });

  it("disables the resume button when the student has no resume available", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ ...PROFILE, hasResume: false }));
    render(<RecruiterStudentProfilePage />);

    const button = await screen.findByRole("button", { name: /no resume available/i });
    expect(button).toBeDisabled();
  });

  it("shows an error and a way back to the directory when the profile cannot be loaded (e.g. not approved/archived)", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse("Profile not found", false, 404));
    render(<RecruiterStudentProfilePage />);

    expect(await screen.findByText("Profile not found")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /back to directory/i })).toBeInTheDocument();
  });
});
