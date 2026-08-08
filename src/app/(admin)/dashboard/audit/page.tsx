"use client";

import { useEffect, useState } from "react";
import { History } from "lucide-react";
import { useAuth } from "@/modules/auth/client";
import { apiClient, ApiError } from "@/lib/api-client";
import { formatAuditAction } from "@/lib/format-audit-action";
import type { AuditLogEntry } from "@/lib/audit";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { DataLabel } from "@/components/ui/typography";
import { EmptyState } from "@/components/empty-state";

function formatDateHeading(dateKey: string): string {
  return new Date(`${dateKey}T00:00:00.000Z`).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}

function formatTime(value: string | Date): string {
  return new Date(value).toISOString().slice(11, 19);
}

interface DateGroup {
  date: string;
  entries: AuditLogEntry[];
}

/** Groups the already-fetched, already-ordered entries by calendar date — a pure client-side reduction, not a re-sort or a second query. */
function groupByDate(entries: AuditLogEntry[]): DateGroup[] {
  const groups: DateGroup[] = [];
  const indexByDate = new Map<string, number>();

  for (const entry of entries) {
    const date = new Date(entry.occurredAt).toISOString().slice(0, 10);
    const existingIndex = indexByDate.get(date);
    if (existingIndex === undefined) {
      indexByDate.set(date, groups.length);
      groups.push({ date, entries: [entry] });
    } else {
      groups[existingIndex]!.entries.push(entry);
    }
  }

  return groups;
}

/**
 * Module 15 — the Audit Log, redesigned as a chronological activity
 * timeline rather than a plain table. The fetch (`/api/audit/recent`,
 * unchanged) and the role-based scoping description are unchanged; only
 * presentation and purely client-side search/filter/grouping over that
 * one already-fetched list. No sort order is invented — entries are
 * grouped by calendar date in whatever order `listRecent` already
 * returned them (see `src/lib/audit.ts`), not re-ordered.
 */
export default function AuditPage() {
  const { accessToken, role } = useAuth();
  const [entries, setEntries] = useState<AuditLogEntry[]>([]);
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!accessToken) return;
    let cancelled = false;

    (async () => {
      try {
        const result = await apiClient.get<AuditLogEntry[]>("/api/audit/recent", accessToken);
        if (!cancelled) setEntries(result);
      } catch (err) {
        if (!cancelled) setError(err instanceof ApiError ? err.message : "Unable to load audit history.");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [accessToken]);

  const distinctActions = [...new Set(entries.map((entry) => entry.action))];

  const visibleEntries = entries
    .filter((entry) => !actionFilter || entry.action === actionFilter)
    .filter((entry) => {
      if (!search) return true;
      const haystack = `${formatAuditAction(entry.action)} ${entry.targetEntityType}`.toLowerCase();
      return haystack.includes(search.toLowerCase());
    });

  const hasActiveFilters = Boolean(search || actionFilter);
  const dateGroups = groupByDate(visibleEntries);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold text-(--color-text-primary)">
          Audit History
        </h1>
        <p className="mt-1 text-sm text-(--color-text-secondary)">
          {role === "SECRETARY"
            ? "Showing the most recent activity across the department."
            : "Showing your own recent actions."}
        </p>
      </div>

      {error && <p className="text-sm text-(--color-danger)">{error}</p>}

      {!isLoading && entries.length > 0 && (
        <Card>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
            <div>
              <Label htmlFor="audit-search">Search</Label>
              <Input
                id="audit-search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by action or target"
              />
            </div>
            <div>
              <Label htmlFor="audit-action">Action</Label>
              <Select id="audit-action" value={actionFilter} onChange={(e) => setActionFilter(e.target.value)}>
                <option value="">All actions</option>
                {distinctActions.map((action) => (
                  <option key={action} value={action}>
                    {formatAuditAction(action)}
                  </option>
                ))}
              </Select>
            </div>
            {hasActiveFilters && (
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setSearch("");
                  setActionFilter("");
                }}
              >
                Clear filters
              </Button>
            )}
          </div>
        </Card>
      )}

      {isLoading && <p className="text-sm text-(--color-text-secondary)">Loading audit history…</p>}

      {!isLoading && entries.length === 0 && (
        <Card>
          <EmptyState icon={History} message="No recent activity." />
        </Card>
      )}

      {!isLoading && entries.length > 0 && dateGroups.length === 0 && (
        <Card>
          <EmptyState icon={History} message="No activity matches the current filters." />
        </Card>
      )}

      {!isLoading && dateGroups.length > 0 && (
        <section aria-label="Activity timeline" className="space-y-8">
          {dateGroups.map((group) => (
            <div key={group.date}>
              <DataLabel className="mb-3">{formatDateHeading(group.date)}</DataLabel>
              <div className="border-l-2 border-(--color-border) pl-6">
                {group.entries.map((entry) => (
                  <div key={entry.id} className="relative pb-5 last:pb-0">
                    <span className="absolute -left-[29px] top-1 h-3 w-3 rounded-full bg-(--color-accent) ring-4 ring-(--color-background)" />
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <p className="text-sm text-(--color-text-primary)">{formatAuditAction(entry.action)}</p>
                      <p className="font-[family-name:var(--font-data)] text-xs text-(--color-text-secondary)">
                        {formatTime(entry.occurredAt)}
                      </p>
                    </div>
                    <p className="text-xs text-(--color-text-secondary)">
                      {entry.targetEntityType} · {entry.targetEntityId.slice(0, 8)}…
                    </p>
                    {Object.keys(entry.metadata).length > 0 && (
                      <details className="mt-1">
                        <summary className="cursor-pointer text-xs text-(--color-accent) [&::-webkit-details-marker]:hidden">
                          Details
                        </summary>
                        <pre className="mt-1 overflow-x-auto rounded-md bg-(--color-background) p-2 text-xs text-(--color-text-secondary)">
                          {JSON.stringify(entry.metadata, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
