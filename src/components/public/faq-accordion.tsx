export interface FaqItem {
  question: string;
  answer: string;
}

export interface FaqAccordionProps {
  items: FaqItem[];
}

/**
 * A native `<details>`/`<summary>` accordion — no JavaScript, no custom
 * ARIA, keyboard-operable and screen-reader-correct by default, matching
 * the "minimal, professional motion" brief with a single 150ms marker
 * rotation rather than a hand-built expand/collapse animation.
 */
export function FaqAccordion({ items }: FaqAccordionProps) {
  return (
    <div className="divide-y divide-(--color-border) border-y border-(--color-border)">
      {items.map((item) => (
        <details key={item.question} className="group py-4">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-[family-name:var(--font-display)] text-base text-(--color-text-primary) [&::-webkit-details-marker]:hidden">
            {item.question}
            <span
              aria-hidden="true"
              className="shrink-0 text-lg text-(--color-accent) transition-transform duration-150 group-open:rotate-45"
            >
              +
            </span>
          </summary>
          <p className="mt-3 text-sm text-(--color-text-secondary)">{item.answer}</p>
        </details>
      ))}
    </div>
  );
}
