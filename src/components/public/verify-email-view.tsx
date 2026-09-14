"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label, FieldError } from "@/components/ui/input";

type Status = "verifying" | "success" | "error" | "resend";
type RegistrationStatus = {
  status: "SUBMITTED" | "REVIEWED" | "NEEDS_ATTENTION" | "APPROVED" | "REJECTED";
  accountExists: boolean;
  credentialsEmailSent: boolean | null;
};
type ResendStatus = "idle" | "loading" | "sent" | "rate-limited" | "error";

/** MYARCH Phase 1 (§2.4) — public, unauthenticated. Auto-submits the ?token= from the emailed verification link on mount. */
export function VerifyEmailView() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [status, setStatus] = useState<Status>(token ? "verifying" : "resend");
  const [message, setMessage] = useState<string | null>(null);
  const [registration, setRegistration] = useState<RegistrationStatus | null>(null);
  const [accountExists, setAccountExists] = useState(false);

  const [resendEmail, setResendEmail] = useState("");
  const [resendStatus, setResendStatus] = useState<ResendStatus>("idle");
  const [resendMessage, setResendMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch("/api/auth/verify-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });
        if (cancelled) return;
        if (!res.ok) {
          const body = await res.json().catch(() => null);
          setMessage(body?.error?.message ?? "This verification link is invalid or has expired.");
          setStatus("error");
          return;
        }
        const body = await res.json().catch(() => null);
        setRegistration(body?.data?.registration ?? null);
        setAccountExists(body?.data?.accountExists === true);
        setStatus("success");
      } catch {
        if (!cancelled) {
          setMessage("Unable to reach the server. Please try again.");
          setStatus("error");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [token]);

  /**
   * MYARCH Phase 1–3 product-completion pass — the resend endpoint
   * (ResendEmailVerificationUseCase) is deliberately generic/silent either
   * way, for anti-enumeration (see that use case's own doc comment): it
   * never distinguishes "unknown email" from "already verified" from
   * "resent successfully," always returning the same 200 message. This UI
   * can only ever honestly show that one generic success message, plus the
   * two failure modes the endpoint DOES surface distinctly — a malformed
   * email (400) and rate-limiting (429) — never a fake "invalid" or
   * "already verified" state the backend was specifically built not to
   * reveal.
   */
  async function handleResend(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setResendStatus("loading");
    setResendMessage(null);
    try {
      const res = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: resendEmail }),
      });
      const body = await res.json().catch(() => null);
      if (res.status === 429) {
        setResendMessage(body?.error?.message ?? "Too many requests. Please try again later.");
        setResendStatus("rate-limited");
        return;
      }
      if (!res.ok) {
        setResendMessage(body?.error?.message ?? "Enter a valid email address.");
        setResendStatus("error");
        return;
      }
      setResendMessage(body?.data?.message ?? "If that email has a pending verification, we've resent the link.");
      setResendStatus("sent");
    } catch {
      setResendMessage("Unable to reach the server. Please try again.");
      setResendStatus("error");
    }
  }

  if (status === "verifying") {
    return (
      <div className="mt-6 flex flex-col items-center gap-3 text-center">
        <Loader2 aria-hidden="true" size={22} className="animate-spin text-(--color-accent)" />
        <p className="text-sm text-(--color-text-secondary)">Verifying your email…</p>
      </div>
    );
  }

  if (status === "success") {
    if (registration?.status === "REJECTED") {
      return (
        <div className="mt-6 space-y-4 text-center text-sm text-(--color-text-secondary)">
          <p className="font-medium text-(--color-danger)">Your registration was not approved.</p>
          <p>The department has reviewed your registration and it was rejected.</p>
        </div>
      );
    }
    if (accountExists && !registration) {
      return (
        <div className="mt-6 space-y-4 text-center text-sm text-(--color-text-secondary)">
          <p className="font-medium text-(--color-text-primary)">Your email has been verified.</p>
          <Link href="/login" className="inline-flex w-full items-center justify-center rounded-md bg-(--color-accent) px-4 py-2 font-medium text-white hover:opacity-90">
            Go to Sign In
          </Link>
        </div>
      );
    }
    if (registration?.status === "APPROVED" && registration.accountExists) {
      const credentialsMessage =
        registration.credentialsEmailSent === true
          ? "Your login credentials have been sent to your registered email."
          : "Your account has been created, but login credentials could not be delivered. Please contact the department.";
      return (
        <div className="mt-6 space-y-4 text-center text-sm text-(--color-text-secondary)">
          <p className="font-medium text-(--color-text-primary)">Your MYARCH account has been created.</p>
          <p>{credentialsMessage}</p>
          <Link href="/login" className="inline-flex w-full items-center justify-center rounded-md bg-(--color-accent) px-4 py-2 font-medium text-white hover:opacity-90">
            Go to Sign In
          </Link>
        </div>
      );
    }
    return (
      <div className="mt-6 space-y-4 text-center text-sm text-(--color-text-secondary)">
        <p className="font-medium text-(--color-text-primary)">Email verified successfully</p>
        <p>Your registration is now waiting for department approval.</p>
        <p>You will receive your MYARCH login credentials by email once your account is approved.</p>
      </div>
    );
  }

  return (
    <div className="mt-6">
      <p className={`text-center text-sm ${status === "error" ? "text-(--color-danger)" : "text-(--color-text-secondary)"}`}>
        {status === "resend"
          ? "Enter your email address to receive a new verification link."
          : message ?? "This verification link is invalid or has expired."}
      </p>

      {resendStatus === "sent" ? (
        <p className="mt-4 text-center text-sm text-(--color-text-secondary)">{resendMessage}</p>
      ) : (
        <form onSubmit={handleResend} className="mt-6 space-y-3">
          <div>
            <Label htmlFor="resend-email">Resend the verification email</Label>
            <Input
              id="resend-email"
              type="email"
              required
              placeholder="you@example.com"
              value={resendEmail}
              onChange={(e) => setResendEmail(e.target.value)}
            />
          </div>
          <FieldError>
            {resendStatus === "error" || resendStatus === "rate-limited" ? (resendMessage ?? undefined) : undefined}
          </FieldError>
          <Button type="submit" variant="secondary" className="w-full" disabled={resendStatus === "loading"}>
            {resendStatus === "loading" ? "Sending…" : "Resend verification email"}
          </Button>
        </form>
      )}
    </div>
  );
}
