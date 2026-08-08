import { X } from "lucide-react";
import { Button, type ButtonProps } from "./button";

export interface FloatingActionBarAction {
  label: string;
  onClick: () => void;
  variant?: ButtonProps["variant"];
  disabled?: boolean;
}

export interface FloatingActionBarProps {
  selectedCount: number;
  onClear: () => void;
  actions: readonly FloatingActionBarAction[];
}

/**
 * The bulk-action toolbar that appears once a bulk-select table has any
 * rows checked — no precedent existed anywhere in the app before V3.0
 * (Student Management's table had per-row actions only). Renders nothing
 * when nothing is selected, so mounting it unconditionally at the bottom of
 * any bulk-select page is always safe.
 */
export function FloatingActionBar({ selectedCount, onClear, actions }: FloatingActionBarProps) {
  if (selectedCount === 0) return null;

  return (
    <div className="fixed bottom-6 left-1/2 z-40 flex -translate-x-1/2 items-center gap-3 rounded-md border border-(--color-border) bg-(--color-surface) px-4 py-3 shadow-lg">
      <span className="text-sm font-medium text-(--color-text-primary)">
        {selectedCount} selected
      </span>
      <button
        type="button"
        onClick={onClear}
        aria-label="Clear selection"
        className="inline-flex h-7 w-7 items-center justify-center rounded-md text-(--color-text-secondary) transition-colors duration-150 hover:bg-(--color-surface-muted) hover:text-(--color-text-primary) focus:outline-none focus-visible:ring-2 focus-visible:ring-(--color-accent)"
      >
        <X aria-hidden="true" size={14} strokeWidth={1.75} />
      </button>
      <div className="h-5 w-px bg-(--color-border)" />
      {actions.map((action) => (
        <Button
          key={action.label}
          type="button"
          variant={action.variant ?? "secondary"}
          onClick={action.onClick}
          disabled={action.disabled}
        >
          {action.label}
        </Button>
      ))}
    </div>
  );
}
