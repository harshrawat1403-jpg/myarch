import { Image as ImageIcon } from "lucide-react";

export interface ImagePlaceholderProps {
  /**
   * A plain, honest description of what would go here, e.g. "Hero Image" or
   * "Map integration pending" — never a fabricated stock photo, and never
   * phrased as an instruction to a future editor ("Replace...", "Click to
   * edit..."). Not painted on screen (see this component's own doc
   * comment) — used only as the element's `aria-label`, so a screen-reader
   * user still learns what belongs in this slot.
   */
  label: string;
  aspect?: "square" | "video" | "wide" | "tall" | "auto";
  /** The root element already carries `relative` (it's the positioning context for the corner tag) — passing `absolute` here conflicts with that rather than overriding it. To position an instance absolutely within a parent, wrap it in a plain `<div className="absolute ...">` instead. */
  className?: string;
  /** No longer renders anything (see this component's own doc comment) — kept only so existing call sites passing `tag={false}` don't need updating. */
  tag?: boolean;
  /** Set `false` when embedded flush inside another rounded, `overflow-hidden` container (e.g. the top of a gallery card) — avoids a mismatched inner radius peeking through the parent's clip. Defaults to `true` for standalone use. */
  rounded?: boolean;
  /** Which token pair the gradient field draws from — repeating the exact same two-tone wash on every image slot on a page (six of them, on Home) reads as one flat scaffold rather than six distinct pictures-to-be. Four tones drawn from the existing palette give each slot a slightly different color identity without inventing new colors. */
  tone?: "violet" | "amber" | "cool" | "bold";
  /** Drops the centered icon badge, leaving only the gradient field — for large full-bleed uses where this placeholder is a backdrop behind other content rather than a standalone "image slot" (the centered icon would otherwise visually collide with whatever sits on top). */
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
 *
 * MYARCH public showcase: renders no visible text at all — no "Editable"
 * corner tag, no centered caption. Both were, in different ways, an editor-
 * facing scaffold leaking into the public marketing experience; a
 * missing-image slot should read as an intentional, polished empty state
 * (icon + soft gradient field only), not as a labeled gap waiting to be
 * filled in.
 * `label` still carries the same honest description it always did — it's
 * just the element's `aria-label` now, never painted on screen.
 */
export function ImagePlaceholder({
  label,
  aspect = "video",
  className = "",
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
      {!minimal && (
        <span
          className={`flex h-14 w-14 items-center justify-center rounded-full shadow-sm ${TONE_ICON_CLASSES[tone]}`}
        >
          <ImageIcon aria-hidden="true" size={22} strokeWidth={1.5} />
        </span>
      )}
    </div>
  );
}
