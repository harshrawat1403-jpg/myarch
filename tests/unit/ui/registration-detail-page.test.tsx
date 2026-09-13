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

  it("shows an unverified status, keeps approval available, and displays the manual-approval warning", async () => {
    mocks.get.mockResolvedValue(request(null));
    const user = userEvent.setup();
    renderPage();

    expect(await screen.findByText("Not verified")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /resend verification email/i })).toBeEnabled();
    await user.click(screen.getByRole("button", { name: /^approve$/i }));
    expect(await screen.findByText("Email not verified")).toBeInTheDocument();
    expect(screen.getByText(/manually approving this registration/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /approve & create account/i })).toBeEnabled();
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

  it("shows a safe delivery-failure message when verification transport rejects the resend", async () => {
    mocks.get.mockResolvedValue(request(null));
    mocks.post.mockResolvedValue({ resent: true, emailSent: false });
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole("button", { name: /resend verification email/i }));

    expect(await screen.findByText(/verification link could not be sent/i)).toBeInTheDocument();
  });

  it("shows verified status and enables approval", async () => {
    mocks.get.mockResolvedValue(request("2026-09-13T00:00:00.000Z"));
    renderPage();

    expect(await screen.findByText("Verified")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /resend verification email/i })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^approve$/i })).toBeEnabled();
  });

  it("shows credential-delivery status and a confirmed credentials reset after approval", async () => {
    mocks.get.mockResolvedValue(request("2026-09-13T00:00:00.000Z"));
    mocks.post
      .mockResolvedValueOnce({
        request: { ...request("2026-09-13T00:00:00.000Z"), status: "APPROVED", resultingStudentProfileId: "student-1" },
        tempPassword: "InitialTemp123!",
        credentialsEmailSent: false,
      })
      .mockResolvedValueOnce({ tempPassword: "NewTemp123!", credentialsEmailSent: true });
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole("button", { name: /^approve$/i }));
    await user.click(screen.getByRole("button", { name: /approve & create account/i }));

    expect(await screen.findByText(/account created, but credentials email could not be sent/i)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /resend account credentials/i }));
    expect(await screen.findByText(/resending credentials will generate a new temporary password/i)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /generate & send credentials/i }));

    await waitFor(() => expect(mocks.post).toHaveBeenCalledWith(
      "/api/registration/request-1/credentials/resend",
      {},
      "secretary-token",
    ));
  });
});
