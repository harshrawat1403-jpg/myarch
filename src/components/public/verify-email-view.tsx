"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label, FieldError } from "@/components/ui/input";

type Status = "verifying" | "success" | "error";
type ResendStatus = "idle" | "loading" | "sent" | "rate-limited" | "error";

/** MYARCH Phase 1 (§2.4) — public, unauthenticated. Auto-submits the ?token= from the emailed verification link on mount. */
export function VerifyEmailView() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [status, setStatus] = useState<Status>(token ? "verifying" : "error");
  const [message, setMessage] = useState<string | null>(null);

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
    return (
      <p className="mt-6 text-center text-sm text-(--color-text-secondary)">
        Your email has been verified. You can now{" "}
        <Link href="/login" className="font-medium text-(--color-accent) hover:underline">
          sign in
        </Link>
        .
      </p>
    );
  }

  return (
    <div className="mt-6">
      <p className="text-center text-sm text-(--color-danger)">
        {message ?? "This verification link is invalid or incomplete."}
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
