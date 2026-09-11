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
import { ToastProvider } from "../../../src/components/ui/toast";

function renderPage() {
  return render(
    <ToastProvider>
      <RecruiterStudentProfilePage />
    </ToastProvider>,
  );
}

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
  isSaved: false,
  isShortlisted: false,
  interestStatus: null,
};

describe("Recruiter student profile page — approved public information only", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    pushMock.mockClear();
    vi.stubGlobal("fetch", fetchMock);
  });

  it("renders only approved public fields", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(PROFILE));
    renderPage();

    expect(await screen.findByRole("heading", { name: "Alice Architect" })).toBeInTheDocument();
    expect(screen.getByText("Aspiring architect and researcher")).toBeInTheDocument();
    expect(screen.getByText("Pavilion Design")).toBeInTheDocument();
    expect(screen.getByText("LEED Green Associate")).toBeInTheDocument();
    expect(screen.getByText("Studio X")).toBeInTheDocument();
  });

  it("never renders any forbidden private field", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(PROFILE));
    renderPage();
    await screen.findByRole("heading", { name: "Alice Architect" });

    for (const forbidden of [/cgpa/i, /internal remarks/i, /coordinator notes/i, /backlog/i, /approval history/i, /draft/i]) {
      expect(screen.queryByText(forbidden)).not.toBeInTheDocument();
    }
  });

  it("downloads the authorized resume without exposing its storage key", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(PROFILE));
    const user = userEvent.setup();
    renderPage();
    await screen.findByRole("heading", { name: "Alice Architect" });

    vi.stubGlobal("URL", { createObjectURL: vi.fn(() => "blob:resume"), revokeObjectURL: vi.fn() });
    fetchMock.mockResolvedValueOnce({ ok: true, status: 200, blob: async () => new Blob(["pdf"]), headers: new Headers({ "Content-Disposition": "attachment; filename=resume.pdf" }) });
    await user.click(screen.getByRole("button", { name: /download resume/i }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    const [url, init] = fetchMock.mock.calls[1]!;
    expect(url).toBe("/api/recruiters/students/s1/resume");
    expect(init.headers.Authorization).toBe("Bearer test-access-token");
    expect(await screen.findByText("Resume downloaded.")).toBeInTheDocument();
  });

  it("disables the resume button when the student has no resume available", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ ...PROFILE, hasResume: false }));
    renderPage();

    const button = await screen.findByRole("button", { name: /no resume available/i });
    expect(button).toBeDisabled();
  });

  it("shows an error and a way back to the directory when the profile cannot be loaded (e.g. not approved/archived)", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse("Profile not found", false, 404));
    renderPage();

    expect(await screen.findByText("Profile not found")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /back to directory/i })).toBeInTheDocument();
  });

  it("shows a persistent back-to-directory link once the profile has loaded", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(PROFILE));
    renderPage();
    await screen.findByRole("heading", { name: "Alice Architect" });

    expect(screen.getByRole("link", { name: /back to directory/i })).toHaveAttribute("href", "/recruiter/directory");
  });

  it("saves the student and reflects the Saved state (V4.0 C1)", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(PROFILE));
    fetchMock.mockResolvedValueOnce(jsonResponse({ studentProfileId: "s1", isSaved: true, isShortlisted: false }));
    const user = userEvent.setup();
    renderPage();
    await screen.findByRole("heading", { name: "Alice Architect" });

    await user.click(screen.getByRole("button", { name: /^save$/i }));

    expect(await screen.findByRole("button", { name: /^saved$/i })).toBeInTheDocument();
    const [url, init] = fetchMock.mock.calls[1]!;
    expect(url).toBe("/api/recruiters/students/s1/save");
    expect(JSON.parse(init.body)).toEqual({ saved: true });
  });

  it("expresses interest without a message and shows the confirmed state (V4.0 C2)", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(PROFILE));
    fetchMock.mockResolvedValueOnce(jsonResponse({ id: "int-1", status: "SENT" }));
    const user = userEvent.setup();
    renderPage();
    await screen.findByRole("heading", { name: "Alice Architect" });

    await user.click(screen.getByRole("button", { name: /express interest/i }));
    await user.click(screen.getByRole("button", { name: /^send$/i }));

    expect(await screen.findByText(/interest sent/i)).toBeInTheDocument();
    const [url, init] = fetchMock.mock.calls[1]!;
    expect(url).toBe("/api/recruiters/students/s1/interest");
    expect(JSON.parse(init.body)).toEqual({});
  });

  it("cancels the inline panel without sending", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(PROFILE));
    const user = userEvent.setup();
    renderPage();
    await screen.findByRole("heading", { name: "Alice Architect" });

    await user.click(screen.getByRole("button", { name: /express interest/i }));
    expect(screen.getByRole("button", { name: /^send$/i })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /^cancel$/i }));

    expect(screen.queryByRole("button", { name: /^send$/i })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /express interest/i })).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
