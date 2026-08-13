import Image from "next/image";

// A plain `/public`-relative string + explicit intrinsic size, rather than
// a JS static import — `next/image` accepts both, but a static import only
// resolves to the rich `{ src, width, height }` object under Next's own
// bundler. Vitest's plain Vite pipeline resolves the same import to a bare
// string, which `next/image` then rejects for missing width/height. A
// string `src` plus explicit dimensions works identically in both.
const LOGO_SRC = "/brand/logo.png";
const LOGO_NATURAL_SIZE = 1024;

export interface LogoProps {
  /** "mark" — the glyph alone. "full" — glyph plus the MYARCH / VNIT Nagpur wordmark beside it. */
  variant?: "mark" | "full";
  /** Preset sizes matching each placement's spec: `xs` (footer), `sm` (collapsed sidebar), `md` (nav/sidebar/drawer — the default), `lg` (login/loading hero). */
  size?: "xs" | "sm" | "md" | "lg";
  /** `light` recolors the mark pure white via a CSS filter — no second asset to maintain. Every current placement is on a light surface and uses the default `dark` (the mark's own near-black); `light` is here for the day a dark/colored section needs it. */
  tone?: "dark" | "light";
  className?: string;
}

const MARK_SIZE_CLASSES: Record<NonNullable<LogoProps["size"]>, string> = {
  xs: "h-6 w-6",
  sm: "h-8 w-8",
  md: "h-9 w-9 sm:h-10 sm:w-10 lg:h-12 lg:w-12",
  lg: "h-14 w-14 sm:h-16 sm:w-16",
};

const WORDMARK_NAME_SIZE: Record<NonNullable<LogoProps["size"]>, string> = {
  xs: "text-sm",
  sm: "text-base",
  md: "text-[21px]",
  lg: "text-2xl",
};

/**
 * The one shared brand mark — every page that needs the MYARCH logo
 * imports this instead of hand-rolling an `<Image>` call. Wraps the
 * provided asset (`public/brand/logo.png`) exactly as supplied: no
 * redraw, no SVG recreation, just responsive sizing and an optional
 * monochrome-white recolor via CSS filter (`brightness-0 invert` turns
 * any opaque pixel white regardless of its original color, preserving the
 * source alpha shape) so a second file was never needed for dark
 * backgrounds.
 *
 * `variant="full"` marks the glyph `aria-hidden` rather than giving it its
 * own `alt` — the adjacent visible "MYARCH" text already announces the
 * name, and a screen reader shouldn't hear it twice. `variant="mark"`
 * (used alone, e.g. the collapsed sidebar) carries the real `alt` text
 * instead, since nothing else nearby conveys it.
 */
export function Logo({ variant = "mark", size = "md", tone = "dark", className = "" }: LogoProps) {
  const mark = (
    <Image
      src={LOGO_SRC}
      width={LOGO_NATURAL_SIZE}
      height={LOGO_NATURAL_SIZE}
      alt={variant === "mark" ? "MYARCH Logo" : ""}
      aria-hidden={variant === "full" ? true : undefined}
      priority={size === "lg"}
      className={`shrink-0 object-contain ${MARK_SIZE_CLASSES[size]} ${tone === "light" ? "brightness-0 invert" : ""} ${
        variant === "mark" ? className : ""
      }`}
    />
  );

  if (variant === "mark") return mark;

  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      {mark}
      <span className="flex flex-col leading-tight">
        <span
          className={`font-[family-name:var(--font-display)] font-bold text-(--color-text-primary) ${WORDMARK_NAME_SIZE[size]}`}
        >
          MYARCH
        </span>
        <span className="text-xs text-(--color-text-secondary)">VNIT Nagpur</span>
      </span>
    </span>
  );
}
