import { Suspense } from "react";
import { Logo } from "@/components/logo";
import { VerifyEmailView } from "@/components/public/verify-email-view";

export default function VerifyEmailPage() {
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
          Email verification
        </h1>

        <Suspense fallback={<p className="mt-6 text-center text-sm text-(--color-text-secondary)">Loading…</p>}>
          <VerifyEmailView />
        </Suspense>
      </div>
    </main>
  );
}
