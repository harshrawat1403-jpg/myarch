"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  CheckCircle2,
  Clock,
  ClipboardCheck,
  Download,
  History,
  Layers,
  UserCheck,
  Users,
  type LucideIcon,
} from "lucide-react";
import { useAuth } from "@/modules/auth/client";
import { apiClient, ApiError } from "@/lib/api-client";
import { formatAuditAction } from "@/lib/format-audit-action";
import { DashboardPanel } from "@/components/dashboard-panel";
import { EmptyState } from "@/components/empty-state";
import { StatPanel } from "@/components/ui/stat-panel";
import { Badge, type BadgeVariant } from "@/components/ui/badge";
import { CardTitle } from "@/components/ui/typography";
import type { Batch, BatchStatus } from "@/modules/batches";
import type { ApprovalQueueItem } from "@/modules/profiles";
import type { StudentSearchResultItem } from "@/modules/students";
import type { AuditLogEntry } from "@/lib/audit";

interface OverviewData {
  totalStudents: number;
  activeStudents: number;
  batches: Batch[];
  approvalQueue: ApprovalQueueItem[];
  recentActivity: AuditLogEntry[];
}

function batchStatusBadgeVariant(status: BatchStatus): BadgeVariant {
  if (status === "ACTIVE") return "active";
  if (status === "ARCHIVED") return "archived";
  return "neutral";
}

const QUICK_ACTIONS: { label: string; href: string; icon: LucideIcon }[] = [
  { label: "Review Approvals", href: "/dashboard/approvals", icon: ClipboardCheck },
  { label: "Manage Batches", href: "/dashboard/batches", icon: Layers },
  { label: "View Students", href: "/dashboard/students", icon: Users },
  { label: "View Audit Log", href: "/dashboard/audit", icon: History },
];

/**
 * The dashboard overview — Version 2.0's benchmark for the authenticated
 * portal, same role Home plays for the public site. Same data sources as
 * before, no new backend surface, no invented analytics or graphs — the
 * change is entirely presentational: `StatPanel` moves to `compact` mode
 * with an icon (the four-field `TitleBlock` stamp was overkill for a
 * number meant to be scanned, not read), `DashboardPanel` gains a small
 * icon per section, list rows get a subtle hover state and avatar-initial
 * circles instead of plain text, and every empty state gets the
 * `EmptyState` treatment instead of a bare sentence. Quick Actions reuse
 * the exact same icon-to-destination mapping as the sidebar nav
 * (`(admin)/layout.tsx`'s `NAV_ITEMS`), reinforcing wayfinding rather than
 * inventing a second icon language for the same four destinations.
 */
export default function DashboardOverviewPage() {
  const { accessToken, role } = useAuth();
  const [data, setData] = useState<OverviewData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!accessToken) return;
    let cancelled = false;

    (async () => {
      try {
        const [students, batches, approvalQueue, recentActivity] = await Promise.all([
          apiClient.get<StudentSearchResultItem[]>("/api/students?includeInactive=true", accessToken),
          apiClient.get<Batch[]>("/api/batches", accessToken),
          apiClient.get<ApprovalQueueItem[]>("/api/profiles/approval-queue", accessToken),
          apiClient.get<AuditLogEntry[]>("/api/audit/recent", accessToken),
        ]);

        if (cancelled) return;
        setData({
          totalStudents: students.length,
          activeStudents: students.filter((s) => s.isActive).length,
          batches,
          approvalQueue,
          recentActivity,
        });
      } catch (err) {
        if (!cancelled) setError(err instanceof ApiError ? err.message : "Unable to load dashboard statistics.");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [accessToken]);

  const activeBatchCount = data?.batches.filter((batch) => batch.status === "ACTIVE").length ?? 0;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold text-(--color-text-primary)">Dashboard</h1>
        <p className="mt-1 text-sm text-(--color-text-secondary)">
          {role === "SECRETARY"
            ? "Pending work and recent activity across the department."
            : "Pending work and recent activity across your assigned batches."}
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
      {isLoading && <p className="text-sm text-(--color-text-secondary)">Loading dashboard…</p>}

      {data && (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatPanel compact icon={Users} label="Total Students" value={data.totalStudents} scope="All batches" />
            <StatPanel compact icon={UserCheck} label="Active Students" value={data.activeStudents} scope="Currently enrolled" />
            <StatPanel compact icon={ClipboardCheck} label="Pending Approvals" value={data.approvalQueue.length} scope="Awaiting review" />
            <StatPanel
              compact
              icon={Layers}
              label="Active Batches"
              value={activeBatchCount}
              scope={`Of ${data.batches.length} total`}
            />
          </div>

          <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
            <DashboardPanel title="Pending Approvals" icon={ClipboardCheck} action={{ label: "View All", href: "/dashboard/approvals" }}>
              {data.approvalQueue.length === 0 ? (
                <EmptyState icon={CheckCircle2} message="No submissions waiting for review." />
              ) : (
                <ul className="space-y-1">
                  {data.approvalQueue.slice(0, 5).map((item) => (
                    <li
                      key={item.draftId}
                      className="-mx-2 flex items-center justify-between gap-3 rounded-lg px-2 py-2 text-sm transition-colors duration-150 hover:bg-(--color-surface-muted)"
                    >
                      <span className="flex min-w-0 items-center gap-3">
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-(--color-accent-soft) text-xs font-semibold text-(--color-accent)">
                          {item.studentFullName.charAt(0).toUpperCase()}
                        </span>
                        <span className="truncate text-(--color-text-primary)">{item.studentFullName}</span>
                      </span>
                      <Link
                        href={`/dashboard/approvals/${item.studentProfileId}`}
                        className="shrink-0 font-medium text-(--color-accent) hover:underline"
                      >
                        Review
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </DashboardPanel>

            <DashboardPanel title="Recent Activity" icon={History} action={{ label: "View All", href: "/dashboard/audit" }}>
              {data.recentActivity.length === 0 ? (
                <EmptyState icon={Clock} message="No recent activity." />
              ) : (
                <ul className="space-y-1">
                  {data.recentActivity.slice(0, 5).map((entry) => (
                    <li key={entry.id} className="-mx-2 rounded-lg px-2 py-2 transition-colors duration-150 hover:bg-(--color-surface-muted)">
                      <p className="text-sm text-(--color-text-primary)">{formatAuditAction(entry.action)}</p>
                      <p className="mt-0.5 text-xs text-(--color-text-secondary)">
                        {entry.targetEntityType} · {new Date(entry.occurredAt).toISOString().slice(0, 10)}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </DashboardPanel>
          </div>

          <DashboardPanel title="Batch Overview" icon={Layers} action={{ label: "View All", href: "/dashboard/batches" }}>
            {data.batches.length === 0 ? (
              <EmptyState icon={Layers} message="No batches yet." />
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {data.batches.map((batch) => (
                  <div key={batch.id} className="rounded-xl border border-(--color-border) p-4">
                    <div className="flex items-center justify-between gap-2">
                      <CardTitle className="text-sm">{batch.name}</CardTitle>
                      <Badge variant={batchStatusBadgeVariant(batch.status)}>{batch.status}</Badge>
                    </div>
                    <p className="mt-1.5 text-xs text-(--color-text-secondary)">Year {batch.year}</p>
                  </div>
                ))}
              </div>
            )}
          </DashboardPanel>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <DashboardPanel title="Export Shortcuts" icon={Download} action={{ label: "Open Exports", href: "/dashboard/exports" }}>
              <ul className="space-y-2 text-sm text-(--color-text-secondary)">
                <li>Student Directory</li>
                <li>Batch Report</li>
                <li>Public Placement Dataset</li>
                {role === "SECRETARY" && <li>Recruiter Directory</li>}
              </ul>
            </DashboardPanel>

            <DashboardPanel title="Recruiter Activity" icon={Users}>
              <p className="text-sm text-(--color-text-secondary)">
                Recruiter-side activity isn&rsquo;t surfaced in this dashboard yet.
                {role === "SECRETARY" && (
                  <>
                    {" "}
                    See the{" "}
                    <Link href="/dashboard/exports" className="text-(--color-accent) hover:underline">
                      Recruiter Directory export
                    </Link>{" "}
                    for the current recruiter list.
                  </>
                )}
              </p>
            </DashboardPanel>
          </div>
        </>
      )}
    </div>
  );
}
