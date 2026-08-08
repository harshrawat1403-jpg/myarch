// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  usePathname: () => "/",
}));

import MarketingLayout from "../../../src/app/(marketing)/layout";

describe("MarketingLayout — the public site's shared shell", () => {
  it("renders the nav, the children in a main landmark, and the footer", () => {
    render(<MarketingLayout>{"page content"}</MarketingLayout>);

    expect(screen.getByRole("banner")).toBeInTheDocument(); // PublicNav's <header>
    expect(screen.getByRole("main")).toHaveTextContent("page content");
    expect(screen.getByRole("contentinfo")).toBeInTheDocument(); // Footer's <footer>
  });

  it("includes a skip-to-content link targeting the main landmark", () => {
    render(<MarketingLayout>{"page content"}</MarketingLayout>);

    const skipLink = screen.getByRole("link", { name: /skip to main content/i });
    expect(skipLink).toHaveAttribute("href", "#main-content");
    expect(screen.getByRole("main")).toHaveAttribute("id", "main-content");
  });
});
