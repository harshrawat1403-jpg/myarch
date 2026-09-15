// @vitest-environment jsdom
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const fetchMock = vi.fn();

import { RegistrationForm } from "../../../src/components/public/registration-form";

const BATCHES = [{ id: "batch-1", name: "B.Arch 2027" }];

function jsonResponse(body: unknown, ok = true, status = ok ? 200 : 400) {
  return { ok, status, json: async () => ({ data: body }) };
}

describe("RegistrationForm — public student registration (V4.0 B1)", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  it("loads the batch options on mount", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(BATCHES));
    render(<RegistrationForm />);

    expect(await screen.findByRole("option", { name: "B.Arch 2027" })).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith("/api/registration/batches");
  });

  it("shows a safe error and prevents submission when registration cannot load batches", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({ error: { code: "INTERNAL_SERVER_ERROR", message: "Registration is temporarily unavailable. Please try again shortly." } }),
    });
    render(<RegistrationForm />);

    expect(await screen.findByText("Registration is temporarily unavailable. Please try again shortly.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /submit application/i })).toBeDisabled();
  });

  it("shows validation errors for empty required fields and does not submit", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(BATCHES));
    const user = userEvent.setup();
    render(<RegistrationForm />);
    await screen.findByRole("option", { name: "B.Arch 2027" });

    await user.click(screen.getByRole("button", { name: /submit application/i }));

    expect(screen.getByText("Enter your full name.")).toBeInTheDocument();
    expect(screen.getByText("Enter a valid email address.")).toBeInTheDocument();
    expect(screen.getByText("Enter your roll number.")).toBeInTheDocument();
    expect(screen.getByText("Select a batch.")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("submits valid data and shows the confirmation", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(BATCHES));
    fetchMock.mockResolvedValueOnce(jsonResponse({ id: "req-1", status: "SUBMITTED" }, true, 201));
    const user = userEvent.setup();
    render(<RegistrationForm />);
    await screen.findByRole("option", { name: "B.Arch 2027" });

    await user.type(screen.getByLabelText("Full name"), "Priya New Student");
    await user.type(screen.getByLabelText("Email"), "priya@example.com");
    await user.type(screen.getByLabelText("Roll number"), "BA2027099");
    await user.selectOptions(screen.getByLabelText("Batch"), "batch-1");
    await user.click(screen.getByRole("button", { name: /submit application/i }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    const [url, init] = fetchMock.mock.calls[1]!;
    expect(url).toBe("/api/registration");
    const body = JSON.parse(init.body);
    expect(body).toMatchObject({
      fullName: "Priya New Student",
      email: "priya@example.com",
      rollNumber: "BA2027099",
      batchId: "batch-1",
    });
    expect(await screen.findByText(/application received/i)).toBeInTheDocument();
    expect(screen.getByText(/verify your email before the secretary can approve/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /resend the verification email/i })).toHaveAttribute("href", "/verify-email");
  });

  it("shows the server's error message on a duplicate/conflict response, without showing the confirmation", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(BATCHES));
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 409,
      json: async () => ({ error: { code: "CONFLICT", message: "An account or pending application already uses this email" } }),
    });
    const user = userEvent.setup();
    render(<RegistrationForm />);
    await screen.findByRole("option", { name: "B.Arch 2027" });

    await user.type(screen.getByLabelText("Full name"), "Priya New Student");
    await user.type(screen.getByLabelText("Email"), "priya@example.com");
    await user.type(screen.getByLabelText("Roll number"), "BA2027099");
    await user.selectOptions(screen.getByLabelText("Batch"), "batch-1");
    await user.click(screen.getByRole("button", { name: /submit application/i }));

    expect(await screen.findByText(/already uses this email/i)).toBeInTheDocument();
    expect(screen.queryByText(/application received/i)).not.toBeInTheDocument();
  });
});
