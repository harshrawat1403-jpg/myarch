"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/modules/auth/client";
import { ApiError } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { FieldError, Input, Label } from "@/components/ui/input";

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
      } else {
        // Student self-service isn't built yet (deferred per the roadmap) —
        // stay here rather than redirect into a route that doesn't exist.
        setError("Student sign-in is not yet available in this portal.");
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[--color-background] px-4">
      <div className="w-full max-w-sm rounded-lg border border-[--color-text-secondary]/20 bg-[--color-surface] p-8">
        <p className="font-[family-name:var(--font-data)] text-xs uppercase tracking-wide text-[--color-text-secondary]">
          TNPArch
        </p>
        <h1 className="mt-1 font-[family-name:var(--font-display)] text-xl text-[--color-text-primary]">
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
