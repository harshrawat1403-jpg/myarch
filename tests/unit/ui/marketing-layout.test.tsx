// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ToastProvider } from "../../../src/components/ui/toast";

vi.mock("next/navigation", () => ({
  usePathname: () => "/",
}));

// MYARCH Edit Mode: the layout now also renders EditModeToolbar, which
// calls useAuth() (mocked here — non-Secretary, so the toolbar itself
// renders nothing) and useToast() (needs a ToastProvider ancestor, added
// below) — kept this a pure component test either way.
vi.mock("@/modules/auth/client", () => ({ useAuth: () => ({ role: null, accessToken: null }) }));

import MarketingLayout from "../../../src/app/(marketing)/layout";

describe("MarketingLayout — the public site's shared shell", () => {
  it("renders the nav, the children in a main landmark, and the footer", () => {
    render(
      <ToastProvider>
        <MarketingLayout>{"page content"}</MarketingLayout>
      </ToastProvider>,
    );

    expect(screen.getByRole("banner")).toBeInTheDocument(); // PublicNav's <header>
    expect(screen.getByRole("main")).toHaveTextContent("page content");
    expect(screen.getByRole("contentinfo")).toBeInTheDocument(); // Footer's <footer>
  });

  it("includes a skip-to-content link targeting the main landmark", () => {
    render(
      <ToastProvider>
        <MarketingLayout>{"page content"}</MarketingLayout>
      </ToastProvider>,
    );

    const skipLink = screen.getByRole("link", { name: /skip to main content/i });
    expect(skipLink).toHaveAttribute("href", "#main-content");
    expect(screen.getByRole("main")).toHaveAttribute("id", "main-content");
  });
});
