// @vitest-environment jsdom
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
}));

vi.mock("next/navigation", () => ({ useParams: () => ({ id: "request-1" }) }));
vi.mock("@/modules/auth/client", () => ({
  useAuth: () => ({ accessToken: "secretary-token", role: "SECRETARY" }),
}));
vi.mock("@/lib/api-client", () => ({
  apiClient: mocks,
  ApiError: class ApiError extends Error {},
}));

import RegistrationDetailPage from "../../../src/app/(admin)/dashboard/registrations/[id]/page";
import { ToastProvider } from "../../../src/components/ui/toast";

function request(emailVerifiedAt: string | null) {
  return {
    id: "request-1",
    email: "applicant@example.edu",
    fullName: "Applicant Name",
    rollNumber: "BA2027001",
    batchId: "batch-1",
    submittedData: {},
    status: "SUBMITTED",
    emailVerifiedAt,
    coordinatorComment: null,
    reviewedByUserId: null,
    reviewedAt: null,
    decidedByUserId: null,
    decidedAt: null,
    rejectionReason: null,
    resultingStudentProfileId: null,
    createdAt: "2026-09-13T00:00:00.000Z",
    updatedAt: "2026-09-13T00:00:00.000Z",
  };
}

function renderPage() {
  return render(<ToastProvider><RegistrationDetailPage /></ToastProvider>);
}

describe("RegistrationDetailPage email verification", () => {
  beforeEach(() => {
    mocks.get.mockReset();
    mocks.post.mockReset();
  });

  it("shows an unverified status, offers a resend action, and disables approval", async () => {
    mocks.get.mockResolvedValue(request(null));
    renderPage();

    expect(await screen.findByText("Not verified")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /resend verification email/i })).toBeEnabled();
    expect(screen.getByRole("button", { name: /^approve$/i })).toBeDisabled();
    expect(screen.getByText(/approval is unavailable until/i)).toBeInTheDocument();
  });

  it("requests a registration-bound resend for an unverified applicant", async () => {
    mocks.get.mockResolvedValue(request(null));
    mocks.post.mockResolvedValue({ resent: true });
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole("button", { name: /resend verification email/i }));

    await waitFor(() => expect(mocks.post).toHaveBeenCalledWith(
      "/api/registration/request-1/verification/resend",
      {},
      "secretary-token",
    ));
  });

  it("shows verified status and enables approval", async () => {
    mocks.get.mockResolvedValue(request("2026-09-13T00:00:00.000Z"));
    renderPage();

    expect(await screen.findByText("Verified")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /resend verification email/i })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^approve$/i })).toBeEnabled();
  });
});
