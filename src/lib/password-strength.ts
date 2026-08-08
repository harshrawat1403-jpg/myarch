/**
 * Client-only feedback — the actual floor is enforced server-side by
 * ChangePasswordRequestSchema (src/modules/auth/presentation/validation.ts),
 * which this scorer's `meetsMinimum` mirrors exactly (≥10 characters, ≥3 of
 * {lowercase, uppercase, digit, symbol}) so the meter never tells a user
 * their password is fine when the server would reject it, or vice versa.
 */
export type PasswordStrengthLabel = "Very weak" | "Weak" | "Fair" | "Good" | "Strong";

export interface PasswordStrengthResult {
  readonly score: 0 | 1 | 2 | 3 | 4;
  readonly label: PasswordStrengthLabel;
  readonly meetsMinimum: boolean;
}

const MIN_LENGTH = 10;
const LABELS: readonly PasswordStrengthLabel[] = ["Very weak", "Weak", "Fair", "Good", "Strong"];

function countCharacterClasses(password: string): number {
  const classes = [/[a-z]/, /[A-Z]/, /[0-9]/, /[^a-zA-Z0-9]/];
  return classes.filter((pattern) => pattern.test(password)).length;
}

export function scorePasswordStrength(password: string): PasswordStrengthResult {
  const classCount = countCharacterClasses(password);
  const meetsMinimum = password.length >= MIN_LENGTH && classCount >= 3;

  let score: 0 | 1 | 2 | 3 | 4;
  if (password.length === 0) {
    score = 0;
  } else if (password.length < MIN_LENGTH || classCount < 2) {
    score = 1;
  } else if (classCount === 2) {
    score = 2;
  } else if (classCount === 3) {
    score = 3;
  } else {
    score = password.length >= 14 ? 4 : 3;
  }

  return { score, label: LABELS[score]!, meetsMinimum };
}
