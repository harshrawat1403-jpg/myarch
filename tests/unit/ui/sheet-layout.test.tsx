// @vitest-environment jsdom
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

let mockPathname = "/dashboard";
const pushMock = vi.fn();
const fetchMock = vi.fn();

vi.mock("next/navigation", () => ({
  usePathname: () => mockPathname,
  useRouter: () => ({ push: pushMock }),
}));

vi.mock("@/modules/auth/client", () => ({
  useAuth: () => ({ role: "SECRETARY", accessToken: "test-access-token" }),
}));

import { SheetLayout } from "../../../src/components/sheet-layout";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Overview" },
  { href: "/dashboard/students", label: "Students" },
] as const;

function jsonResponse(body: unknown) {
  return { ok: true, status: 200, json: async () => ({ data: body }) };
}

describe("SheetLayout — the authenticated application shell", () => {
  beforeEach(() => {
    // V4.0 E1 — NotificationBell (rendered inside SheetLayout's header)
    // fetches /api/notifications on mount; every test here gets an empty
    // inbox by default unless a test overrides this mock itself.
    fetchMock.mockReset();
    fetchMock.mockImplementation((url: string) => {
      if (url.includes("/api/notifications")) return Promise.resolve(jsonResponse([]));
      throw new Error(`Unexpected fetch: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);
  });

  it("renders every nav item, the role label, and the page content", () => {
    mockPathname = "/dashboard";
    render(
      <SheetLayout navItems={NAV_ITEMS} roleLabel="Secretary" onLogout={vi.fn()}>
        page content
      </SheetLayout>,
    );

    expect(screen.getAllByRole("link", { name: "Overview" }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("link", { name: "Students" }).length).toBeGreaterThan(0);
    expect(screen.getAllByText("Secretary").length).toBeGreaterThan(0);
    expect(screen.getByText("page content")).toBeInTheDocument();
  });

  it("marks the active nav item with aria-current and no other item", () => {
    mockPathname = "/dashboard/students";
    render(
      <SheetLayout navItems={NAV_ITEMS} roleLabel="Secretary" onLogout={vi.fn()}>
        content
      </SheetLayout>,
    );

    for (const link of screen.getAllByRole("link", { name: "Students" })) {
      expect(link).toHaveAttribute("aria-current", "page");
    }
    for (const link of screen.getAllByRole("link", { name: "Overview" })) {
      expect(link).not.toHaveAttribute("aria-current");
    }
  });

  it("shows breadcrumbs reflecting the active section", () => {
    mockPathname = "/dashboard/students";
    render(
      <SheetLayout navItems={NAV_ITEMS} roleLabel="Secretary" onLogout={vi.fn()}>
        content
      </SheetLayout>,
    );

    const breadcrumb = screen.getByRole("navigation", { name: "Breadcrumb" });
    expect(within(breadcrumb).getByText("TNPArch")).toBeInTheDocument();
    expect(within(breadcrumb).getByText("Students")).toBeInTheDocument();
  });

  it("shows the Coordinator scope sub-label when provided, in both the rail and the user menu", () => {
    mockPathname = "/dashboard";
    render(
      <SheetLayout navItems={NAV_ITEMS} roleLabel="Coordinator" scopeLabel="Scoped to 2 batches" onLogout={vi.fn()}>
        content
      </SheetLayout>,
    );

    expect(screen.getAllByText("Scoped to 2 batches").length).toBeGreaterThan(0);
  });

  it("the mobile menu is closed by default and opens on hamburger click, focus-trapped", async () => {
    mockPathname = "/dashboard";
    const user = userEvent.setup();
    render(
      <SheetLayout navItems={NAV_ITEMS} roleLabel="Secretary" onLogout={vi.fn()}>
        content
      </SheetLayout>,
    );

    const toggle = screen.getByRole("button", { name: /open navigation menu/i });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(document.getElementById("authenticated-mobile-menu")).not.toBeInTheDocument();

    await user.click(toggle);

    expect(screen.getByRole("button", { name: /close navigation menu/i })).toHaveAttribute("aria-expanded", "true");
    await waitFor(() => {
      const menu = document.getElementById("authenticated-mobile-menu");
      expect(menu?.contains(document.activeElement)).toBe(true);
    });
  });

  it("closes the mobile menu on Escape", async () => {
    mockPathname = "/dashboard";
    const user = userEvent.setup();
    render(
      <SheetLayout navItems={NAV_ITEMS} roleLabel="Secretary" onLogout={vi.fn()}>
        content
      </SheetLayout>,
    );

    await user.click(screen.getByRole("button", { name: /open navigation menu/i }));
    expect(document.getElementById("authenticated-mobile-menu")).toBeInTheDocument();

    await user.keyboard("{Escape}");

    await waitFor(() => expect(document.getElementById("authenticated-mobile-menu")).not.toBeInTheDocument());
  });

  it("calls onLogout via the user menu", async () => {
    const onLogout = vi.fn();
    mockPathname = "/dashboard";
    const user = userEvent.setup();
    render(
      <SheetLayout navItems={NAV_ITEMS} roleLabel="Secretary" onLogout={onLogout}>
        content
      </SheetLayout>,
    );

    await user.click(screen.getByRole("button", { name: /account menu/i }));
    await user.click(screen.getByRole("button", { name: /log out/i }));

    expect(onLogout).toHaveBeenCalledTimes(1);
  });

  it("V4.0 E1 — renders a real, interactive notification bell that opens an empty inbox", async () => {
    mockPathname = "/dashboard";
    const user = userEvent.setup();
    render(
      <SheetLayout navItems={NAV_ITEMS} roleLabel="Secretary" onLogout={vi.fn()}>
        content
      </SheetLayout>,
    );

    const bell = await screen.findByRole("button", { name: /^notifications$/i });
    await user.click(bell);

    expect(await screen.findByText("No notifications yet.")).toBeInTheDocument();
  });

  it("V4.0 E1 — shows an unread indicator and marks a notification read on click", async () => {
    mockPathname = "/dashboard";
    fetchMock.mockImplementation((url: string) => {
      if (url.includes("/api/notifications/notif-1/read")) return Promise.resolve(jsonResponse({ id: "notif-1" }));
      if (url.includes("/api/notifications")) {
        return Promise.resolve(
          jsonResponse([
            { id: "notif-1", title: "Profile approved", message: "Your profile is now visible.", isRead: false, createdAt: "2026-08-01T00:00:00.000Z" },
          ]),
        );
      }
      throw new Error(`Unexpected fetch: ${url}`);
    });
    const user = userEvent.setup();
    render(
      <SheetLayout navItems={NAV_ITEMS} roleLabel="Secretary" onLogout={vi.fn()}>
        content
      </SheetLayout>,
    );

    const bell = await screen.findByRole("button", { name: /1 unread/i });
    await user.click(bell);
    await user.click(await screen.findByText("Profile approved"));

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/notifications/notif-1/read",
        expect.objectContaining({ method: "PATCH" }),
      ),
    );
  });
});
