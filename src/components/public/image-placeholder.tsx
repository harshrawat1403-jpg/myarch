import { Image as ImageIcon } from "lucide-react";

export interface ImagePlaceholderProps {
  /** Editable-content instruction shown in place of a real asset, e.g. "Replace Hero Image" — never a fabricated stock photo. */
  label: string;
  aspect?: "square" | "video" | "wide" | "tall" | "auto";
  /** The root element already carries `relative` (it's the positioning context for the corner tag) — passing `absolute` here conflicts with that rather than overriding it. To position an instance absolutely within a parent, wrap it in a plain `<div className="absolute ...">` instead. */
  className?: string;
  /** Hides the small "Editable" corner tag — used where the label itself already reads as an instruction in context (e.g. stacked gallery tiles). */
  tag?: boolean;
  /** Set `false` when embedded flush inside another rounded, `overflow-hidden` container (e.g. the top of a gallery card) — avoids a mismatched inner radius peeking through the parent's clip. Defaults to `true` for standalone use. */
  rounded?: boolean;
  /** Which token pair the gradient field draws from — repeating the exact same two-tone wash on every image slot on a page (six of them, on Home) reads as one flat scaffold rather than six distinct pictures-to-be. Four tones drawn from the existing palette give each slot a slightly different color identity without inventing new colors. */
  tone?: "violet" | "amber" | "cool" | "bold";
  /** Drops the centered icon+label, leaving only the gradient field and (if `tag` is on) the corner tag — for large full-bleed uses where this placeholder is a backdrop behind other content rather than a standalone "image slot" (the centered icon+label would otherwise visually collide with whatever sits on top). */
  minimal?: boolean;
}

const ASPECT_CLASSES: Record<NonNullable<ImagePlaceholderProps["aspect"]>, string> = {
  square: "aspect-square",
  video: "aspect-video",
  wide: "aspect-[21/9]",
  tall: "aspect-[3/4]",
  auto: "h-full",
};

const TONE_CLASSES: Record<NonNullable<ImagePlaceholderProps["tone"]>, string> = {
  violet: "from-(--color-accent-soft) via-(--color-surface-muted) to-(--color-secondary-soft)",
  amber: "from-(--color-highlight-soft) via-(--color-surface-muted) to-(--color-accent-soft)",
  cool: "from-(--color-secondary-soft) via-(--color-surface-muted) to-(--color-surface)",
  bold: "from-(--color-accent) via-(--color-secondary) to-(--color-accent-soft)",
};

const TONE_ICON_CLASSES: Record<NonNullable<ImagePlaceholderProps["tone"]>, string> = {
  violet: "bg-(--color-surface)/85 text-(--color-text-secondary)",
  amber: "bg-(--color-surface)/85 text-(--color-text-secondary)",
  cool: "bg-(--color-surface)/85 text-(--color-text-secondary)",
  bold: "bg-white/20 text-white",
};

const TONE_LABEL_CLASSES: Record<NonNullable<ImagePlaceholderProps["tone"]>, string> = {
  violet: "text-(--color-text-secondary)",
  amber: "text-(--color-text-secondary)",
  cool: "text-(--color-text-secondary)",
  bold: "text-white",
};

/**
 * Version 2.0 (visual pass 2): the "no fake stock images" treatment for
 * every image slot with no real asset yet (no object storage/upload
 * pipeline exists — TECHNICAL_DEBT.md). Deliberately NOT a dashed-border
 * wireframe box — that read as an unfinished technical sketch, the exact
 * "documentation site" feeling the redesign is moving away from. Instead:
 * a soft gradient field (the page's own accent/secondary tokens, so it
 * never looks like an error state) with a floating icon badge, sized to
 * hold real photography's place at full scale rather than shrinking into a
 * small technical box. Reads as a considered, premium "empty state," the
 * same category of design as Notion's or Linear's placeholder art.
 */
export function ImagePlaceholder({
  label,
  aspect = "video",
  className = "",
  tag = true,
  rounded = true,
  tone = "violet",
  minimal = false,
}: ImagePlaceholderProps) {
  return (
    <div
      role="img"
      aria-label={label}
      className={`relative flex ${ASPECT_CLASSES[aspect]} flex-col items-center justify-center gap-3 overflow-hidden ${rounded ? "rounded-[28px]" : ""} bg-gradient-to-br ${TONE_CLASSES[tone]} ${className}`}
    >
      {tag && (
        <span className={`absolute right-4 top-4 rounded-full px-3 py-1 text-[11px] font-medium shadow-sm backdrop-blur ${TONE_ICON_CLASSES[tone]}`}>
          Editable
        </span>
      )}
      {!minimal && (
        <>
          <span className={`flex h-14 w-14 items-center justify-center rounded-full shadow-sm ${TONE_ICON_CLASSES[tone]}`}>
            <ImageIcon aria-hidden="true" size={22} strokeWidth={1.5} />
          </span>
          <p className={`max-w-[70%] text-center text-sm font-medium ${TONE_LABEL_CLASSES[tone]}`}>{label}</p>
        </>
      )}
    </div>
  );
}
