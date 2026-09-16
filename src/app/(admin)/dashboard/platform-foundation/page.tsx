/**
 * Deliberately unlinked Phase 1 verification surface. It lives behind the
 * existing admin layout at /dashboard/platform-foundation and must not be
 * promoted into production navigation until the replacement workflows ship.
 */
export default function PlatformFoundationPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <p className="text-sm font-medium text-(--color-text-secondary)">Internal verification</p>
        <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold text-(--color-text-primary)">
          Simplified TNP + Alumni Foundation
        </h1>
        <p className="mt-2 text-sm text-(--color-text-secondary)">
          Phase 1 is an isolated server-side foundation. It does not replace any legacy MYARCH workflow or navigation.
        </p>
      </div>
      <div className="rounded-xl border border-(--color-border) bg-(--color-surface) p-5 text-sm text-(--color-text-secondary)">
        <p className="font-medium text-(--color-text-primary)">Available internal API roots</p>
        <ul className="mt-3 list-disc space-y-1 pl-5">
          <li>/api/platform/talent</li>
          <li>/api/platform/recruitment</li>
          <li>/api/platform/alumni</li>
        </ul>
      </div>
    </div>
  );
}
