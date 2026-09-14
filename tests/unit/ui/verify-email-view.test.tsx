// @vitest-environment jsdom
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const fetchMock = vi.fn();

const navigationState = { params: new URLSearchParams() };
vi.mock("next/navigation", () => ({
  useSearchParams: () => navigationState.params,
}));

import { VerifyEmailView } from "../../../src/components/public/verify-email-view";

function jsonResponse(status: number, body: unknown) {
  return { ok: status < 400, status, json: async () => body };
}

describe("VerifyEmailView — resend verification (MYARCH product-completion pass)", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    navigationState.params = new URLSearchParams();
    vi.stubGlobal("fetch", fetchMock);
  });

  it("shows approval waiting guidance after a verified pending registration without Sign In", async () => {
    navigationState.params = new URLSearchParams("token=pending-token");
    fetchMock.mockResolvedValueOnce(
      jsonResponse(200, {
        data: {
          email: "student@example.edu",
          registration: { status: "REVIEWED", accountExists: false, credentialsEmailSent: null },
        },
      }),
    );
    render(<VerifyEmailView />);
    expect(await screen.findByText("Email verified successfully")).toBeInTheDocument();
    expect(screen.getByText(/waiting for department approval/i)).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /sign in/i })).not.toBeInTheDocument();
  });

  it("shows Sign In only when an approved account exists and never exposes a password", async () => {
    navigationState.params = new URLSearchParams("token=approved-token");
    fetchMock.mockResolvedValueOnce(
      jsonResponse(200, {
        data: {
          email: "student@example.edu",
          registration: { status: "APPROVED", accountExists: true, credentialsEmailSent: true },
        },
      }),
    );
    render(<VerifyEmailView />);
    expect(await screen.findByText("Your MYARCH account has been created.")).toBeInTheDocument();
    expect(screen.getByText(/credentials have been sent/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Go to Sign In" })).toHaveAttribute("href", "/login");
    expect(screen.queryByText(/temporary/i)).not.toBeInTheDocument();
  });

  it("shows contact guidance when credentials delivery is unknown or failed", async () => {
    navigationState.params = new URLSearchParams("token=approved-token");
    fetchMock.mockResolvedValueOnce(
      jsonResponse(200, {
        data: {
          email: "student@example.edu",
          registration: { status: "APPROVED", accountExists: true, credentialsEmailSent: null },
        },
      }),
    );
    render(<VerifyEmailView />);
    expect(await screen.findByText(/credentials could not be delivered/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Go to Sign In" })).toBeInTheDocument();
  });

  it("shows a rejected state without Sign In", async () => {
    navigationState.params = new URLSearchParams("token=rejected-token");
    fetchMock.mockResolvedValueOnce(
      jsonResponse(200, {
        data: {
          email: "student@example.edu",
          registration: { status: "REJECTED", accountExists: false, credentialsEmailSent: null },
        },
      }),
    );
    render(<VerifyEmailView />);
    expect(await screen.findByText(/registration was not approved/i)).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /sign in/i })).not.toBeInTheDocument();
  });

  it("shows the resend guidance and a resend form when no token is present", () => {
    render(<VerifyEmailView />);

    expect(screen.getByText(/enter your email address to receive a new verification link/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/resend the verification email/i)).toBeInTheDocument();
  });

  it("shows the generic success message after a successful resend request", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(200, { data: { message: "If that email has a pending verification, we've resent the link." } }),
    );
    const user = userEvent.setup();
    render(<VerifyEmailView />);

    await user.type(screen.getByLabelText(/resend the verification email/i), "student@example.edu");
    await user.click(screen.getByRole("button", { name: /resend verification email/i }));

    expect(await screen.findByText(/we've resent the link/i)).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/auth/resend-verification",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("shows the rate-limit message on a 429 without pretending it succeeded", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(429, { error: { code: "RATE_LIMITED", message: "Too many requests. Please try again later." } }),
    );
    const user = userEvent.setup();
    render(<VerifyEmailView />);

    await user.type(screen.getByLabelText(/resend the verification email/i), "student@example.edu");
    await user.click(screen.getByRole("button", { name: /resend verification email/i }));

    expect(await screen.findByText("Too many requests. Please try again later.")).toBeInTheDocument();
    // Distinct from the success path — the form stays visible for a retry.
    expect(screen.getByLabelText(/resend the verification email/i)).toBeInTheDocument();
  });

  it("shows the server's validation error without calling it success", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(400, { error: { code: "VALIDATION_ERROR", message: "Invalid email" } }));
    const user = userEvent.setup();
    render(<VerifyEmailView />);

    // A syntactically valid address — this exercises the component's own
    // handling of a server-side 400, not the browser's native <input
    // type="email"> constraint validation (which would otherwise block
    // submission before the component's handler ever runs).
    await user.type(screen.getByLabelText(/resend the verification email/i), "student@example.edu");
    await user.click(screen.getByRole("button", { name: /resend verification email/i }));

    await waitFor(() => expect(screen.getByText("Invalid email")).toBeInTheDocument());
  });

  it("disables the submit button while the request is in flight", async () => {
    let resolveFetch: (value: unknown) => void = () => {};
    fetchMock.mockReturnValueOnce(new Promise((resolve) => (resolveFetch = resolve)));
    const user = userEvent.setup();
    render(<VerifyEmailView />);

    await user.type(screen.getByLabelText(/resend the verification email/i), "student@example.edu");
    await user.click(screen.getByRole("button", { name: /resend verification email/i }));

    expect(screen.getByRole("button", { name: /sending/i })).toBeDisabled();
    resolveFetch(jsonResponse(200, { data: { message: "Resent." } }));
    await screen.findByText("Resent.");
  });
});
