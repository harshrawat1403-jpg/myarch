// @vitest-environment jsdom
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

let mockPathname = "/";

vi.mock("next/navigation", () => ({
  usePathname: () => mockPathname,
}));

import { PublicNav } from "../../../src/components/public/public-nav";

describe("PublicNav — public site navigation", () => {
  it("renders all 6 content links plus Sign In", () => {
    mockPathname = "/";
    render(<PublicNav />);

    for (const label of ["Home", "About", "Placements", "Students", "Recruiters", "Contact"]) {
      expect(screen.getAllByRole("link", { name: label }).length).toBeGreaterThan(0);
    }
    expect(screen.getAllByRole("link", { name: "Sign In" }).length).toBeGreaterThan(0);
  });

  it("marks the current page with aria-current, and no other link", () => {
    mockPathname = "/about";
    render(<PublicNav />);

    const aboutLinks = screen.getAllByRole("link", { name: "About" });
    for (const link of aboutLinks) {
      expect(link).toHaveAttribute("aria-current", "page");
    }
    const homeLinks = screen.getAllByRole("link", { name: "Home" });
    for (const link of homeLinks) {
      expect(link).not.toHaveAttribute("aria-current");
    }
  });

  it("the Sign In link points to /login", () => {
    mockPathname = "/";
    render(<PublicNav />);

    const [signIn] = screen.getAllByRole("link", { name: "Sign In" });
    expect(signIn).toHaveAttribute("href", "/login");
  });

  it("the mobile menu is closed by default and opens on hamburger click", async () => {
    mockPathname = "/";
    const user = userEvent.setup();
    render(<PublicNav />);

    expect(screen.queryByRole("navigation", { name: "Primary" })).toBeTruthy(); // desktop nav always in the DOM
    const toggle = screen.getByRole("button", { name: /open navigation menu/i });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(document.getElementById("public-mobile-menu")).not.toBeInTheDocument();

    await user.click(toggle);

    expect(screen.getByRole("button", { name: /close navigation menu/i })).toHaveAttribute("aria-expanded", "true");
    expect(document.getElementById("public-mobile-menu")).toBeInTheDocument();
  });

  it("closes the mobile menu on Escape", async () => {
    mockPathname = "/";
    const user = userEvent.setup();
    render(<PublicNav />);

    await user.click(screen.getByRole("button", { name: /open navigation menu/i }));
    expect(document.getElementById("public-mobile-menu")).toBeInTheDocument();

    await user.keyboard("{Escape}");

    await waitFor(() => expect(document.getElementById("public-mobile-menu")).not.toBeInTheDocument());
  });

  it("moves focus into the mobile menu when it opens (focus trap engaging)", async () => {
    mockPathname = "/";
    const user = userEvent.setup();
    render(<PublicNav />);

    await user.click(screen.getByRole("button", { name: /open navigation menu/i }));

    await waitFor(() => {
      const menu = document.getElementById("public-mobile-menu");
      expect(menu?.contains(document.activeElement)).toBe(true);
    });
  });
});
