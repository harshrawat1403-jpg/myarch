// @vitest-environment jsdom
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const fetchMock = vi.fn();
let mockPathname = "/dashboard";

vi.mock("next/navigation", () => ({
  usePathname: () => mockPathname,
}));

vi.mock("@/modules/auth/client", () => ({
  useAuth: () => ({ accessToken: "test-access-token" }),
}));

import { NotificationBell } from "../../../src/components/notification-bell";

function jsonResponse(body: unknown) {
  return { ok: true, status: 200, json: async () => ({ data: body }) };
}

const READ_NOTIFICATION = {
  id: "notif-read",
  title: "Registration reviewed",
  message: "A Coordinator has reviewed this request.",
  isRead: true,
  createdAt: "2026-08-01T00:00:00.000Z",
  destination: null,
};

const ACTIONABLE_UNREAD = {
  id: "notif-actionable",
  title: "Profile approved",
  message: "Your public profile has been approved.",
  isRead: false,
  createdAt: "2026-08-02T00:00:00.000Z",
  destination: "/student/profile",
};

const NON_ACTIONABLE_UNREAD = {
  id: "notif-plain",
  title: "Account created",
  message: "A MYARCH account has been created for you.",
  isRead: false,
  createdAt: "2026-08-03T00:00:00.000Z",
  destination: null,
};

describe("NotificationBell — popover UX (V4.0 UX fix)", () => {
  beforeEach(() => {
    mockPathname = "/dashboard";
    fetchMock.mockReset();
    fetchMock.mockImplementation((url: string) => {
      if (url.includes("/api/notifications/notif-actionable/read")) return Promise.resolve(jsonResponse({ id: "notif-actionable" }));
      if (url.includes("/api/notifications/notif-plain/read")) return Promise.resolve(jsonResponse({ id: "notif-plain" }));
      if (url.includes("/api/notifications")) {
        return Promise.resolve(jsonResponse([ACTIONABLE_UNREAD, NON_ACTIONABLE_UNREAD, READ_NOTIFICATION]));
      }
      throw new Error(`Unexpected fetch: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);
  });

  it("is closed by default and toggles open on bell click", async () => {
    const user = userEvent.setup();
    render(
      <div>
        <NotificationBell />
      </div>,
    );

    const bell = await screen.findByRole("button", { name: /unread/i });
    expect(bell).toHaveAttribute("aria-expanded", "false");
    expect(document.getElementById("notification-panel")).not.toBeInTheDocument();

    await user.click(bell);
    expect(bell).toHaveAttribute("aria-expanded", "true");
    expect(document.getElementById("notification-panel")).toBeInTheDocument();
  });

  it("clicking the bell again toggles the panel closed", async () => {
    const user = userEvent.setup();
    render(<NotificationBell />);

    const bell = await screen.findByRole("button", { name: /unread/i });
    await user.click(bell);
    expect(document.getElementById("notification-panel")).toBeInTheDocument();

    await user.click(bell);
    expect(document.getElementById("notification-panel")).not.toBeInTheDocument();
  });

  it("closes when clicking outside the panel", async () => {
    const user = userEvent.setup();
    render(
      <div>
        <button type="button">Outside element</button>
        <NotificationBell />
      </div>,
    );

    const bell = await screen.findByRole("button", { name: /unread/i });
    await user.click(bell);
    expect(document.getElementById("notification-panel")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Outside element" }));
    await waitFor(() => expect(document.getElementById("notification-panel")).not.toBeInTheDocument());
  });

  it("does not close when clicking inside the panel", async () => {
    const user = userEvent.setup();
    render(<NotificationBell />);

    const bell = await screen.findByRole("button", { name: /unread/i });
    await user.click(bell);

    await user.click(await screen.findByText("Registration reviewed"));

    expect(document.getElementById("notification-panel")).toBeInTheDocument();
  });

  it("closes on Escape", async () => {
    const user = userEvent.setup();
    render(<NotificationBell />);

    const bell = await screen.findByRole("button", { name: /unread/i });
    await user.click(bell);
    expect(document.getElementById("notification-panel")).toBeInTheDocument();

    await user.keyboard("{Escape}");
    await waitFor(() => expect(document.getElementById("notification-panel")).not.toBeInTheDocument());
  });

  it("moves focus into the panel when it opens", async () => {
    const user = userEvent.setup();
    render(<NotificationBell />);

    await user.click(await screen.findByRole("button", { name: /unread/i }));

    await waitFor(() => expect(document.getElementById("notification-panel")?.contains(document.activeElement)).toBe(true));
  });

  it("renders an actionable notification as a real link to its destination", async () => {
    const user = userEvent.setup();
    render(<NotificationBell />);

    await user.click(await screen.findByRole("button", { name: /unread/i }));

    expect(await screen.findByRole("link", { name: /profile approved/i })).toHaveAttribute("href", "/student/profile");
  });

  it("clicking an actionable notification marks it read and closes the panel", async () => {
    const user = userEvent.setup();
    render(<NotificationBell />);

    await user.click(await screen.findByRole("button", { name: /unread/i }));
    await user.click(await screen.findByRole("link", { name: /profile approved/i }));

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/notifications/notif-actionable/read",
        expect.objectContaining({ method: "PATCH" }),
      ),
    );
    await waitFor(() => expect(document.getElementById("notification-panel")).not.toBeInTheDocument());
  });

  it("a notification without a destination still renders and marks read on click, without a link/navigation", async () => {
    const user = userEvent.setup();
    render(<NotificationBell />);

    await user.click(await screen.findByRole("button", { name: /unread/i }));
    expect(screen.queryByRole("link", { name: /account created/i })).not.toBeInTheDocument();

    await user.click(await screen.findByRole("button", { name: /account created/i }));

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/notifications/notif-plain/read",
        expect.objectContaining({ method: "PATCH" }),
      ),
    );
  });
});
