"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";

type Status = "verifying" | "success" | "error";

/** MYARCH Phase 1 (§2.4) — public, unauthenticated. Auto-submits the ?token= from the emailed verification link on mount. */
export function VerifyEmailView() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [status, setStatus] = useState<Status>(token ? "verifying" : "error");
  const [message, setMessage] = useState<string | null>(null);

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
    <p className="mt-6 text-center text-sm text-(--color-danger)">
      {message ?? "This verification link is invalid or incomplete."}
    </p>
  );
}
