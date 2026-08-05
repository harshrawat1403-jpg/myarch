"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/modules/auth/client";
import { apiClient, ApiError } from "@/lib/api-client";
import type { AuditLogEntry } from "@/lib/audit";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from "@/components/ui/table";

/**
 * "Display audit history where appropriate. Do not implement advanced
 * filtering yet" — a simple, read-only recent-activity list. See
 * src/lib/audit.ts's listRecent for the exact scoping (Secretary: all
 * recent entries; Coordinator: their own actions only).
 */
export default function AuditPage() {
  const { accessToken, role } = useAuth();
  const [entries, setEntries] = useState<AuditLogEntry[]>([]);
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

  return (
    <div className="space-y-6">
      <h1 className="font-[family-name:var(--font-display)] text-2xl text-[--color-text-primary]">
        Audit History
      </h1>
      <p className="text-sm text-[--color-text-secondary]">
        {role === "SECRETARY"
          ? "Showing the most recent activity across the department."
          : "Showing your own recent actions."}
      </p>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <Table>
        <TableHead>
          <TableRow>
            <TableHeaderCell>When</TableHeaderCell>
            <TableHeaderCell>Action</TableHeaderCell>
            <TableHeaderCell>Target</TableHeaderCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {isLoading && (
            <TableRow>
              <TableCell colSpan={3}>Loading…</TableCell>
            </TableRow>
          )}
          {!isLoading && entries.length === 0 && (
            <TableRow>
              <TableCell colSpan={3}>No recent activity.</TableCell>
            </TableRow>
          )}
          {!isLoading &&
            entries.map((entry) => (
              <TableRow key={entry.id}>
                <TableCell>{new Date(entry.occurredAt).toISOString().replace("T", " ").slice(0, 19)}</TableCell>
                <TableCell>{entry.action}</TableCell>
                <TableCell>
                  {entry.targetEntityType} · {entry.targetEntityId.slice(0, 8)}…
                </TableCell>
              </TableRow>
            ))}
        </TableBody>
      </Table>
    </div>
  );
}
