"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FieldError, Input, Label } from "@/components/ui/input";
import { PasswordStrengthMeter } from "@/components/ui/password-strength-meter";
import { DataLabel } from "@/components/ui/typography";

interface FormErrors {
  fullName?: string;
  email?: string;
  companyName?: string;
  password?: string;
}

/**
 * MYARCH Phase 1 (§2.4) — public, unauthenticated Recruiter self-signup.
 * Admin approval required before the account can access recruiter
 * functionality (mirrors RegistrationForm's shape: client-validated, posts
 * to a real backend, shows a durable "submitted" state).
 */
export function RecruiterSignupForm() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [password, setPassword] = useState("");

  const [errors, setErrors] = useState<FormErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setServerError(null);

    const nextErrors: FormErrors = {};
    if (!fullName.trim()) nextErrors.fullName = "Enter your full name.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) nextErrors.email = "Enter a valid email address.";
    if (!companyName.trim()) nextErrors.companyName = "Enter your company name.";
    if (password.length < 10) nextErrors.password = "Password must be at least 10 characters.";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/recruiters/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: fullName.trim(),
          email: email.trim(),
          companyName: companyName.trim(),
          password,
        }),
      });
      const body = await res.json();
      if (!res.ok) {
        setServerError(body?.error?.message ?? "Unable to submit your signup. Please try again.");
        return;
      }
      setSubmitted(true);
    } catch {
      setServerError("Unable to reach the server. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <Card className="p-8 text-center shadow-lg lg:p-12">
        <DataLabel className="text-(--color-accent)">Signup Received</DataLabel>
        <p className="mt-3 text-(--color-text-secondary)">
          Thank you — please check <span className="font-medium text-(--color-text-primary)">{email}</span> to
          verify your address. A Technical Secretary will review your account before you can sign in.
        </p>
      </Card>
    );
  }

  return (
    <Card className="p-8 shadow-lg lg:p-12">
      <form onSubmit={handleSubmit} noValidate className="space-y-6">
        <div>
          <Label htmlFor="rs-fullName">Full name</Label>
          <Input id="rs-fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} />
          <FieldError>{errors.fullName}</FieldError>
        </div>

        <div>
          <Label htmlFor="rs-email">Email</Label>
          <Input
            id="rs-email"
            type="email"
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <FieldError>{errors.email}</FieldError>
        </div>

        <div>
          <Label htmlFor="rs-companyName">Company name</Label>
          <Input id="rs-companyName" value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
          <FieldError>{errors.companyName}</FieldError>
        </div>

        <div>
          <Label htmlFor="rs-password">Password</Label>
          <Input
            id="rs-password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <div className="mt-2">
            <PasswordStrengthMeter password={password} />
          </div>
          <FieldError>{errors.password}</FieldError>
        </div>

        {serverError && <p className="text-sm text-(--color-danger)">{serverError}</p>}

        <Button type="submit" variant="primary" className="w-full py-3 text-base" disabled={isSubmitting}>
          {isSubmitting ? "Submitting…" : "Create Recruiter Account"}
        </Button>

        <p className="text-center text-sm text-(--color-text-secondary)">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-(--color-accent) hover:underline">
            Sign in
          </Link>
        </p>
      </form>
    </Card>
  );
}
