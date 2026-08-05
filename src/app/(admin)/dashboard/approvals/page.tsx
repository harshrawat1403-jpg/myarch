"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/modules/auth/client";
import { apiClient, ApiError } from "@/lib/api-client";
import type { ApprovalQueueItem } from "@/modules/profiles";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from "@/components/ui/table";

export default function ApprovalQueuePage() {
  const { accessToken } = useAuth();
  const [queue, setQueue] = useState<ApprovalQueueItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!accessToken) return;
    let cancelled = false;

    (async () => {
      try {
        const items = await apiClient.get<ApprovalQueueItem[]>("/api/profiles/approval-queue", accessToken);
        if (!cancelled) setQueue(items);
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

  return (
    <div className="space-y-6">
      <h1 className="font-[family-name:var(--font-display)] text-2xl text-[--color-text-primary]">
        Approval Queue
      </h1>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <Table>
        <TableHead>
          <TableRow>
            <TableHeaderCell>Student</TableHeaderCell>
            <TableHeaderCell>Submitted</TableHeaderCell>
            <TableHeaderCell>Actions</TableHeaderCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {isLoading && (
            <TableRow>
              <TableCell colSpan={3}>Loading…</TableCell>
            </TableRow>
          )}
          {!isLoading && queue.length === 0 && (
            <TableRow>
              <TableCell colSpan={3}>No pending submissions.</TableCell>
            </TableRow>
          )}
          {!isLoading &&
            queue.map((item) => (
              <TableRow key={item.draftId}>
                <TableCell>{item.studentFullName}</TableCell>
                <TableCell>
                  {item.submittedAt ? new Date(item.submittedAt).toISOString().slice(0, 10) : "—"}
                </TableCell>
                <TableCell>
                  <Link
                    href={`/dashboard/approvals/${item.studentProfileId}`}
                    className="text-[--color-accent] hover:underline"
                  >
                    Review
                  </Link>
                </TableCell>
              </TableRow>
            ))}
        </TableBody>
      </Table>
    </div>
  );
}
