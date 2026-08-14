"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { FieldError, Input, Label } from "@/components/ui/input";
import { Logo } from "@/components/logo";

/**
 * MYARCH Phase 1 (§2.4) — public, unauthenticated. Anti-enumeration:
 * ForgotPasswordUseCase always resolves identically regardless of whether
 * the email exists, so this page always shows the same success state — it
 * never has an error path to render beyond a network failure.
 */
export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      if (!res.ok && res.status !== 429) {
        const body = await res.json().catch(() => null);
        setError(body?.error?.message ?? "Something went wrong. Please try again.");
        return;
      }
      if (res.status === 429) {
        const body = await res.json().catch(() => null);
        setError(body?.error?.message ?? "Too many attempts. Please try again later.");
        return;
      }
      setSubmitted(true);
    } catch {
      setError("Unable to reach the server. Please try again.");
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
            MYARCH
          </p>
        </div>
        <h1 className="mt-8 text-center font-[family-name:var(--font-display)] text-xl text-(--color-text-primary)">
          Reset your password
        </h1>

        {submitted ? (
          <p className="mt-6 text-center text-sm text-(--color-text-secondary)">
            If an account exists for <span className="font-medium text-(--color-text-primary)">{email}</span>,
            we&apos;ve sent a password reset link to it. The link expires in 1 hour.
          </p>
        ) : (
          <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="username"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <FieldError>{error ?? undefined}</FieldError>

            <Button type="submit" variant="primary" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? "Sending…" : "Send reset link"}
            </Button>
          </form>
        )}

        <p className="mt-6 text-center text-sm text-(--color-text-secondary)">
          <Link href="/login" className="font-medium text-(--color-accent) hover:underline">
            Back to sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
