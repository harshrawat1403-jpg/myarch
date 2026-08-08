// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Stepper } from "../../../src/components/ui/stepper";

const STEPS = [
  { id: "batches", label: "Batch Transitions" },
  { id: "intake", label: "New Intake" },
  { id: "review", label: "Review & Confirm" },
];

describe("Stepper", () => {
  it("renders every step's label", () => {
    render(<Stepper steps={STEPS} currentStepId="intake" />);
    expect(screen.getByText("Batch Transitions")).toBeInTheDocument();
    expect(screen.getByText("New Intake")).toBeInTheDocument();
    expect(screen.getByText("Review & Confirm")).toBeInTheDocument();
  });

  it("marks the current step with aria-current=step", () => {
    render(<Stepper steps={STEPS} currentStepId="intake" />);
    expect(screen.getByText("2")).toHaveAttribute("aria-current", "step");
  });

  it("shows a checkmark (no visible number) for completed steps", () => {
    render(<Stepper steps={STEPS} currentStepId="review" />);
    expect(screen.queryByText("1")).not.toBeInTheDocument();
    expect(screen.queryByText("2")).not.toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("announces completed/current status as text, not color alone", () => {
    render(<Stepper steps={STEPS} currentStepId="review" />);
    expect(screen.getAllByText("(completed)")).toHaveLength(2);
    expect(screen.getByText("(current step)")).toBeInTheDocument();
  });
});
