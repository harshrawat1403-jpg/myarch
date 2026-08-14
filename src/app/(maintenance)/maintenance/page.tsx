"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { AlertTriangle, Plus, Wrench } from "lucide-react";
import { useAuth } from "@/modules/auth/client";
import { apiClient, ApiError } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge, type BadgeVariant } from "@/components/ui/badge";
import { CardTitle } from "@/components/ui/typography";
import { EmptyState } from "@/components/empty-state";
import { useToast } from "@/components/ui/toast";
import { ReportIssueModal } from "./report-issue-modal";

interface MaintenanceIssueListItem {
  id: string;
  category: string;
  location: string;
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  status:
    | "SUBMITTED"
    | "ACKNOWLEDGED"
    | "ASSIGNED"
    | "IN_PROGRESS"
    | "RESOLVED"
    | "VERIFIED"
    | "CLOSED"
    | "REOPENED";
  deadline: string | null;
  requesterId: string;
  assigneeId: string | null;
  createdAt: string;
}

const STATUS_BADGE: Record<MaintenanceIssueListItem["status"], BadgeVariant> = {
  SUBMITTED: "neutral",
  ACKNOWLEDGED: "pending",
  ASSIGNED: "pending",
  IN_PROGRESS: "active",
  RESOLVED: "approved",
  VERIFIED: "approved",
  CLOSED: "archived",
  REOPENED: "rejected",
};

const PAGE_SIZE = 20;

function isOverdue(deadline: string | null, status: MaintenanceIssueListItem["status"]): boolean {
  if (!deadline || status === "RESOLVED" || status === "VERIFIED" || status === "CLOSED") return false;
  return new Date(deadline).getTime() < Date.now();
}

/** §3.1–§3.4 — students see only their own reported issues; staff see what they're scoped to (server-enforced by SearchMaintenanceIssuesUseCase). */
export default function MaintenanceIssuesPage() {
  const { accessToken, role, userId } = useAuth();
  const toast = useToast();

  const [issues, setIssues] = useState<MaintenanceIssueListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isReportOpen, setIsReportOpen] = useState(false);

  const load = useCallback(async () => {
    if (!accessToken) return;
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (status) params.set("status", status);
      if (overdueOnly) params.set("overdueOnly", "true");
      params.set("page", String(page));
      params.set("pageSize", String(PAGE_SIZE));
      const res = await apiClient.getWithMeta<MaintenanceIssueListItem[], { total: number }>(
        `/api/maintenance/issues?${params.toString()}`,
        accessToken,
      );
      setIssues(res.data);
      setTotal(res.meta.total);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Unable to load maintenance issues.");
    } finally {
      setIsLoading(false);
    }
  }, [accessToken, status, overdueOnly, page]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  function handleFilterSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPage(1);
    void load();
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold text-(--color-text-primary)">
            Maintenance
          </h1>
          <p className="mt-1 text-sm text-(--color-text-secondary)">
            {role === "STUDENT" ? "Issues you've reported." : "Issues assigned to you or awaiting action."}
          </p>
        </div>
        <Button type="button" variant="primary" onClick={() => setIsReportOpen(true)} className="gap-2">
          <Plus aria-hidden="true" size={16} strokeWidth={1.75} />
          Report Issue
        </Button>
      </div>

      <Card>
        <form onSubmit={handleFilterSubmit} className="flex flex-wrap items-end gap-4">
          <div className="min-w-40">
            <Label htmlFor="filter-status">Status</Label>
            <Select id="filter-status" value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">All statuses</option>
              <option value="SUBMITTED">Submitted</option>
              <option value="ACKNOWLEDGED">Acknowledged</option>
              <option value="ASSIGNED">Assigned</option>
              <option value="IN_PROGRESS">In progress</option>
              <option value="RESOLVED">Resolved</option>
              <option value="VERIFIED">Verified</option>
              <option value="CLOSED">Closed</option>
              <option value="REOPENED">Reopened</option>
            </Select>
          </div>
          <Checkbox id="filter-overdue" label="Overdue only" checked={overdueOnly} onChange={(e) => setOverdueOnly(e.target.checked)} />
          <Button type="submit" variant="secondary">
            Apply
          </Button>
        </form>
      </Card>

      {error && <p className="text-sm text-(--color-danger)">{error}</p>}
      {isLoading && <p className="text-sm text-(--color-text-secondary)">Loading issues…</p>}

      {!isLoading && !error && issues.length === 0 && (
        <Card>
          <EmptyState icon={Wrench} message="No maintenance issues match these filters." />
        </Card>
      )}

      {!isLoading && !error && issues.length > 0 && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {issues.map((issue) => {
            const overdue = isOverdue(issue.deadline, issue.status);
            return (
              <Card key={issue.id} className="transition-shadow duration-150 hover:shadow-md">
                <div className="flex items-start justify-between gap-2">
                  <Link href={`/maintenance/${issue.id}`}>
                    <CardTitle className="text-(--color-accent)">{issue.location}</CardTitle>
                  </Link>
                  <Badge variant={STATUS_BADGE[issue.status]}>{issue.status.replace("_", " ")}</Badge>
                </div>
                <p className="mt-2 text-xs text-(--color-text-secondary)">
                  {issue.category.replace("_", " ")} · Priority: {issue.priority}
                  {issue.assigneeId === userId ? " · Assigned to you" : ""}
                </p>
                {issue.deadline && (
                  <p className={`mt-1 flex items-center gap-1 text-xs ${overdue ? "text-(--color-danger)" : "text-(--color-text-secondary)"}`}>
                    {overdue && <AlertTriangle aria-hidden="true" size={12} strokeWidth={2} />}
                    Due {new Date(issue.deadline).toLocaleDateString()}
                  </p>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {!isLoading && total > PAGE_SIZE && (
        <div className="flex items-center justify-center gap-3">
          <Button type="button" variant="secondary" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            Previous
          </Button>
          <span className="text-sm text-(--color-text-secondary)">Page {page}</span>
          <Button type="button" variant="secondary" disabled={page * PAGE_SIZE >= total} onClick={() => setPage((p) => p + 1)}>
            Next
          </Button>
        </div>
      )}

      <ReportIssueModal
        isOpen={isReportOpen}
        onClose={() => setIsReportOpen(false)}
        accessToken={accessToken}
        onReported={() => {
          toast.success("Issue reported.");
          void load();
        }}
      />
    </div>
  );
}
