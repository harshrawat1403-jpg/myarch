// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ConfirmDialog } from "../../../src/components/ui/confirm-dialog";

describe("ConfirmDialog", () => {
  it("renders the title and description when open", () => {
    render(
      <ConfirmDialog
        isOpen
        onClose={vi.fn()}
        onConfirm={vi.fn()}
        title="Disable this account?"
        description="They will no longer be able to sign in."
      />,
    );

    expect(screen.getByText("Disable this account?")).toBeInTheDocument();
    expect(screen.getByText("They will no longer be able to sign in.")).toBeInTheDocument();
  });

  it("calls onConfirm when the confirm button is clicked", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    render(
      <ConfirmDialog isOpen onClose={vi.fn()} onConfirm={onConfirm} title="Confirm?" description="Are you sure?" />,
    );

    await user.click(screen.getByRole("button", { name: "Confirm" }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("calls onClose when Cancel is clicked, not onConfirm", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    const onClose = vi.fn();
    render(<ConfirmDialog isOpen onClose={onClose} onConfirm={onConfirm} title="Confirm?" description="Sure?" />);

    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("uses custom confirm/cancel labels when provided", () => {
    render(
      <ConfirmDialog
        isOpen
        onClose={vi.fn()}
        onConfirm={vi.fn()}
        title="Archive?"
        description="This can be undone."
        confirmLabel="Archive"
        cancelLabel="Keep active"
      />,
    );

    expect(screen.getByRole("button", { name: "Archive" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Keep active" })).toBeInTheDocument();
  });

  it("disables both buttons and shows a working state while isConfirming", () => {
    render(
      <ConfirmDialog
        isOpen
        onClose={vi.fn()}
        onConfirm={vi.fn()}
        title="Disable?"
        description="Sure?"
        isConfirming
      />,
    );

    expect(screen.getByRole("button", { name: "Working…" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled();
  });
});
