import type { ButtonHTMLAttributes } from "react";

type ButtonVariant = "primary" | "secondary" | "ghost" | "destructive";

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: "bg-[--color-accent] text-[--color-background] hover:opacity-90",
  secondary:
    "bg-transparent border border-[--color-text-secondary]/40 text-[--color-text-primary] hover:border-[--color-accent]",
  ghost: "bg-transparent text-[--color-text-secondary] hover:text-[--color-text-primary]",
  destructive: "bg-transparent border border-red-500/50 text-red-400 hover:bg-red-500/10",
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

/**
 * The one Button primitive every dashboard action uses — variants map
 * directly to the restrained accent-usage rule in
 * docs/design/12_Design_System.md ("the accent color is used sparingly and
 * consistently for interactive/actionable elements only").
 */
export function Button({ variant = "secondary", className = "", ...props }: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-md px-4 py-2 font-[family-name:var(--font-body)] text-sm font-medium transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-50 ${VARIANT_CLASSES[variant]} ${className}`}
      {...props}
    />
  );
}
