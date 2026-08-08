"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle } from "lucide-react";
import { useAuth } from "@/modules/auth/client";
import { apiClient, ApiError } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { FieldError, Input, Label } from "@/components/ui/input";
import { PasswordStrengthMeter } from "@/components/ui/password-strength-meter";
import { Logo } from "@/components/logo";

const ROLE_HOME: Record<string, string> = {
  SECRETARY: "/dashboard",
  COORDINATOR: "/dashboard",
  RECRUITER: "/recruiter",
  STUDENT: "/student",
};

/**
 * Reachable by any authenticated role — mounted outside every role-specific
 * shell since a mustChangePassword session could hold any of the four
 * roles. Two entry points: forced (useRequireRole redirects here when
 * mustChangePassword is true — the actual enforcement is server-side, see
 * with-auth.ts) and voluntary (Account Settings' own "Change password"
 * action, M3, links here too — same form, same endpoint).
 */
export default function ChangePasswordPage() {
  const { accessToken, role, mustChangePassword, applySessionToken, logout } = useAuth();
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (newPassword !== confirmPassword) {
      setError("New password and confirmation do not match.");
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await apiClient.post<{ accessToken: string; role: string }>(
        "/api/auth/change-password",
        { currentPassword, newPassword },
        accessToken ?? undefined,
      );
      applySessionToken(result.accessToken);
      router.replace(ROLE_HOME[result.role] ?? "/login");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Unable to change your password. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-(--color-background) px-4">
      <div className="w-full max-w-sm rounded-lg border border-(--color-border) bg-(--color-surface) p-8">
        <div className="flex flex-col items-center text-center">
          <Logo variant="mark" size="lg" />
          <p className="mt-4 font-[family-name:var(--font-display)] text-lg font-bold text-(--color-text-primary)">
            TNPArch
          </p>
        </div>

        <h1 className="mt-8 text-center font-[family-name:var(--font-display)] text-xl text-(--color-text-primary)">
          Set a new password
        </h1>

        {mustChangePassword && (
          <div className="mt-4 flex gap-2.5 rounded-lg border border-(--color-warning)/30 bg-(--color-warning-soft) p-3">
            <AlertCircle aria-hidden="true" size={16} strokeWidth={1.75} className="mt-0.5 shrink-0 text-(--color-warning)" />
            <p className="text-sm text-(--color-text-primary)">
              You&apos;re signing in with a temporary password. Choose a new one to continue.
            </p>
          </div>
        )}

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <div>
            <Label htmlFor="currentPassword">Current password</Label>
            <Input
              id="currentPassword"
              type="password"
              autoComplete="current-password"
              required
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="newPassword">New password</Label>
            <Input
              id="newPassword"
              type="password"
              autoComplete="new-password"
              required
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
            <div className="mt-2">
              <PasswordStrengthMeter password={newPassword} />
            </div>
          </div>
          <div>
            <Label htmlFor="confirmPassword">Confirm new password</Label>
            <Input
              id="confirmPassword"
              type="password"
              autoComplete="new-password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>

          <FieldError>{error ?? undefined}</FieldError>

          <Button type="submit" variant="primary" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? "Updating…" : "Update password"}
          </Button>
        </form>

        {!mustChangePassword && role && (
          <button
            type="button"
            onClick={() => router.push(ROLE_HOME[role] ?? "/login")}
            className="mt-4 w-full text-center text-sm text-(--color-text-secondary) transition-colors duration-150 hover:text-(--color-text-primary)"
          >
            Cancel
          </button>
        )}

        <button
          type="button"
          onClick={() => {
            void logout().then(() => router.replace("/login"));
          }}
          className="mt-2 w-full text-center text-xs text-(--color-text-secondary) transition-colors duration-150 hover:text-(--color-text-primary)"
        >
          Sign out instead
        </button>
      </div>
    </main>
  );
}
