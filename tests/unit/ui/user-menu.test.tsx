// @vitest-environment jsdom
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { UserMenu } from "../../../src/components/user-menu";

describe("UserMenu — authenticated shell account menu", () => {
  it("shows the role label and, when provided, the scope sub-label", () => {
    render(<UserMenu roleLabel="Coordinator" scopeLabel="Scoped to 2 batches" onLogout={vi.fn()} />);

    expect(screen.getByText("Coordinator")).toBeInTheDocument();
    expect(screen.getByText("Scoped to 2 batches")).toBeInTheDocument();
  });

  it("omits the scope sub-label when none is given", () => {
    render(<UserMenu roleLabel="Secretary" onLogout={vi.fn()} />);
    expect(screen.queryByText(/scoped to/i)).not.toBeInTheDocument();
  });

  it("is closed by default and opens the menu panel on click", async () => {
    const user = userEvent.setup();
    render(<UserMenu roleLabel="Secretary" onLogout={vi.fn()} />);

    const trigger = screen.getByRole("button", { name: /account menu/i });
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("button", { name: /log out/i })).not.toBeInTheDocument();

    await user.click(trigger);

    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("button", { name: /log out/i })).toBeInTheDocument();
  });

  it("moves focus into the panel when it opens", async () => {
    const user = userEvent.setup();
    render(<UserMenu roleLabel="Secretary" onLogout={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: /account menu/i }));

    await waitFor(() => expect(screen.getByRole("button", { name: /log out/i })).toHaveFocus());
  });

  it("closes on Escape", async () => {
    const user = userEvent.setup();
    render(<UserMenu roleLabel="Secretary" onLogout={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: /account menu/i }));
    expect(screen.getByRole("button", { name: /log out/i })).toBeInTheDocument();

    await user.keyboard("{Escape}");

    await waitFor(() => expect(screen.queryByRole("button", { name: /log out/i })).not.toBeInTheDocument());
  });

  it("calls onLogout and closes the menu when Log out is clicked", async () => {
    const onLogout = vi.fn();
    const user = userEvent.setup();
    render(<UserMenu roleLabel="Secretary" onLogout={onLogout} />);

    await user.click(screen.getByRole("button", { name: /account menu/i }));
    await user.click(screen.getByRole("button", { name: /log out/i }));

    expect(onLogout).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("button", { name: /log out/i })).not.toBeInTheDocument();
  });

  it("no longer offers a 'Visit Website' item — that's the sidebar branding's job now", async () => {
    const user = userEvent.setup();
    render(<UserMenu roleLabel="Secretary" onLogout={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: /account menu/i }));

    expect(screen.queryByRole("link", { name: /visit website/i })).not.toBeInTheDocument();
  });
});
