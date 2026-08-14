"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, Clock, ListChecks, Wrench, Zap } from "lucide-react";
import { useAuth } from "@/modules/auth/client";
import { apiClient, ApiError } from "@/lib/api-client";
import { Card } from "@/components/ui/card";
import { CardTitle } from "@/components/ui/typography";
import { StatPanel } from "@/components/ui/stat-panel";
import { EmptyState } from "@/components/empty-state";

interface DashboardStats {
  open: number;
  critical: number;
  overdue: number;
  assigned: number;
  inProgress: number;
  resolved: number;
  averageResponseTimeMs: number | null;
  averageResolutionTimeMs: number | null;
  byCategory: Record<string, number>;
  byLocation: Record<string, number>;
  recurringLocations: { location: string; count: number }[];
  escalatedCount: number;
  coordinatorWorkload: Record<string, number>;
}

function formatDuration(ms: number | null): string {
  if (ms === null) return "—";
  const hours = ms / (1000 * 60 * 60);
  if (hours < 24) return `${hours.toFixed(1)}h`;
  return `${(hours / 24).toFixed(1)}d`;
}

/** §3.9 — Maintenance Dashboard, staff-only (server-enforced by GetMaintenanceDashboardStatsUseCase). */
export default function MaintenanceDashboardPage() {
  const { accessToken } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!accessToken) return;
    let cancelled = false;
    (async () => {
      try {
        const result = await apiClient.get<DashboardStats>("/api/maintenance/dashboard", accessToken);
        if (!cancelled) setStats(result);
      } catch (err) {
        if (!cancelled) setError(err instanceof ApiError ? err.message : "Unable to load the dashboard.");
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
          Maintenance Dashboard
        </h1>
        <p className="mt-1 text-sm text-(--color-text-secondary)">Department-wide maintenance analytics.</p>
      </div>

      {error && <p className="text-sm text-(--color-danger)">{error}</p>}
      {isLoading && <p className="text-sm text-(--color-text-secondary)">Loading dashboard…</p>}

      {stats && (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatPanel compact icon={Wrench} label="Open" value={stats.open} scope="Not yet resolved" />
            <StatPanel compact icon={Zap} label="Critical" value={stats.critical} scope="Urgent priority, open" />
            <StatPanel compact icon={AlertTriangle} label="Overdue" value={stats.overdue} scope="Past deadline" />
            <StatPanel compact icon={ListChecks} label="Assigned" value={stats.assigned} scope="Awaiting start" />
            <StatPanel compact icon={Clock} label="In Progress" value={stats.inProgress} scope="Being worked on" />
            <StatPanel compact icon={CheckCircle2} label="Resolved" value={stats.resolved} scope="Resolved, verified, or closed" />
            <StatPanel compact icon={Clock} label="Avg. Response" value={formatDuration(stats.averageResponseTimeMs)} scope="Time to acknowledge" />
            <StatPanel compact icon={CheckCircle2} label="Avg. Resolution" value={formatDuration(stats.averageResolutionTimeMs)} scope="Time to resolve" />
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card>
              <CardTitle>By Category</CardTitle>
              {Object.keys(stats.byCategory).length === 0 ? (
                <EmptyState icon={Wrench} message="No issues reported yet." />
              ) : (
                <ul className="mt-3 space-y-1.5 text-sm">
                  {Object.entries(stats.byCategory)
                    .sort((a, b) => b[1] - a[1])
                    .map(([category, count]) => (
                      <li key={category} className="flex items-center justify-between">
                        <span className="text-(--color-text-secondary)">{category.replace("_", " ")}</span>
                        <span className="font-medium text-(--color-text-primary)">{count}</span>
                      </li>
                    ))}
                </ul>
              )}
            </Card>

            <Card>
              <CardTitle>Recurring Issues</CardTitle>
              {stats.recurringLocations.length === 0 ? (
                <EmptyState icon={AlertTriangle} message="No locations with 3+ reported issues." />
              ) : (
                <ul className="mt-3 space-y-1.5 text-sm">
                  {stats.recurringLocations.map((entry) => (
                    <li key={entry.location} className="flex items-center justify-between">
                      <span className="text-(--color-text-secondary)">{entry.location}</span>
                      <span className="font-medium text-(--color-text-primary)">{entry.count}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card>
              <CardTitle>Escalated</CardTitle>
              <p className="mt-3 text-2xl font-semibold text-(--color-danger)">{stats.escalatedCount}</p>
              <p className="mt-1 text-xs text-(--color-text-secondary)">Auto-escalated to the Technical Secretary via the Task Engine.</p>
            </Card>

            <Card>
              <CardTitle>Coordinator Workload</CardTitle>
              {Object.keys(stats.coordinatorWorkload).length === 0 ? (
                <EmptyState icon={ListChecks} message="No open issues currently assigned." />
              ) : (
                <ul className="mt-3 space-y-1.5 text-sm">
                  {Object.entries(stats.coordinatorWorkload)
                    .sort((a, b) => b[1] - a[1])
                    .map(([assigneeId, count]) => (
                      <li key={assigneeId} className="flex items-center justify-between">
                        <span className="text-(--color-text-secondary)">{assigneeId.slice(0, 8)}…</span>
                        <span className="font-medium text-(--color-text-primary)">{count} open</span>
                      </li>
                    ))}
                </ul>
              )}
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
