/**
 * A neutral tag pill for rendering short freeform strings (skills, software,
 * keywords) — distinct from `Badge`, which always conveys a semantic status.
 * First needed by the student Career Hub (V4.0 D6), which renders both a
 * skills list and a software list on the same page.
 */
export function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-(--color-border) bg-(--color-surface) px-2.5 py-1 font-[family-name:var(--font-body)] text-xs font-medium text-(--color-text-secondary)">
      {children}
    </span>
  );
}

export function ChipList({ items, emptyLabel }: { items: readonly string[]; emptyLabel?: string }) {
  if (items.length === 0) {
    return emptyLabel ? <p className="text-xs text-(--color-text-secondary)">{emptyLabel}</p> : null;
  }
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((item) => (
        <Chip key={item}>{item}</Chip>
      ))}
    </div>
  );
}
