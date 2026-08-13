"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/modules/auth/client";
import { ApiError } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { FieldError, Input, Label } from "@/components/ui/input";
import { Logo } from "@/components/logo";

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      const { role } = await login(email, password);
      if (role === "SECRETARY" || role === "COORDINATOR") {
        router.push("/dashboard");
      } else if (role === "RECRUITER") {
        router.push("/recruiter");
      } else if (role === "STUDENT") {
        router.push("/student");
      } else {
        setError("Your account role isn't recognized by this portal.");
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
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
          <p className="text-xs text-(--color-text-secondary)">Architecture & Planning, VNIT</p>
        </div>
        <h1 className="mt-8 text-center font-[family-name:var(--font-display)] text-xl text-(--color-text-primary)">
          Department sign in
        </h1>

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
          <div>
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <FieldError>{error ?? undefined}</FieldError>

          <Button type="submit" variant="primary" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? "Signing in…" : "Sign in"}
          </Button>
        </form>
      </div>
    </main>
  );
}
