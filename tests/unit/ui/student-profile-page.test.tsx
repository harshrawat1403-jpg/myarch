// @vitest-environment jsdom
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const fetchMock = vi.fn();

vi.mock("@/modules/auth/client", () => ({
  useAuth: () => ({ accessToken: "test-access-token", studentProfileId: "student-1" }),
}));

import StudentProfilePage from "../../../src/app/(student)/student/page";

function jsonResponse(body: unknown, ok = true, status = ok ? 200 : 404) {
  return {
    ok,
    status,
    json: async () => (ok ? { data: body } : { error: { code: "NOT_FOUND", message: "Not found" } }),
  };
}

const draft = {
  id: "draft-1",
  studentProfileId: "student-1",
  status: "DRAFT",
  bio: "An aspiring architect.",
  skills: ["Rendering"],
  software: ["Rhino"],
  selectedProjects: [],
  portfolioLinks: ["https://alice.design"],
  resumeFileId: null,
  certifications: [],
  internships: [],
  reviewComment: null,
  submittedAt: null,
  reviewedByUserId: null,
  reviewedAt: null,
  createdAt: "2026-08-01T00:00:00.000Z",
  updatedAt: "2026-08-01T00:00:00.000Z",
};

describe("Student self-service profile page", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  it("loads and displays the draft's content and status", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(draft));
    fetchMock.mockResolvedValueOnce(jsonResponse(null, false));

    render(<StudentProfilePage />);

    expect(await screen.findByDisplayValue("An aspiring architect.")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Rendering")).toBeInTheDocument();
    expect(screen.getByText("Draft")).toBeInTheDocument();

    const [draftUrl] = fetchMock.mock.calls[0]!;
    expect(draftUrl).toBe("/api/students/student-1/profile/draft");
  });

  it("shows the reviewer's comment when changes were requested", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ ...draft, status: "CHANGES_REQUESTED", reviewComment: "Add a portfolio link" }),
    );
    fetchMock.mockResolvedValueOnce(jsonResponse(null, false));

    render(<StudentProfilePage />);

    expect(await screen.findByText("Add a portfolio link")).toBeInTheDocument();
    expect(screen.getByText("Changes Requested")).toBeInTheDocument();
  });

  it("locks editing and hides Submit while PENDING_REVIEW", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ ...draft, status: "PENDING_REVIEW" }));
    fetchMock.mockResolvedValueOnce(jsonResponse(null, false));

    render(<StudentProfilePage />);

    await screen.findByText("Pending Review");
    expect(screen.getByDisplayValue("An aspiring architect.")).toBeDisabled();
    expect(screen.queryByRole("button", { name: /submit for review/i })).not.toBeInTheDocument();
  });

  it("saves the draft via PUT when Save Draft is clicked", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(draft));
    fetchMock.mockResolvedValueOnce(jsonResponse(null, false));
    fetchMock.mockResolvedValueOnce(jsonResponse({ ...draft, bio: "Updated bio" }));

    const user = userEvent.setup();
    render(<StudentProfilePage />);

    await screen.findByDisplayValue("An aspiring architect.");
    await user.click(screen.getByRole("button", { name: /save draft/i }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3));
    const [url, init] = fetchMock.mock.calls[2]!;
    expect(url).toBe("/api/students/student-1/profile/draft");
    expect(init.method).toBe("PUT");
    expect(JSON.parse(init.body)).toEqual({
      bio: "An aspiring architect.",
      skills: ["Rendering"],
      software: ["Rhino"],
      portfolioLinks: ["https://alice.design"],
    });
  });

  it("submits for review via POST when Submit for Review is clicked", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(draft));
    fetchMock.mockResolvedValueOnce(jsonResponse(null, false));
    fetchMock.mockResolvedValueOnce(jsonResponse({ ...draft, status: "PENDING_REVIEW" }));

    const user = userEvent.setup();
    render(<StudentProfilePage />);

    await screen.findByDisplayValue("An aspiring architect.");
    await user.click(screen.getByRole("button", { name: /submit for review/i }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3));
    const [url, init] = fetchMock.mock.calls[2]!;
    expect(url).toBe("/api/students/student-1/profile/draft/submit");
    expect(init.method).toBe("POST");
  });

  it("shows the published profile section once a profile has been published", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ ...draft, status: "APPROVED" }));
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        id: "pub-1",
        studentProfileId: "student-1",
        bio: "An aspiring architect.",
        skills: ["Rendering"],
        software: ["Rhino"],
        selectedProjects: [],
        portfolioLinks: [],
        resumeFileId: null,
        certifications: [],
        internships: [],
        publishedFromDraftId: "draft-1",
        publishedAt: "2026-08-05T00:00:00.000Z",
        publishedByUserId: "sec-1",
      }),
    );

    render(<StudentProfilePage />);

    expect(await screen.findByRole("heading", { name: "Published Profile" })).toBeInTheDocument();
  });

  it("does not error when no draft exists yet (new student)", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(null, false));
    fetchMock.mockResolvedValueOnce(jsonResponse(null, false));

    render(<StudentProfilePage />);

    expect(await screen.findByRole("button", { name: /save draft/i })).toBeInTheDocument();
    expect(screen.queryByText(/unable to load/i)).not.toBeInTheDocument();
  });

  it("shows a first-time guidance message and 0-of-4 completion when no draft exists yet", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(null, false));
    fetchMock.mockResolvedValueOnce(jsonResponse(null, false));

    render(<StudentProfilePage />);

    expect(await screen.findByText(/fill in the fields below and save your first draft/i)).toBeInTheDocument();
    expect(screen.getByText("0 of 4")).toBeInTheDocument();
  });

  it("shows 4-of-4 profile completion once every tracked field is filled in", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(draft)); // bio, skills, software, portfolioLinks all non-empty
    fetchMock.mockResolvedValueOnce(jsonResponse(null, false));

    render(<StudentProfilePage />);

    expect(await screen.findByText("4 of 4")).toBeInTheDocument();
  });

  it("shows status-specific guidance for a pending-review draft", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ ...draft, status: "PENDING_REVIEW" }));
    fetchMock.mockResolvedValueOnce(jsonResponse(null, false));

    render(<StudentProfilePage />);

    expect(await screen.findByText(/your draft is with a reviewer/i)).toBeInTheDocument();
  });

  it("shows status-specific guidance once approved", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ ...draft, status: "APPROVED" }));
    fetchMock.mockResolvedValueOnce(jsonResponse(null, false));

    render(<StudentProfilePage />);

    expect(await screen.findByText(/approved and visible to recruiters/i)).toBeInTheDocument();
  });
});
