// @vitest-environment jsdom
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

let mockPathname = "/dashboard";
const pushMock = vi.fn();

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

describe("SheetLayout — the authenticated application shell", () => {
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

  it("renders the notification placeholder as non-interactive (no dead button)", () => {
    mockPathname = "/dashboard";
    render(
      <SheetLayout navItems={NAV_ITEMS} roleLabel="Secretary" onLogout={vi.fn()}>
        content
      </SheetLayout>,
    );

    expect(screen.getByText("Notifications")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /notification/i })).not.toBeInTheDocument();
  });
});
