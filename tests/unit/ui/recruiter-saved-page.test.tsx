// @vitest-environment jsdom
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const fetchMock = vi.fn();

vi.mock("@/modules/auth/client", () => ({
  useAuth: () => ({ accessToken: "test-access-token" }),
}));

import RecruiterSavedPage from "../../../src/app/(recruiter)/recruiter/saved/page";
import { ToastProvider } from "../../../src/components/ui/toast";

function renderPage() {
  return render(
    <ToastProvider>
      <RecruiterSavedPage />
    </ToastProvider>,
  );
}

function jsonResponse(body: unknown) {
  return { ok: true, status: 200, json: async () => ({ data: body }) };
}

const ALICE = {
  studentId: "s1",
  fullName: "Alice Architect",
  batchId: "batch-a",
  batchName: "B.Arch 2026",
  bio: null,
  skills: ["Rendering"],
  software: [],
  selectedProjects: [],
  portfolioLinks: [],
  certifications: [],
  internships: [],
  hasResume: false,
  profilePhotoUrl: null,
  isSaved: true,
  isShortlisted: false,
  interestStatus: null,
};

const BOB = { ...ALICE, studentId: "s2", fullName: "Bob Builder", isShortlisted: true };

describe("Recruiter saved page (/recruiter/saved) — V4.0 C4", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  it("shows an empty state when nothing is saved", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse([]));
    renderPage();

    expect(await screen.findByText(/haven't saved any students yet/i)).toBeInTheDocument();
  });

  it("lists saved students from /api/recruiters/saved", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse([ALICE, BOB]));
    renderPage();

    expect(await screen.findByText("Alice Architect")).toBeInTheDocument();
    expect(screen.getByText("Bob Builder")).toBeInTheDocument();
  });

  it("filters to the shortlisted subset when the toggle is checked, without a separate route", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse([ALICE, BOB]));
    const user = userEvent.setup();
    renderPage();
    await screen.findByText("Alice Architect");

    await user.click(screen.getByRole("checkbox", { name: /shortlisted only/i }));

    expect(screen.queryByText("Alice Architect")).not.toBeInTheDocument();
    expect(screen.getByText("Bob Builder")).toBeInTheDocument();
  });

  it("removes a card from the list immediately when the student is unsaved", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse([ALICE]));
    fetchMock.mockResolvedValueOnce(jsonResponse({ studentProfileId: "s1", isSaved: false, isShortlisted: false }));
    const user = userEvent.setup();
    renderPage();
    await screen.findByText("Alice Architect");

    await user.click(screen.getByRole("button", { name: /^saved$/i }));

    await waitFor(() => expect(screen.queryByText("Alice Architect")).not.toBeInTheDocument());
    expect(await screen.findByText(/haven't saved any students yet/i)).toBeInTheDocument();
  });
});
