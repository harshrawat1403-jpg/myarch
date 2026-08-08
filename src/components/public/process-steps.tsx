import { CardTitle } from "@/components/ui/typography";

export interface ProcessStep {
  title: string;
  description: string;
}

export interface ProcessStepsProps {
  steps: ProcessStep[];
}

/**
 * A numbered process flow — accent-ringed nodes connected by a hairline,
 * horizontal on desktop and stacked (connector hidden, since a horizontal
 * line reads as noise once the layout is vertical) below `lg`. Built for
 * the Placements page, which needed three separate step sequences on one
 * page (the overall placement process, student preparation, recruiter
 * engagement) — three uses on a single page already demonstrates the reuse
 * this project's component-extraction rule asks for, and it reads as a
 * technical flow diagram rather than a generic numbered list.
 */
export function ProcessSteps({ steps }: ProcessStepsProps) {
  return (
    <ol className="grid gap-8 sm:grid-cols-2 lg:grid-flow-col lg:auto-cols-fr lg:gap-6">
      {steps.map((step, i) => (
        <li key={step.title}>
          <div className="flex items-center">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-(--color-accent-soft) font-[family-name:var(--font-display)] text-xs font-semibold text-(--color-accent)">
              {String(i + 1).padStart(2, "0")}
            </span>
            {i < steps.length - 1 ? (
              <span aria-hidden="true" className="ml-2 hidden h-px flex-1 bg-(--color-border) lg:block" />
            ) : null}
          </div>
          <CardTitle className="mt-4">{step.title}</CardTitle>
          <p className="mt-2 text-sm text-(--color-text-secondary)">{step.description}</p>
        </li>
      ))}
    </ol>
  );
}
