"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { BarChart3, Bookmark, CheckCircle2, Clock, Mail, Search, Star, Users, type LucideIcon } from "lucide-react";
import { useAuth } from "@/modules/auth/client";
import { apiClient, ApiError } from "@/lib/api-client";
import type { RecruiterOverviewStats, RecruiterSentInterestDTO, RecruiterStudentProfileDTO } from "@/modules/recruiters";
import { DashboardPanel } from "@/components/dashboard-panel";
import { EmptyState } from "@/components/empty-state";
import { StatPanel } from "@/components/ui/stat-panel";
import { Badge, type BadgeVariant } from "@/components/ui/badge";

const QUICK_ACTIONS: { label: string; href: string; icon: LucideIcon }[] = [
  { label: "Browse Directory", href: "/recruiter/directory", icon: Search },
  { label: "Saved Students", href: "/recruiter/saved", icon: Bookmark },
  { label: "Sent Interests", href: "/recruiter/interests", icon: Mail },
  { label: "My Reports", href: "/recruiter/reports", icon: BarChart3 },
];

function interestStatusBadgeVariant(status: RecruiterSentInterestDTO["status"]): BadgeVariant {
  switch (status) {
    case "SENT":
      return "pending";
    case "ACCEPTED":
    case "COMPLETED":
      return "approved";
    case "DECLINED":
      return "rejected";
  }
}

/**
 * V4.0 C4 (Q2, PRD §2/§3/§17) — /recruiter is now the dashboard; the
 * search/filter card grid this page used to be lives at /recruiter/directory.
 * Consolidates C1–C3 data (saved/shortlisted/interests) into one landing
 * view — no drives overview yet, since PlacementDrive doesn't exist until
 * Phase D.
 */
export default function RecruiterDashboardPage() {
  const { accessToken } = useAuth();
  const [overview, setOverview] = useState<RecruiterOverviewStats | null>(null);
  const [recentSaved, setRecentSaved] = useState<RecruiterStudentProfileDTO[]>([]);
  const [recentInterests, setRecentInterests] = useState<RecruiterSentInterestDTO[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!accessToken) return;
    let cancelled = false;

    (async () => {
      try {
        const [overviewStats, saved, interests] = await Promise.all([
          apiClient.get<RecruiterOverviewStats>("/api/recruiters/overview", accessToken),
          apiClient.get<RecruiterStudentProfileDTO[]>("/api/recruiters/saved", accessToken),
          apiClient.get<RecruiterSentInterestDTO[]>("/api/recruiters/interests", accessToken),
        ]);
        if (cancelled) return;
        setOverview(overviewStats);
        setRecentSaved(saved.slice(0, 5));
        setRecentInterests(interests.slice(0, 5));
      } catch (err) {
        if (!cancelled) setError(err instanceof ApiError ? err.message : "Unable to load your dashboard.");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [accessToken]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold text-(--color-text-primary)">
          Dashboard
        </h1>
        <p className="mt-1 text-sm text-(--color-text-secondary)">
          {overview?.companyName ? `${overview.companyName} — your saved students and sent interests.` : "Your saved students and sent interests, VNIT Nagpur."}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {QUICK_ACTIONS.map((action) => (
          <Link
            key={action.href}
            href={action.href}
            className="group flex items-center gap-3 rounded-2xl border border-(--color-border) bg-(--color-surface) p-4 shadow-sm transition-[border-color,box-shadow] duration-150 hover:border-(--color-accent) hover:shadow-md"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-(--color-accent-soft) text-(--color-accent)">
              <action.icon aria-hidden="true" size={17} strokeWidth={1.75} />
            </span>
            <span className="text-sm font-medium text-(--color-text-primary)">{action.label}</span>
          </Link>
        ))}
      </div>

      {error && <p className="text-sm text-(--color-danger)">{error}</p>}
      {isLoading && <p className="text-sm text-(--color-text-secondary)">Loading dashboard…</p>}

      {overview && (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatPanel compact icon={Bookmark} label="Saved" value={overview.savedCount} scope="Your saved students" />
            <StatPanel compact icon={Star} label="Shortlisted" value={overview.shortlistedCount} scope="Of your saved students" />
            <StatPanel compact icon={Mail} label="Interests Sent" value={overview.interestsSentCount} scope="All time" />
            <StatPanel compact icon={CheckCircle2} label="Interests Accepted" value={overview.interestsAcceptedCount} scope="All time" />
          </div>

          <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
            <DashboardPanel title="Recently Saved" icon={Bookmark} action={{ label: "View All", href: "/recruiter/saved" }}>
              {recentSaved.length === 0 ? (
                <EmptyState icon={Bookmark} message="You haven't saved any students yet." />
              ) : (
                <ul className="space-y-1">
                  {recentSaved.map((student) => (
                    <li
                      key={student.studentId}
                      className="-mx-2 flex items-center justify-between gap-3 rounded-lg px-2 py-2 text-sm transition-colors duration-150 hover:bg-(--color-surface-muted)"
                    >
                      <span className="flex min-w-0 items-center gap-3">
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-(--color-accent-soft) text-xs font-semibold text-(--color-accent)">
                          {student.fullName.charAt(0).toUpperCase()}
                        </span>
                        <span className="truncate text-(--color-text-primary)">{student.fullName}</span>
                      </span>
                      <Link
                        href={`/recruiter/students/${student.studentId}`}
                        className="shrink-0 font-medium text-(--color-accent) hover:underline"
                      >
                        View
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </DashboardPanel>

            <DashboardPanel title="Recent Interests" icon={Mail} action={{ label: "View All", href: "/recruiter/interests" }}>
              {recentInterests.length === 0 ? (
                <EmptyState icon={Clock} message="You haven't expressed interest in any students yet." />
              ) : (
                <ul className="space-y-1">
                  {recentInterests.map((interest) => (
                    <li
                      key={interest.id}
                      className="-mx-2 flex items-center justify-between gap-3 rounded-lg px-2 py-2 text-sm transition-colors duration-150 hover:bg-(--color-surface-muted)"
                    >
                      <span className="truncate text-(--color-text-primary)">{interest.studentName}</span>
                      <Badge variant={interestStatusBadgeVariant(interest.status)}>{interest.status}</Badge>
                    </li>
                  ))}
                </ul>
              )}
            </DashboardPanel>
          </div>

          <DashboardPanel title="Explore More Students" icon={Users} action={{ label: "Open Directory", href: "/recruiter/directory" }}>
            <p className="text-sm text-(--color-text-secondary)">
              Browse the full approved student directory to find and save new candidates.
            </p>
          </DashboardPanel>
        </>
      )}
    </div>
  );
}
