"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Clock, ClipboardCheck, History, Layers } from "lucide-react";
import { useAuth } from "@/modules/auth/client";
import { apiClient, ApiError } from "@/lib/api-client";
import { formatAuditAction } from "@/lib/format-audit-action";
import type { ApprovalQueueItem } from "@/modules/profiles";
import type { Batch } from "@/modules/batches";
import type { AuditLogEntry } from "@/lib/audit";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { CardTitle, DataLabel } from "@/components/ui/typography";
import { StatPanel } from "@/components/ui/stat-panel";
import { DashboardPanel } from "@/components/dashboard-panel";
import { EmptyState } from "@/components/empty-state";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from "@/components/ui/table";

const REVIEW_AUDIT_ACTIONS = new Set(["PROFILE_APPROVED", "PROFILE_CHANGES_REQUESTED"]);

function daysWaiting(submittedAt: string | Date | null): number | null {
  if (!submittedAt) return null;
  const submitted = new Date(submittedAt).getTime();
  return Math.max(0, Math.floor((Date.now() - submitted) / (1000 * 60 * 60 * 24)));
}

function formatDate(value: string | Date): string {
  return new Date(value).toISOString().slice(0, 10);
}

/**
 * The Approval Workspace (Milestone 11) — same data source as before
 * (`/api/profiles/approval-queue`), plus two already-existing endpoints
 * this page simply hadn't called yet: `/api/batches` (to resolve each
 * item's batch name, the same way Student Management already does) and
 * `/api/audit/recent` (for Review History, the same endpoint Dashboard
 * already reuses). No new backend surface. "Review priority" is a wait-
 * time sort over `submittedAt`, a field the API already returns — not an
 * invented priority field. Search and batch filtering are client-side over
 * the single already-fetched queue, since the queue endpoint takes no
 * query parameters.
 */
export default function ApprovalQueuePage() {
  const { accessToken } = useAuth();
  const [queue, setQueue] = useState<ApprovalQueueItem[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [recentReviews, setRecentReviews] = useState<AuditLogEntry[]>([]);
  const [searchName, setSearchName] = useState("");
  const [batchFilter, setBatchFilter] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!accessToken) return;
    let cancelled = false;

    (async () => {
      try {
        const [items, batchList, auditEntries] = await Promise.all([
          apiClient.get<ApprovalQueueItem[]>("/api/profiles/approval-queue", accessToken),
          apiClient.get<Batch[]>("/api/batches", accessToken),
          apiClient.get<AuditLogEntry[]>("/api/audit/recent", accessToken),
        ]);
        if (cancelled) return;
        setQueue(items);
        setBatches(batchList);
        setRecentReviews(auditEntries.filter((entry) => REVIEW_AUDIT_ACTIONS.has(entry.action)).slice(0, 5));
      } catch (err) {
        if (!cancelled) setError(err instanceof ApiError ? err.message : "Unable to load the approval queue.");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [accessToken]);

  const batchNameById = new Map(batches.map((batch) => [batch.id, batch.name]));
  const batchesInQueue = [...new Map(queue.map((item) => [item.batchId, batchNameById.get(item.batchId) ?? item.batchId])).entries()];

  const visibleQueue = queue
    .filter((item) => !searchName || item.studentFullName.toLowerCase().includes(searchName.toLowerCase()))
    .filter((item) => !batchFilter || item.batchId === batchFilter)
    .slice()
    .sort((a, b) => {
      const aTime = a.submittedAt ? new Date(a.submittedAt).getTime() : Infinity;
      const bTime = b.submittedAt ? new Date(b.submittedAt).getTime() : Infinity;
      return aTime - bTime;
    });

  const hasActiveFilters = Boolean(searchName || batchFilter);
  const oldestWaiting = queue.reduce<number | null>((max, item) => {
    const waiting = daysWaiting(item.submittedAt);
    if (waiting === null) return max;
    return max === null ? waiting : Math.max(max, waiting);
  }, null);

  function renderWaitingIndicator(item: ApprovalQueueItem) {
    const waiting = daysWaiting(item.submittedAt);
    if (waiting === null) return <span className="text-xs text-(--color-text-secondary)">—</span>;
    if (waiting >= 3)
      return (
        <Badge variant="pending">
          <Clock aria-hidden="true" size={11} strokeWidth={2} className="mr-1" />
          Waiting {waiting}d
        </Badge>
      );
    return <span className="text-xs text-(--color-text-secondary)">Waiting {waiting}d</span>;
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold text-(--color-text-primary)">
          Approval Workspace
        </h1>
        <p className="mt-1 text-sm text-(--color-text-secondary)">Oldest submissions first, so nothing waits longer than it needs to.</p>
      </div>

      {error && <p className="text-sm text-(--color-danger)">{error}</p>}
      {isLoading && <p className="text-sm text-(--color-text-secondary)">Loading approval queue…</p>}

      {!isLoading && (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatPanel compact icon={ClipboardCheck} label="Pending Review" value={queue.length} scope="Awaiting a decision" />
            <StatPanel
              compact
              icon={Clock}
              label="Oldest Waiting"
              value={oldestWaiting === null ? "—" : `${oldestWaiting}d`}
              scope="Longest in queue"
            />
            <StatPanel compact icon={Layers} label="Batches Represented" value={batchesInQueue.length} scope="In the current queue" />
          </div>

          <Card>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
              <div>
                <Label htmlFor="search-name">Student name</Label>
                <Input
                  id="search-name"
                  value={searchName}
                  onChange={(e) => setSearchName(e.target.value)}
                  placeholder="Search by name"
                />
              </div>
              <div>
                <Label htmlFor="batch-filter">Batch</Label>
                <Select id="batch-filter" value={batchFilter} onChange={(e) => setBatchFilter(e.target.value)}>
                  <option value="">All batches</option>
                  {batchesInQueue.map(([batchId, batchName]) => (
                    <option key={batchId} value={batchId}>
                      {batchName}
                    </option>
                  ))}
                </Select>
              </div>
              {hasActiveFilters && (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setSearchName("");
                    setBatchFilter("");
                  }}
                >
                  Clear filters
                </Button>
              )}
            </div>
          </Card>

          {visibleQueue.length === 0 ? (
            <Card>
              <EmptyState
                icon={ClipboardCheck}
                message={queue.length === 0 ? "No pending submissions." : "No submissions match the current filters."}
              />
            </Card>
          ) : (
            <>
              {/* Desktop / tablet: data-dense table. */}
              <div className="hidden lg:block">
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableHeaderCell>Student</TableHeaderCell>
                      <TableHeaderCell>Batch</TableHeaderCell>
                      <TableHeaderCell>Submitted</TableHeaderCell>
                      <TableHeaderCell>Priority</TableHeaderCell>
                      <TableHeaderCell>Actions</TableHeaderCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {visibleQueue.map((item) => (
                      <TableRow key={item.draftId}>
                        <TableCell>{item.studentFullName}</TableCell>
                        <TableCell>{batchNameById.get(item.batchId) ?? "—"}</TableCell>
                        <TableCell>{item.submittedAt ? formatDate(item.submittedAt) : "—"}</TableCell>
                        <TableCell>{renderWaitingIndicator(item)}</TableCell>
                        <TableCell>
                          <Link
                            href={`/dashboard/approvals/${item.studentProfileId}`}
                            className="text-(--color-accent) hover:underline"
                          >
                            Review
                          </Link>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Narrow viewports: one card per submission. */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:hidden">
                {visibleQueue.map((item) => (
                  <Card key={item.draftId} className="transition-shadow duration-150 hover:shadow-md">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle>{item.studentFullName}</CardTitle>
                      {renderWaitingIndicator(item)}
                    </div>
                    <p className="mt-2 text-xs text-(--color-text-secondary)">
                      {batchNameById.get(item.batchId) ?? "—"} · Submitted{" "}
                      {item.submittedAt ? formatDate(item.submittedAt) : "—"}
                    </p>
                    <Link
                      href={`/dashboard/approvals/${item.studentProfileId}`}
                      className="mt-3 inline-block text-sm font-medium text-(--color-accent) hover:underline"
                    >
                      Review →
                    </Link>
                  </Card>
                ))}
              </div>
            </>
          )}

          <DashboardPanel title="Review History" icon={History}>
            {recentReviews.length === 0 ? (
              <EmptyState icon={History} message="No recent review activity." />
            ) : (
              <ul className="space-y-1">
                {recentReviews.map((entry) => (
                  <li key={entry.id} className="-mx-2 rounded-lg px-2 py-2 transition-colors duration-150 hover:bg-(--color-surface-muted)">
                    <p className="text-sm text-(--color-text-primary)">{formatAuditAction(entry.action)}</p>
                    <p className="mt-0.5 text-xs text-(--color-text-secondary)">{formatDate(entry.occurredAt)}</p>
                  </li>
                ))}
              </ul>
            )}
          </DashboardPanel>
        </>
      )}
    </div>
  );
}
