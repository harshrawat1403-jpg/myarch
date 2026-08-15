// @vitest-environment jsdom
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const fetchMock = vi.fn();

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
}));

import { VerifyEmailView } from "../../../src/components/public/verify-email-view";

function jsonResponse(status: number, body: unknown) {
  return { ok: status < 400, status, json: async () => body };
}

describe("VerifyEmailView — resend verification (MYARCH product-completion pass)", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  it("shows the invalid-link message and a resend form when no token is present", () => {
    render(<VerifyEmailView />);

    expect(screen.getByText(/invalid or incomplete/i)).toBeInTheDocument();
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
