import { Sparkles } from "lucide-react";
import { EmptyState } from "@/components/empty-state";

/**
 * MYARCH Phase 1 (§0.12/§24 — "no fake features") — the Alumni Portal has no
 * built functionality yet beyond account signup/approval; this honestly
 * says so rather than shipping a dashboard of placeholder widgets.
 */
export default function AlumniHomePage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold text-(--color-text-primary)">
          Welcome
        </h1>
        <p className="mt-1 text-sm text-(--color-text-secondary)">Your MYARCH Alumni account is active.</p>
      </div>

      <EmptyState
        icon={Sparkles}
        message="The Alumni Portal is coming soon. We're building mentorship, directory, and event features for alumni — check back here once they launch."
      />
    </div>
  );
}
