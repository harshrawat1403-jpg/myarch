// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { useRef, useState } from "react";
import { useFocusTrap } from "../../../src/lib/use-focus-trap";

/** Minimal harness: a trigger button plus a conditionally-rendered trapped region, matching how PublicNav's drawer (and the future Modal) actually use the hook. */
function Harness() {
  const [active, setActive] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  useFocusTrap(active, containerRef);

  return (
    <div>
      <button onClick={() => setActive(true)}>Open</button>
      {active && (
        <div ref={containerRef}>
          <button>First</button>
          <button>Second</button>
          <button onClick={() => setActive(false)}>Close</button>
        </div>
      )}
    </div>
  );
}

describe("useFocusTrap", () => {
  it("moves focus to the first focusable element inside the container on activation", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(screen.getByRole("button", { name: "Open" }));

    expect(screen.getByRole("button", { name: "First" })).toHaveFocus();
  });

  it("cycles Tab from the last focusable element back to the first", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(screen.getByRole("button", { name: "Open" }));
    screen.getByRole("button", { name: "Close" }).focus();
    await user.tab();

    expect(screen.getByRole("button", { name: "First" })).toHaveFocus();
  });

  it("cycles Shift+Tab from the first focusable element to the last", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(screen.getByRole("button", { name: "Open" })); // focus lands on "First"
    await user.tab({ shift: true });

    expect(screen.getByRole("button", { name: "Close" })).toHaveFocus();
  });

  it("restores focus to the previously focused element once deactivated", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const openButton = screen.getByRole("button", { name: "Open" });

    await user.click(openButton);
    await user.click(screen.getByRole("button", { name: "Close" }));

    expect(openButton).toHaveFocus();
  });
});
