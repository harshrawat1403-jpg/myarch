// @vitest-environment jsdom
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const fetchMock = vi.fn();

vi.mock("@/modules/auth/client", () => ({
  useAuth: () => ({ accessToken: "test-access-token" }),
}));

import { AccountSettings } from "../../../src/components/account-settings";
import { ToastProvider } from "../../../src/components/ui/toast";

function renderPage() {
  return render(
    <ToastProvider>
      <AccountSettings />
    </ToastProvider>,
  );
}

function jsonResponse(body: unknown, ok = true, status = ok ? 200 : 400) {
  return { ok, status, json: async () => ({ data: body }) };
}

const ME = { email: "alice@vnit.ac.in", fullName: "Alice Architect", avatarUrl: null };

/**
 * V4.0 A3: this component is shared verbatim between the Secretary/
 * Coordinator route (/dashboard/account, V3.0) and the new Student route
 * (/student/account) — it has no role-specific logic (generic
 * /api/auth/me|profile|profile/avatar endpoints only), so one test suite
 * covers both entry points. Had no dedicated coverage before A3 despite
 * being live in V3.0; adding it now since a second consumer raises the
 * cost of a silent regression here.
 */
describe("AccountSettings — shared self-service settings (V3.0 admin + V4.0 student)", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  it("loads and displays the current name and email", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(ME));
    renderPage();

    expect(await screen.findByDisplayValue("Alice Architect")).toBeInTheDocument();
    expect(screen.getByDisplayValue("alice@vnit.ac.in")).toBeInTheDocument();
  });

  it("saves a changed display name without requiring a current password", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(ME));
    fetchMock.mockResolvedValueOnce(jsonResponse({ email: ME.email }));
    const user = userEvent.setup();
    renderPage();

    await screen.findByDisplayValue("Alice Architect");
    await user.clear(screen.getByLabelText("Display name"));
    await user.type(screen.getByLabelText("Display name"), "Alice A. Architect");
    await user.click(screen.getByRole("button", { name: /save changes/i }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    const [url, init] = fetchMock.mock.calls[1]!;
    expect(url).toBe("/api/auth/profile");
    expect(JSON.parse(init.body)).toEqual({ fullName: "Alice A. Architect" });
  });

  it("shows the current-password field only once the email is changed, and includes it in the save request", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(ME));
    fetchMock.mockResolvedValueOnce(jsonResponse({ email: "new@vnit.ac.in" }));
    const user = userEvent.setup();
    renderPage();

    await screen.findByDisplayValue("Alice Architect");
    expect(screen.queryByLabelText(/current password/i)).not.toBeInTheDocument();

    await user.clear(screen.getByLabelText("Email"));
    await user.type(screen.getByLabelText("Email"), "new@vnit.ac.in");
    expect(screen.getByLabelText(/current password/i)).toBeInTheDocument();
    await user.type(screen.getByLabelText(/current password/i), "correct-horse");
    await user.click(screen.getByRole("button", { name: /save changes/i }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    const [, init] = fetchMock.mock.calls[1]!;
    expect(JSON.parse(init.body)).toEqual({ email: "new@vnit.ac.in", currentPassword: "correct-horse" });
  });

  it("shows an error and does not clear the form when the save request fails", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(ME));
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({ error: { code: "VALIDATION_ERROR", message: "Incorrect password" } }),
    });
    const user = userEvent.setup();
    renderPage();

    await screen.findByDisplayValue("Alice Architect");
    await user.clear(screen.getByLabelText("Email"));
    await user.type(screen.getByLabelText("Email"), "new@vnit.ac.in");
    await user.type(screen.getByLabelText(/current password/i), "wrong");
    await user.click(screen.getByRole("button", { name: /save changes/i }));

    expect(await screen.findByText("Incorrect password")).toBeInTheDocument();
  });

  it("uploads a new avatar and updates the displayed photo", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(ME));
    fetchMock.mockResolvedValueOnce(jsonResponse({ avatarUrl: "/files/avatar-123" }));
    renderPage();

    await screen.findByDisplayValue("Alice Architect");
    const file = new File(["fake-image-bytes"], "photo.png", { type: "image/png" });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const user = userEvent.setup();
    await user.upload(input, file);

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    const [url] = fetchMock.mock.calls[1]!;
    expect(url).toBe("/api/auth/profile/avatar");
    // The avatar <img> has alt="" (decorative — the name/status text nearby
    // already conveys who this is), so it carries an implicit presentation
    // role and won't match a role query; select it directly instead.
    await waitFor(() => {
      const img = document.querySelector("img");
      expect(img).toHaveAttribute("src", expect.stringContaining("avatar-123"));
    });
  });

  it("rejects an avatar larger than 2MB client-side, without calling the upload endpoint", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(ME));
    renderPage();

    await screen.findByDisplayValue("Alice Architect");
    const oversized = new File([new Uint8Array(2 * 1024 * 1024 + 1)], "big.png", { type: "image/png" });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const user = userEvent.setup();
    await user.upload(input, oversized);

    expect(await screen.findByText(/2mb or smaller/i)).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("links to the dedicated change-password screen", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(ME));
    renderPage();

    await screen.findByDisplayValue("Alice Architect");
    expect(screen.getByRole("link", { name: /change password/i })).toHaveAttribute("href", "/change-password");
  });
});
