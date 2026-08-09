"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  AlertCircle,
  BarChart3,
  Briefcase,
  Calendar,
  CheckCircle2,
  Clock,
  Mail,
  Send,
  Target,
  TrendingUp,
  UserCircle,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import { useAuth } from "@/modules/auth/client";
import { apiClient, ApiError } from "@/lib/api-client";
import type { ProfileDraft, PublishedProfile } from "@/modules/profiles";
import type { StudentApplicationDTO, StudentDriveDTO } from "@/modules/placements";
import type { StudentInterestDTO } from "@/modules/recruiters";
import { DashboardPanel } from "@/components/dashboard-panel";
import { EmptyState } from "@/components/empty-state";
import { StatPanel } from "@/components/ui/stat-panel";
import { Badge, type BadgeVariant } from "@/components/ui/badge";
import { ChipList } from "@/components/ui/chip";
import { DataLabel } from "@/components/ui/typography";

interface OverviewData {
  draft: ProfileDraft | null;
  published: PublishedProfile | null;
  applications: StudentApplicationDTO[];
  openDrives: StudentDriveDTO[];
  interests: StudentInterestDTO[];
}

interface ActivityItem {
  date: Date;
  icon: LucideIcon;
  label: string;
}

const OFFER_OR_BETTER: readonly StudentApplicationDTO["currentStatus"][] = ["OFFER", "ACCEPTED", "ACTIVE", "COMPLETED"];
const ONGOING_INTERNSHIP_STATUSES: readonly StudentApplicationDTO["currentStatus"][] = ["ACTIVE", "COMPLETED"];

function applicationStatusBadgeVariant(status: StudentApplicationDTO["currentStatus"]): BadgeVariant {
  switch (status) {
    case "APPLIED":
    case "SHORTLISTED":
    case "INTERVIEW":
      return "pending";
    case "OFFER":
    case "ACCEPTED":
    case "ACTIVE":
    case "COMPLETED":
      return "approved";
    case "REJECTED":
    case "WITHDRAWN":
      return "rejected";
  }
}

function interestStatusBadgeVariant(status: StudentInterestDTO["status"]): BadgeVariant {
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

function profileStatusBadgeVariant(status: ProfileDraft["status"]): BadgeVariant {
  if (status === "APPROVED") return "approved";
  if (status === "CHANGES_REQUESTED") return "rejected";
  if (status === "PENDING_REVIEW") return "pending";
  return "neutral";
}

function profileStatusLabel(status: ProfileDraft["status"] | undefined): string {
  switch (status) {
    case undefined:
      return "Not Started";
    case "DRAFT":
      return "Draft";
    case "PENDING_REVIEW":
      return "Pending Review";
    case "APPROVED":
      return "Approved";
    case "CHANGES_REQUESTED":
      return "Changes Requested";
  }
}

/** Same 4-field metric `/student/profile` already uses — read-only here, not a second definition of what "complete" means. */
function computeProfileCompletion(content: { bio: string | null; skills: readonly string[]; software: readonly string[]; portfolioLinks: readonly string[] } | null) {
  const checks = [
    Boolean(content?.bio?.trim()),
    (content?.skills.length ?? 0) > 0,
    (content?.software.length ?? 0) > 0,
    (content?.portfolioLinks.length ?? 0) > 0,
  ];
  const completed = checks.filter(Boolean).length;
  return { completed, total: checks.length, percent: Math.round((completed / checks.length) * 100) };
}

/**
 * There is no persisted in-app notification/activity feed anywhere in the
 * codebase (`src/modules/notifications` only ever dispatches outbound
 * email — see its own doc comments) — so "recent activity" is synthesized
 * here from real, already-fetched records (application/interview/interest/
 * profile-review timestamps) rather than fabricated or backed by a new
 * backend surface. Every entry traces back to a real row already visible
 * elsewhere on this page or on /student/applications, /student/interests,
 * /student/profile.
 */
function buildActivityFeed(data: OverviewData): ActivityItem[] {
  const items: ActivityItem[] = [];

  for (const application of data.applications) {
    items.push({ date: new Date(application.appliedAt), icon: Briefcase, label: `Applied to ${application.companyName} — ${application.title}` });
    if (application.interviewScheduledAt) {
      items.push({
        date: new Date(application.interviewScheduledAt),
        icon: Calendar,
        label: `Interview scheduled with ${application.companyName}`,
      });
    }
  }

  for (const interest of data.interests) {
    items.push({ date: new Date(interest.sentAt), icon: Mail, label: `${interest.companyName} expressed interest in your profile` });
    if (interest.respondedAt && interest.status === "ACCEPTED") {
      items.push({ date: new Date(interest.respondedAt), icon: CheckCircle2, label: `You accepted ${interest.companyName}'s interest` });
    } else if (interest.respondedAt && interest.status === "DECLINED") {
      items.push({ date: new Date(interest.respondedAt), icon: XCircle, label: `You declined ${interest.companyName}'s interest` });
    }
  }

  if (data.draft?.submittedAt) {
    items.push({ date: new Date(data.draft.submittedAt), icon: Send, label: "Submitted your profile for review" });
  }
  if (data.draft?.reviewedAt && data.draft.status === "APPROVED") {
    items.push({ date: new Date(data.draft.reviewedAt), icon: CheckCircle2, label: "Your profile was approved and published" });
  } else if (data.draft?.reviewedAt && data.draft.status === "CHANGES_REQUESTED") {
    items.push({ date: new Date(data.draft.reviewedAt), icon: AlertCircle, label: "A reviewer requested changes to your profile" });
  }

  return items.sort((a, b) => b.date.getTime() - a.date.getTime()).slice(0, 6);
}

const QUICK_ACTIONS: { label: string; href: string; icon: LucideIcon }[] = [
  { label: "Browse Open Drives", href: "/student/applications", icon: Briefcase },
  { label: "My Profile", href: "/student/profile", icon: UserCircle },
  { label: "My Interests", href: "/student/interests", icon: Mail },
  { label: "My Reports", href: "/student/reports", icon: BarChart3 },
];

/**
 * V4.0 D6 (§2 IA — "student logs in... lands on /student (career hub)") —
 * the new landing page, pulling together every career-relevant surface
 * D1-D5 already built: profile completion/status, the published public
 * profile's skills/software/portfolio/internships, open placement
 * opportunities, applications and their statuses, upcoming interviews,
 * recruiter interest, and an activity feed synthesized from those same
 * records. Every number and row here is sourced from existing read APIs —
 * no new backend surface, no fabricated metrics. Mutating actions
 * (apply/withdraw, accept/decline interest, edit profile) are deliberately
 * NOT duplicated here; this page is a summary that deep-links to the one
 * page that owns each action, exactly like DashboardOverviewPage does for
 * Secretary/Coordinator ("Review", "View All" links rather than inline
 * mutation forms).
 */
export default function StudentDashboardPage() {
  const { accessToken, studentProfileId } = useAuth();
  const [data, setData] = useState<OverviewData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!accessToken || !studentProfileId) return;
    let cancelled = false;

    async function loadOptional<T>(url: string): Promise<T | null> {
      try {
        return await apiClient.get<T>(url, accessToken!);
      } catch (err) {
        if (err instanceof ApiError && err.status === 404) return null;
        throw err;
      }
    }

    (async () => {
      try {
        const [applications, openDrives, interests, draft, published] = await Promise.all([
          apiClient.get<StudentApplicationDTO[]>("/api/student/applications", accessToken),
          apiClient.get<StudentDriveDTO[]>("/api/student/drives", accessToken),
          apiClient.get<StudentInterestDTO[]>("/api/student/interests", accessToken),
          loadOptional<ProfileDraft>(`/api/students/${studentProfileId}/profile/draft`),
          loadOptional<PublishedProfile>(`/api/students/${studentProfileId}/profile/published`),
        ]);

        if (cancelled) return;
        setData({ draft, published, applications, openDrives, interests });
      } catch (err) {
        if (!cancelled) setError(err instanceof ApiError ? err.message : "Unable to load your dashboard.");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [accessToken, studentProfileId]);

  const offerCount = data?.applications.filter((a) => OFFER_OR_BETTER.includes(a.currentStatus)).length ?? 0;
  const upcomingInterviews = (data?.applications ?? [])
    .filter((a) => a.interviewScheduledAt !== null)
    .sort((a, b) => new Date(a.interviewScheduledAt!).getTime() - new Date(b.interviewScheduledAt!).getTime());
  const awaitingInterestCount = data?.interests.filter((i) => i.status === "SENT").length ?? 0;
  const recentApplications = [...(data?.applications ?? [])].sort(
    (a, b) => new Date(b.appliedAt).getTime() - new Date(a.appliedAt).getTime(),
  );
  const openOpportunities = (data?.openDrives ?? []).filter((d) => !d.hasApplied);
  const recentInterests = [...(data?.interests ?? [])].sort((a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime());
  const ongoingInternship = data?.applications.find((a) => a.type === "INTERNSHIP" && ONGOING_INTERNSHIP_STATUSES.includes(a.currentStatus));
  const completion = computeProfileCompletion(data?.draft ?? null);
  const activity = data ? buildActivityFeed(data) : [];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold text-(--color-text-primary)">
          Career Hub
        </h1>
        <p className="mt-1 text-sm text-(--color-text-secondary)">
          Your applications, interviews, offers, and profile, all in one place.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
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
      {isLoading && <p className="text-sm text-(--color-text-secondary)">Loading your dashboard…</p>}

      {data && (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatPanel compact icon={Briefcase} label="Applications" value={data.applications.length} scope="All time" />
            <StatPanel compact icon={Calendar} label="Interviews" value={upcomingInterviews.length} scope="Scheduled" />
            <StatPanel compact icon={TrendingUp} label="Offers" value={offerCount} scope="Offer or better" />
            <StatPanel compact icon={Mail} label="Interests" value={awaitingInterestCount} scope="Awaiting your response" />
          </div>

          {ongoingInternship && (
            <Link
              href="/student/applications"
              className="flex items-center gap-3 rounded-lg border border-(--color-accent)/30 bg-(--color-accent-soft) p-4 transition-colors duration-150 hover:border-(--color-accent)"
            >
              <Briefcase aria-hidden="true" size={18} strokeWidth={1.75} className="shrink-0 text-(--color-accent)" />
              <p className="text-sm text-(--color-text-primary)">
                {ongoingInternship.currentStatus === "ACTIVE" ? "Ongoing internship" : "Completed internship"} at{" "}
                <span className="font-medium">{ongoingInternship.companyName}</span> — view feedback and your certificate.
              </p>
            </Link>
          )}

          <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
            <DashboardPanel title="Profile Snapshot" icon={UserCircle} action={{ label: "Edit Profile", href: "/student/profile" }}>
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <Badge variant={profileStatusBadgeVariant(data.draft?.status ?? "DRAFT")}>{profileStatusLabel(data.draft?.status)}</Badge>
                    {data.published && (
                      <span className="text-xs text-(--color-text-secondary)">
                        {data.published.isPubliclyDiscoverable ? "Visible to recruiters" : "Published, not publicly listed"}
                      </span>
                    )}
                  </div>
                  {data.published?.isPubliclyDiscoverable && (
                    <Link href={`/directory/${studentProfileId}`} className="shrink-0 text-xs font-medium text-(--color-accent) hover:underline">
                      View Public Profile
                    </Link>
                  )}
                </div>

                <div>
                  <div className="flex items-center justify-between gap-4">
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-(--color-surface-muted)">
                      <div className="h-full rounded-full bg-(--color-accent) transition-all duration-200" style={{ width: `${completion.percent}%` }} />
                    </div>
                    <span className="shrink-0 text-xs font-medium text-(--color-text-secondary)">
                      {completion.completed} of {completion.total}
                    </span>
                  </div>
                </div>

                <div>
                  <DataLabel>Skills</DataLabel>
                  <div className="mt-1.5">
                    <ChipList items={data.draft?.skills ?? []} emptyLabel="No skills added yet." />
                  </div>
                </div>

                <div>
                  <DataLabel>Software</DataLabel>
                  <div className="mt-1.5">
                    <ChipList items={data.draft?.software ?? []} emptyLabel="No software added yet." />
                  </div>
                </div>

                <div className="flex items-center justify-between gap-4 border-t border-(--color-border) pt-3 text-xs text-(--color-text-secondary)">
                  <span>{data.draft?.portfolioLinks.length ?? 0} portfolio link{data.draft?.portfolioLinks.length === 1 ? "" : "s"}</span>
                  <span>{data.draft?.internships.length ?? 0} internship{data.draft?.internships.length === 1 ? "" : "s"} listed</span>
                </div>
              </div>
            </DashboardPanel>

            <DashboardPanel title="Placement Opportunities" icon={Target} action={{ label: "View All", href: "/student/applications" }}>
              {openOpportunities.length === 0 ? (
                <EmptyState icon={Target} message="No new open drives right now — check back soon." />
              ) : (
                <ul className="space-y-1">
                  {openOpportunities.slice(0, 5).map((drive) => (
                    <li
                      key={drive.driveId}
                      className="-mx-2 flex items-center justify-between gap-3 rounded-lg px-2 py-2 text-sm transition-colors duration-150 hover:bg-(--color-surface-muted)"
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-(--color-text-primary)">{drive.companyName}</span>
                        <span className="block text-xs text-(--color-text-secondary)">{drive.title}</span>
                      </span>
                      <Badge variant="neutral">{drive.type === "INTERNSHIP" ? "Internship" : "Placement"}</Badge>
                    </li>
                  ))}
                </ul>
              )}
            </DashboardPanel>
          </div>

          <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
            <DashboardPanel title="My Applications" icon={Briefcase} action={{ label: "View All", href: "/student/applications" }}>
              {recentApplications.length === 0 ? (
                <EmptyState icon={Briefcase} message="You haven't applied to any drives yet." />
              ) : (
                <ul className="space-y-1">
                  {recentApplications.slice(0, 5).map((application) => (
                    <li
                      key={application.applicationId}
                      className="-mx-2 flex items-center justify-between gap-3 rounded-lg px-2 py-2 text-sm transition-colors duration-150 hover:bg-(--color-surface-muted)"
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-(--color-text-primary)">{application.companyName}</span>
                        <span className="block text-xs text-(--color-text-secondary)">{application.title}</span>
                      </span>
                      <Badge variant={applicationStatusBadgeVariant(application.currentStatus)}>{application.currentStatus}</Badge>
                    </li>
                  ))}
                </ul>
              )}
            </DashboardPanel>

            <DashboardPanel title="Upcoming Interviews" icon={Calendar} action={{ label: "View All", href: "/student/applications" }}>
              {upcomingInterviews.length === 0 ? (
                <EmptyState icon={Calendar} message="No interviews scheduled yet." />
              ) : (
                <ul className="space-y-1">
                  {upcomingInterviews.slice(0, 5).map((application) => (
                    <li
                      key={application.applicationId}
                      className="-mx-2 flex items-center justify-between gap-3 rounded-lg px-2 py-2 text-sm transition-colors duration-150 hover:bg-(--color-surface-muted)"
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-(--color-text-primary)">{application.companyName}</span>
                        <span className="block text-xs text-(--color-text-secondary)">
                          {new Date(application.interviewScheduledAt!).toISOString().slice(0, 10)}
                          {application.interviewMode ? ` · ${application.interviewMode}` : ""}
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </DashboardPanel>
          </div>

          <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
            <DashboardPanel title="Recruiter Interest" icon={Mail} action={{ label: "View All", href: "/student/interests" }}>
              {recentInterests.length === 0 ? (
                <EmptyState icon={Mail} message="No recruiters have expressed interest yet." />
              ) : (
                <ul className="space-y-1">
                  {recentInterests.slice(0, 5).map((interest) => (
                    <li
                      key={interest.id}
                      className="-mx-2 flex items-center justify-between gap-3 rounded-lg px-2 py-2 text-sm transition-colors duration-150 hover:bg-(--color-surface-muted)"
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-(--color-text-primary)">{interest.companyName}</span>
                        <span className="block text-xs text-(--color-text-secondary)">{new Date(interest.sentAt).toISOString().slice(0, 10)}</span>
                      </span>
                      <Badge variant={interestStatusBadgeVariant(interest.status)}>
                        {interest.status === "SENT" ? "Awaiting response" : interest.status}
                      </Badge>
                    </li>
                  ))}
                </ul>
              )}
            </DashboardPanel>

            <DashboardPanel title="Recent Activity" icon={Clock}>
              {activity.length === 0 ? (
                <EmptyState icon={Clock} message="Nothing yet — activity shows up here as things happen." />
              ) : (
                <ul className="space-y-1">
                  {activity.map((item, index) => (
                    <li key={index} className="-mx-2 flex items-start gap-3 rounded-lg px-2 py-2 text-sm">
                      <item.icon aria-hidden="true" size={15} strokeWidth={1.75} className="mt-0.5 shrink-0 text-(--color-text-secondary)" />
                      <span className="min-w-0">
                        <span className="block text-(--color-text-primary)">{item.label}</span>
                        <span className="block text-xs text-(--color-text-secondary)">{item.date.toISOString().slice(0, 10)}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </DashboardPanel>
          </div>
        </>
      )}
    </div>
  );
}
