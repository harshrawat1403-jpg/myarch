import { useEffect, useRef, type InputHTMLAttributes } from "react";

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  label: string;
  /** V3.0: renders the native "partially checked" visual state (e.g. a bulk-select header checkbox when some but not all rows are selected). A DOM property, not an HTML attribute, so it's set imperatively via a ref rather than passed through JSX. */
  indeterminate?: boolean;
  /** V3.0: keeps `label` in the accessibility tree but visually hides it — a bulk-select table's per-row "Select {name}" checkbox needs an accessible name without repeating visible text next to every row. */
  hideLabel?: boolean;
}

/**
 * Themed replacement for the raw `<input type="checkbox">` element. Uses
 * the native `accent-color` CSS property (Tailwind's `accent-*` utility)
 * rather than a fully custom SVG-based control — themes the native
 * element's checked state correctly across browsers without the
 * complexity of a hand-built control, consistent with `Input`/`Select`/
 * `Textarea` also being themed native elements rather than custom-built
 * ones. Version 2.0: `accent-(--color-accent)` now resolves to the new
 * lavender primary automatically (token value change only).
 */
export function Checkbox({
  label,
  className = "",
  id,
  indeterminate = false,
  hideLabel = false,
  ...props
}: CheckboxProps) {
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (ref.current) ref.current.indeterminate = indeterminate;
  }, [indeterminate]);

  return (
    <label className="flex items-center gap-2 text-sm text-(--color-text-secondary)">
      <input
        ref={ref}
        type="checkbox"
        id={id}
        className={`h-4 w-4 rounded border-(--color-border) bg-(--color-surface) accent-(--color-accent) focus:outline-none focus:ring-2 focus:ring-(--color-accent)/20 ${className}`}
        {...props}
      />
      {hideLabel ? <span className="sr-only">{label}</span> : label}
    </label>
  );
}
