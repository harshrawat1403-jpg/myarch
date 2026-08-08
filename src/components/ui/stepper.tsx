import { Check } from "lucide-react";

export interface StepperStep {
  readonly id: string;
  readonly label: string;
}

export interface StepperProps {
  steps: readonly StepperStep[];
  currentStepId: string;
}

/**
 * V3.0 Administration Platform: a horizontal step indicator for the
 * Academic Year Transition Wizard — built from scratch (no precedent
 * exists elsewhere in the app). Purely presentational: it renders position
 * relative to `currentStepId` in the given `steps` list, and holds no
 * navigation state itself — the page owns which step is active.
 */
export function Stepper({ steps, currentStepId }: StepperProps) {
  const currentIndex = steps.findIndex((step) => step.id === currentStepId);

  return (
    <ol className="flex flex-wrap items-center gap-2" aria-label="Progress">
      {steps.map((step, index) => {
        const isCompleted = index < currentIndex;
        const isCurrent = index === currentIndex;

        return (
          <li key={step.id} className="flex items-center gap-2">
            <div className="flex items-center gap-2">
              <span
                aria-current={isCurrent ? "step" : undefined}
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition-colors duration-150 ${
                  isCompleted
                    ? "bg-(--color-accent) text-white"
                    : isCurrent
                      ? "border-2 border-(--color-accent) text-(--color-accent)"
                      : "border border-(--color-border) text-(--color-text-secondary)"
                }`}
              >
                {isCompleted ? <Check aria-hidden="true" size={14} strokeWidth={2.5} /> : index + 1}
              </span>
              <span
                className={`text-sm ${
                  isCurrent ? "font-semibold text-(--color-text-primary)" : "text-(--color-text-secondary)"
                }`}
              >
                {step.label}
                {/* Completion is otherwise conveyed by color/checkmark alone — status must always
                    also be a label, never color alone (matches Badge's documented accessibility rule). */}
                {isCompleted && <span className="sr-only"> (completed)</span>}
                {isCurrent && <span className="sr-only"> (current step)</span>}
              </span>
            </div>
            {index < steps.length - 1 && (
              <span aria-hidden="true" className="h-px w-6 shrink-0 bg-(--color-border) sm:w-10" />
            )}
          </li>
        );
      })}
    </ol>
  );
}
