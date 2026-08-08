// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { RevealPasswordModal } from "../../../src/components/ui/reveal-password-modal";
import { ToastProvider } from "../../../src/components/ui/toast";

function renderModal(props: Partial<React.ComponentProps<typeof RevealPasswordModal>> = {}) {
  return render(
    <ToastProvider>
      <RevealPasswordModal
        isOpen
        onClose={vi.fn()}
        pendingTitle="New Coordinator"
        revealedTitle="Coordinator created"
        tempPassword={null}
        description="Share this temporary password with Alice — it will not be shown again."
        {...props}
      >
        <p>form goes here</p>
      </RevealPasswordModal>
    </ToastProvider>,
  );
}

describe("RevealPasswordModal", () => {
  it("renders the pending title and children before a password is generated", () => {
    renderModal();
    expect(screen.getByText("New Coordinator")).toBeInTheDocument();
    expect(screen.getByText("form goes here")).toBeInTheDocument();
  });

  it("switches to the revealed title, description, and code box once a password is set", () => {
    renderModal({ tempPassword: "abc123-XYZ" });
    expect(screen.getByText("Coordinator created")).toBeInTheDocument();
    expect(screen.queryByText("form goes here")).not.toBeInTheDocument();
    expect(screen.getByText("abc123-XYZ")).toBeInTheDocument();
    expect(
      screen.getByText("Share this temporary password with Alice — it will not be shown again."),
    ).toBeInTheDocument();
  });

  it("copies the password to the clipboard and shows a success toast", async () => {
    const user = userEvent.setup();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
    renderModal({ tempPassword: "abc123-XYZ" });

    await user.click(screen.getByRole("button", { name: "Copy" }));

    expect(writeText).toHaveBeenCalledWith("abc123-XYZ");
    expect(await screen.findByText("Temporary password copied.")).toBeInTheDocument();
  });

  it("calls onClose when Done is clicked", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    renderModal({ tempPassword: "abc123-XYZ", onClose });

    await user.click(screen.getByRole("button", { name: "Done" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
