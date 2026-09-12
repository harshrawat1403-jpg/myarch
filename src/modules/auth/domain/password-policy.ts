/**
 * Server-side password floor shared by every credential-creation path.
 * A password must be at least 10 characters and contain at least three of
 * lowercase, uppercase, digit, and symbol character classes.
 */
export function isStrongEnoughPassword(password: string): boolean {
  if (password.length < 10) return false;
  const classes = [/[a-z]/, /[A-Z]/, /[0-9]/, /[^a-zA-Z0-9]/].filter((pattern) => pattern.test(password));
  return classes.length >= 3;
}

export const PASSWORD_STRENGTH_MESSAGE =
  "Password must be at least 10 characters and include at least 3 of: lowercase, uppercase, digit, symbol";
