"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/modules/auth/client";
import { apiClient } from "@/lib/api-client";
import { TitleBlock } from "@/components/title-block";
import type { Batch } from "@/modules/batches";
import type { ApprovalQueueItem } from "@/modules/profiles";
import type { StudentSearchResultItem } from "@/modules/students";

interface OverviewStats {
  totalStudents: number;
  activeStudents: number;
  pendingApprovals: number;
  batches: Batch[];
}

function StatCard({ project, scale, value }: { project: string; scale: string; value: number | string }) {
  return (
    <div className="rounded-lg border border-[--color-text-secondary]/20 bg-[--color-surface] p-5">
      <p className="font-[family-name:var(--font-data)] text-3xl text-[--color-text-primary]">{value}</p>
      <TitleBlock project={project} scale={scale} date={new Date()} drawnBy="System" />
    </div>
  );
}

export default function DashboardOverviewPage() {
  const { accessToken } = useAuth();
  const [stats, setStats] = useState<OverviewStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!accessToken) return;
    let cancelled = false;

    (async () => {
      try {
        const [students, batches, queue] = await Promise.all([
          apiClient.get<StudentSearchResultItem[]>("/api/students?includeInactive=true", accessToken),
          apiClient.get<Batch[]>("/api/batches", accessToken),
          apiClient.get<ApprovalQueueItem[]>("/api/profiles/approval-queue", accessToken),
        ]);

        if (cancelled) return;
        setStats({
          totalStudents: students.length,
          activeStudents: students.filter((s) => s.isActive).length,
          pendingApprovals: queue.length,
          batches,
        });
      } catch {
        if (!cancelled) setError("Unable to load dashboard statistics.");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [accessToken]);

  return (
    <div className="space-y-8">
      <h1 className="font-[family-name:var(--font-display)] text-2xl text-[--color-text-primary]">
        Dashboard Overview
      </h1>

      {error && <p className="text-sm text-red-400">{error}</p>}

      {stats && (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatCard project="Total Students" scale="All batches" value={stats.totalStudents} />
            <StatCard project="Active Students" scale="Currently enrolled" value={stats.activeStudents} />
            <StatCard project="Pending Approvals" scale="Awaiting review" value={stats.pendingApprovals} />
          </div>

          <div>
            <h2 className="mb-3 font-[family-name:var(--font-display)] text-lg text-[--color-text-primary]">
              Batch Summary
            </h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {stats.batches.map((batch) => (
                <div
                  key={batch.id}
                  className="rounded-lg border border-[--color-text-secondary]/20 bg-[--color-surface] p-5"
                >
                  <TitleBlock
                    project={batch.name}
                    scale={`Year ${batch.year}`}
                    date={batch.updatedAt}
                    drawnBy={batch.status}
                  />
                </div>
              ))}
              {stats.batches.length === 0 && (
                <p className="text-sm text-[--color-text-secondary]">No batches yet.</p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
