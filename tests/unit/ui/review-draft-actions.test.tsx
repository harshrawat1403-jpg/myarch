// @vitest-environment jsdom
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const pushMock = vi.fn();
const fetchMock = vi.fn();
const useAuthMock = vi.fn();

vi.mock("next/navigation", () => ({
  useParams: () => ({ studentId: "student-1" }),
  useRouter: () => ({ push: pushMock }),
}));

vi.mock("@/modules/auth/client", () => ({
  useAuth: () => useAuthMock(),
}));

import ReviewDraftPage from "../../../src/app/(admin)/dashboard/approvals/[studentId]/page";

function jsonResponse(body: unknown, ok = true, status = ok ? 200 : 400) {
  return {
    ok,
    status,
    json: async () => ({ data: body }),
  };
}

describe("Approval review page — dashboard actions call the existing use cases only", () => {
  beforeEach(() => {
    pushMock.mockClear();
    fetchMock.mockReset();
    useAuthMock.mockReset();
    useAuthMock.mockReturnValue({ accessToken: "test-access-token", role: "SECRETARY" });
    vi.stubGlobal("fetch", fetchMock);
  });

  const pendingDraft = {
    id: "draft-1",
    studentProfileId: "student-1",
    status: "PENDING_REVIEW",
    bio: "An architecture student",
    skills: ["Rendering"],
    software: ["Rhino"],
    selectedProjects: [],
    portfolioLinks: [],
    certifications: [],
    internships: [],
    reviewComment: null,
  };

  it("loads the draft and calls the approve endpoint when Approve is clicked", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(pendingDraft));
    fetchMock.mockResolvedValueOnce(jsonResponse({ id: "published-1" }));

    const user = userEvent.setup();
    render(<ReviewDraftPage />);

    expect(await screen.findByText("An architecture student")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /^approve$/i }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    const [approveUrl, approveInit] = fetchMock.mock.calls[1]!;
    expect(approveUrl).toBe("/api/students/student-1/profile/draft/approve");
    expect(approveInit.method).toBe("POST");
    expect(approveInit.headers.Authorization).toBe("Bearer test-access-token");

    await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/dashboard/approvals"));
  });

  it("calls the request-changes endpoint with the entered comment", async () => {
    useAuthMock.mockReturnValue({ accessToken: "test-access-token", role: "COORDINATOR" });
    fetchMock.mockResolvedValueOnce(jsonResponse(pendingDraft));
    fetchMock.mockResolvedValueOnce(jsonResponse({ ...pendingDraft, status: "CHANGES_REQUESTED" }));

    const user = userEvent.setup();
    render(<ReviewDraftPage />);

    await screen.findByText("An architecture student");

    const textarea = screen.getByPlaceholderText(/describe what needs to change/i);
    await user.type(textarea, "Please add a portfolio link");
    await user.click(screen.getByRole("button", { name: /request changes/i }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    const [url, init] = fetchMock.mock.calls[1]!;
    expect(url).toBe("/api/students/student-1/profile/draft/request-changes");
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body)).toEqual({ reviewComment: "Please add a portfolio link" });
  });

  it("does not show review actions once a draft has already been approved", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ ...pendingDraft, status: "APPROVED" }));

    render(<ReviewDraftPage />);

    await screen.findByText("An architecture student");
    expect(screen.queryByRole("button", { name: /^approve$/i })).not.toBeInTheDocument();
  });

  it("hides the Approve action from a Coordinator (V4.0 Q1: Secretary is the sole final approval authority)", async () => {
    useAuthMock.mockReturnValue({ accessToken: "test-access-token", role: "COORDINATOR" });
    fetchMock.mockResolvedValueOnce(jsonResponse(pendingDraft));

    render(<ReviewDraftPage />);

    await screen.findByText("An architecture student");
    expect(screen.queryByRole("button", { name: /^approve$/i })).not.toBeInTheDocument();
    expect(screen.getByText(/only the secretary can approve a profile/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /request changes/i })).toBeInTheDocument();
  });
});
