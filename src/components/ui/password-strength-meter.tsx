import { scorePasswordStrength } from "@/lib/password-strength";

export interface PasswordStrengthMeterProps {
  password: string;
}

const SEGMENT_COUNT = 4;

const SCORE_COLOR: Record<number, string> = {
  0: "bg-(--color-border)",
  1: "bg-(--color-danger)",
  2: "bg-(--color-warning)",
  3: "bg-(--color-accent)",
  4: "bg-(--color-success)",
};

/** Client-only visual feedback — src/lib/password-strength.ts's doc comment covers how this mirrors the server floor. */
export function PasswordStrengthMeter({ password }: PasswordStrengthMeterProps) {
  const { score, label, meetsMinimum } = scorePasswordStrength(password);
  const filledSegments = password.length === 0 ? 0 : Math.max(1, score);

  return (
    <div aria-live="polite">
      <div className="flex gap-1.5" role="presentation">
        {Array.from({ length: SEGMENT_COUNT }, (_, index) => (
          <span
            key={index}
            className={`h-1.5 flex-1 rounded-full transition-colors duration-150 ${
              index < filledSegments ? SCORE_COLOR[score] : "bg-(--color-surface-muted)"
            }`}
          />
        ))}
      </div>
      {password.length > 0 && (
        <p className={`mt-1.5 text-xs ${meetsMinimum ? "text-(--color-success)" : "text-(--color-text-secondary)"}`}>
          {label}
          {!meetsMinimum && " — at least 10 characters, with 3 of: lowercase, uppercase, digit, symbol"}
        </p>
      )}
    </div>
  );
}
