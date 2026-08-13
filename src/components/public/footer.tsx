import Link from "next/link";
import { DataLabel } from "@/components/ui/typography";
import { Logo } from "@/components/logo";
import { DEPARTMENT_EMAIL } from "@/lib/public-content";
import { PageContainer } from "./page-container";

const QUICK_LINKS = [
  { href: "/about", label: "About" },
  { href: "/placements", label: "Placements" },
  { href: "/students", label: "Students" },
  { href: "/recruiters", label: "Recruiters" },
  { href: "/contact", label: "Contact" },
] as const;

// No real accounts exist yet — rendered as plain, non-interactive text
// (not dead `href="#"` links, which a screen reader announces as
// functional and a sighted user can click for no result) until an actual
// account exists to link to.
const SOCIAL_PLACEHOLDERS = ["Twitter / X", "Instagram", "LinkedIn"] as const;

// Same reasoning — no Privacy Policy / Terms of Use page exists yet.
const POLICY_PLACEHOLDERS = ["Privacy Policy", "Terms of Use"] as const;

/**
 * The public site's shared footer (docs/design/V1_UI_SPECIFICATION.md Part
 * D.1's spec, expanded per this milestone's task to include social and
 * policy-link placeholders). Contact details below are illustrative
 * placeholder copy, not confirmed department-provided content — per the
 * approved spec's Open Questions, public-site copy is a content-side
 * deliverable, not something to author as final here.
 */
export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-(--color-text-secondary)/20 bg-(--color-surface)">
      <PageContainer className="py-12">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <Logo variant="full" size="xs" />
            <p className="mt-3 text-sm text-(--color-text-secondary)">
              The digital portal for the Department of Architecture &amp; Planning, Visvesvaraya
              National Institute of Technology, Nagpur.
            </p>
          </div>

          <div>
            <DataLabel>Quick Links</DataLabel>
            <ul className="mt-2 space-y-1">
              {QUICK_LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-(--color-text-secondary) hover:text-(--color-text-primary)"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <DataLabel>Contact</DataLabel>
            <p className="mt-2 text-sm text-(--color-text-secondary)">
              Department of Architecture &amp; Planning
              <br />
              VNIT Nagpur
            </p>
            <a
              href={`mailto:${DEPARTMENT_EMAIL}`}
              className="mt-1 inline-block text-sm text-(--color-accent) hover:underline"
            >
              {DEPARTMENT_EMAIL}
            </a>
          </div>

          <div>
            <DataLabel>Connect</DataLabel>
            <ul className="mt-2 space-y-1">
              {SOCIAL_PLACEHOLDERS.map((label) => (
                <li
                  key={label}
                  className="text-sm text-(--color-text-secondary)/60"
                  title="Not yet available"
                >
                  {label} <span className="text-xs">(coming soon)</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-8 flex flex-col gap-3 border-t border-(--color-text-secondary)/10 pt-6 font-[family-name:var(--font-data)] text-xs text-(--color-text-secondary) sm:flex-row sm:items-center sm:justify-between">
          <p className="flex items-center gap-2">
            <Logo variant="mark" size="xs" className="h-4 w-4" />© {year} MYARCH — Department of
            Architecture &amp; Planning, VNIT Nagpur.
          </p>
          <div className="flex gap-4">
            {POLICY_PLACEHOLDERS.map((label) => (
              <span
                key={label}
                className="text-(--color-text-secondary)/60"
                title="Not yet available"
              >
                {label} <span>(coming soon)</span>
              </span>
            ))}
          </div>
        </div>
      </PageContainer>
    </footer>
  );
}
