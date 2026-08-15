// @vitest-environment jsdom
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const fetchMock = vi.fn();
let mockAuthState: { accessToken: string | null; role: string | null; isLoading: boolean };

vi.mock("@/modules/auth/client", () => ({
  useAuth: () => mockAuthState,
}));

import { MaintenanceReportForm } from "../../../src/components/public/maintenance-report-form";

function jsonResponse(body: unknown, status = 200) {
  return { ok: status < 400, status, json: async () => ({ data: body }) };
}

describe("MaintenanceReportForm — public Maintenance reporting entry point", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  it("shows a loading state while auth status is resolving", () => {
    mockAuthState = { accessToken: null, role: null, isLoading: true };
    render(<MaintenanceReportForm />);

    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it("shows the anonymous report form (with name/email) to an unauthenticated visitor, including a sign-in offer, not just a sign-in wall", () => {
    mockAuthState = { accessToken: null, role: null, isLoading: false };
    render(<MaintenanceReportForm />);

    expect(screen.getByLabelText(/^name$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^email$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/category/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/location/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
    // No attachment field for anonymous submissions (first implementation).
    expect(screen.queryByLabelText(/photo/i)).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /sign in/i })).toHaveAttribute("href", "/login");
  });

  it("tells an ineligible authenticated role (e.g. Recruiter) that Maintenance reporting doesn't apply to their account, and does not fall back to the anonymous form", () => {
    mockAuthState = { accessToken: "token", role: "RECRUITER", isLoading: false };
    render(<MaintenanceReportForm />);

    expect(screen.getByText(/available to students and department staff/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/category/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/^name$/i)).not.toBeInTheDocument();
  });

  it("shows the real authenticated form (with attachment, no name/email fields) for an authenticated Student", () => {
    mockAuthState = { accessToken: "token", role: "STUDENT", isLoading: false };
    render(<MaintenanceReportForm />);

    expect(screen.getByLabelText(/category/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/location/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/priority/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/photo/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/^name$/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/^email$/i)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /submit report/i })).toBeInTheDocument();
  });

  it("authenticated: submits via the existing POST /api/maintenance/issues and shows a success state with the reference ID and a tracking link", async () => {
    mockAuthState = { accessToken: "token", role: "STUDENT", isLoading: false };
    fetchMock.mockResolvedValueOnce(jsonResponse({ id: "issue-123" }, 201));
    const user = userEvent.setup();
    render(<MaintenanceReportForm />);

    await user.type(screen.getByLabelText(/location/i), "Studio 3");
    await user.type(screen.getByLabelText(/description/i), "Broken window latch");
    await user.click(screen.getByRole("button", { name: /submit report/i }));

    expect(await screen.findByText(/report submitted/i)).toBeInTheDocument();
    expect(screen.getByText("issue-123")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /track this report/i })).toHaveAttribute("href", "/maintenance/issue-123");

    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe("/api/maintenance/issues");
    expect(init.method).toBe("POST");
    expect(init.headers.Authorization).toBe("Bearer token");
    const body = JSON.parse(init.body);
    expect(body).toMatchObject({ location: "Studio 3", description: "Broken window latch", category: "ELECTRICAL", priority: "MEDIUM" });
  });

  it("authenticated: shows the server's error message and stays on the form when submission fails", async () => {
    mockAuthState = { accessToken: "token", role: "STUDENT", isLoading: false };
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({ error: { code: "VALIDATION_ERROR", message: "Invalid issue data" } }),
    });
    const user = userEvent.setup();
    render(<MaintenanceReportForm />);

    await user.type(screen.getByLabelText(/location/i), "Studio 3");
    await user.type(screen.getByLabelText(/description/i), "Broken window latch");
    await user.click(screen.getByRole("button", { name: /submit report/i }));

    expect(await screen.findByText("Invalid issue data")).toBeInTheDocument();
    expect(screen.queryByText(/report submitted/i)).not.toBeInTheDocument();
  });

  it("authenticated: rejects an oversized attachment client-side before ever calling the upload endpoint", async () => {
    mockAuthState = { accessToken: "token", role: "STUDENT", isLoading: false };
    const user = userEvent.setup();
    render(<MaintenanceReportForm />);

    const bigFile = new File([new Uint8Array(6 * 1024 * 1024)], "photo.jpg", { type: "image/jpeg" });
    const input = screen.getByLabelText(/photo/i);
    await user.upload(input, bigFile);

    expect(await screen.findByText(/5mb or smaller/i)).toBeInTheDocument();
  });

  it("authenticated: rejects a disallowed attachment type client-side", async () => {
    mockAuthState = { accessToken: "token", role: "STUDENT", isLoading: false };
    const user = userEvent.setup();
    render(<MaintenanceReportForm />);

    const badFile = new File(["not a real doc"], "notes.txt", { type: "text/plain" });
    const input = screen.getByLabelText(/photo/i);
    await user.upload(input, badFile);

    expect(await screen.findByText(/jpeg, png, or pdf/i)).toBeInTheDocument();
  });

  it("authenticated: uploads a valid attachment after the issue is created", async () => {
    mockAuthState = { accessToken: "token", role: "STUDENT", isLoading: false };
    fetchMock.mockResolvedValueOnce(jsonResponse({ id: "issue-456" }, 201));
    fetchMock.mockResolvedValueOnce(jsonResponse({ id: "att-1" }, 201));
    const user = userEvent.setup();
    render(<MaintenanceReportForm />);

    await user.type(screen.getByLabelText(/location/i), "Studio 3");
    await user.type(screen.getByLabelText(/description/i), "Broken window latch");
    const goodFile = new File(["fake-image-bytes"], "photo.jpg", { type: "image/jpeg" });
    await user.upload(screen.getByLabelText(/photo/i), goodFile);
    await user.click(screen.getByRole("button", { name: /submit report/i }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    const [uploadUrl] = fetchMock.mock.calls[1]!;
    expect(uploadUrl).toBe("/api/maintenance/issues/issue-456/attachments");
    expect(await screen.findByText(/report submitted/i)).toBeInTheDocument();
  });

  it("anonymous: submits via the new public POST /api/maintenance/issues/public with no Authorization header, and shows a success state with the reference ID and email-tracking instructions instead of a login-gated tracking link", async () => {
    mockAuthState = { accessToken: null, role: null, isLoading: false };
    fetchMock.mockResolvedValueOnce(jsonResponse({ id: "issue-789" }, 201));
    const user = userEvent.setup();
    render(<MaintenanceReportForm />);

    await user.type(screen.getByLabelText(/^name$/i), "Jane Visitor");
    await user.type(screen.getByLabelText(/^email$/i), "jane@example.com");
    await user.type(screen.getByLabelText(/location/i), "Main Gate");
    await user.type(screen.getByLabelText(/description/i), "Flickering streetlight");
    await user.click(screen.getByRole("button", { name: /submit report/i }));

    expect(await screen.findByText(/report submitted/i)).toBeInTheDocument();
    expect(screen.getByText("issue-789")).toBeInTheDocument();
    expect(screen.getByText(/jane@example\.com/)).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /track this report/i })).not.toBeInTheDocument();

    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe("/api/maintenance/issues/public");
    expect(init.method).toBe("POST");
    expect(init.headers.Authorization).toBeUndefined();
    const body = JSON.parse(init.body);
    expect(body).toMatchObject({
      name: "Jane Visitor",
      email: "jane@example.com",
      location: "Main Gate",
      description: "Flickering streetlight",
      category: "ELECTRICAL",
      priority: "MEDIUM",
    });
  });

  it("anonymous: shows the server's error message (e.g. rate limited) and stays on the form when submission fails", async () => {
    mockAuthState = { accessToken: null, role: null, isLoading: false };
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 429,
      json: async () => ({ error: { code: "TOO_MANY_REQUESTS", message: "Too many reports submitted. Please try again later." } }),
    });
    const user = userEvent.setup();
    render(<MaintenanceReportForm />);

    await user.type(screen.getByLabelText(/^name$/i), "Jane Visitor");
    await user.type(screen.getByLabelText(/^email$/i), "jane@example.com");
    await user.type(screen.getByLabelText(/location/i), "Main Gate");
    await user.type(screen.getByLabelText(/description/i), "Flickering streetlight");
    await user.click(screen.getByRole("button", { name: /submit report/i }));

    expect(await screen.findByText(/too many reports submitted/i)).toBeInTheDocument();
    expect(screen.queryByText(/report submitted/i)).not.toBeInTheDocument();
  });
});
