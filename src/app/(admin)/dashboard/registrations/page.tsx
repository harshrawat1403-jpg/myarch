"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ClipboardList } from "lucide-react";
import { useAuth } from "@/modules/auth/client";
import { apiClient, ApiError } from "@/lib/api-client";
import type { RegistrationRequestRecord, RegistrationRequestStatus } from "@/modules/registration";
import type { Batch } from "@/modules/batches";
import { Card } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { Badge, type BadgeVariant } from "@/components/ui/badge";
import { CardTitle } from "@/components/ui/typography";
import { EmptyState } from "@/components/empty-state";
import { Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow } from "@/components/ui/table";

const STATUS_OPTIONS: RegistrationRequestStatus[] = ["SUBMITTED", "REVIEWED", "NEEDS_ATTENTION", "APPROVED", "REJECTED"];

function statusBadgeVariant(status: RegistrationRequestStatus): BadgeVariant {
  if (status === "APPROVED") return "approved";
  if (status === "REJECTED") return "rejected";
  if (status === "NEEDS_ATTENTION") return "pending";
  return "neutral";
}

function formatDate(value: string | Date): string {
  return new Date(value).toISOString().slice(0, 10);
}

/**
 * V4.0 B2 — the Coordinator/Secretary registration review queue (§7 step 3,
 * §17). Coordinators only ever see requests within their own batch scope —
 * enforced server-side by SearchRegistrationRequestsUseCase, not filtered
 * here; this page just renders whatever the API returns. Follows the
 * Approval Workspace's established table/card layout.
 */
export default function RegistrationsPage() {
  const { accessToken } = useAuth();
  const [requests, setRequests] = useState<RegistrationRequestRecord[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [statusFilter, setStatusFilter] = useState<RegistrationRequestStatus | "">("SUBMITTED");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    if (!accessToken) return;
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set("status", statusFilter);
      const [items, batchList] = await Promise.all([
        apiClient.get<RegistrationRequestRecord[]>(`/api/registration?${params.toString()}`, accessToken),
        apiClient.get<Batch[]>("/api/batches", accessToken),
      ]);
      setRequests(items);
      setBatches(batchList);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Unable to load registration requests.");
    } finally {
      setIsLoading(false);
    }
  }, [accessToken, statusFilter]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const batchNameById = new Map(batches.map((b) => [b.id, b.name]));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold text-(--color-text-primary)">
          Registrations
        </h1>
        <p className="mt-1 text-sm text-(--color-text-secondary)">
          Prospective student applications awaiting review and decision.
        </p>
      </div>

      <Card>
        <div className="flex flex-wrap items-end gap-4">
          <div className="min-w-48">
            <label htmlFor="status-filter" className="mb-1 block text-sm font-medium text-(--color-text-secondary)">
              Status
            </label>
            <Select
              id="status-filter"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as RegistrationRequestStatus | "")}
            >
              <option value="">All statuses</option>
              {STATUS_OPTIONS.map((status) => (
                <option key={status} value={status}>
                  {status.replace("_", " ")}
                </option>
              ))}
            </Select>
          </div>
        </div>
      </Card>

      {error && <p className="text-sm text-(--color-danger)">{error}</p>}
      {isLoading && <p className="text-sm text-(--color-text-secondary)">Loading registrations…</p>}

      {!isLoading && requests.length === 0 && (
        <Card>
          <EmptyState icon={ClipboardList} message="No registration requests match this filter." />
        </Card>
      )}

      {!isLoading && requests.length > 0 && (
        <>
          <div className="hidden lg:block">
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeaderCell>Applicant</TableHeaderCell>
                  <TableHeaderCell>Roll Number</TableHeaderCell>
                  <TableHeaderCell>Batch</TableHeaderCell>
                  <TableHeaderCell>Submitted</TableHeaderCell>
                  <TableHeaderCell>Status</TableHeaderCell>
                  <TableHeaderCell>Actions</TableHeaderCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {requests.map((request) => (
                  <TableRow key={request.id}>
                    <TableCell>
                      <Link href={`/dashboard/registrations/${request.id}`} className="text-(--color-accent) hover:underline">
                        {request.fullName}
                      </Link>
                    </TableCell>
                    <TableCell>{request.rollNumber}</TableCell>
                    <TableCell>{batchNameById.get(request.batchId) ?? "—"}</TableCell>
                    <TableCell>{formatDate(request.createdAt)}</TableCell>
                    <TableCell>
                      <Badge variant={statusBadgeVariant(request.status)}>{request.status.replace("_", " ")}</Badge>
                    </TableCell>
                    <TableCell>
                      <Link
                        href={`/dashboard/registrations/${request.id}`}
                        className="text-sm font-medium text-(--color-accent) hover:underline"
                      >
                        Review
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:hidden">
            {requests.map((request) => (
              <Card key={request.id} className="transition-shadow duration-150 hover:shadow-md">
                <div className="flex items-start justify-between gap-2">
                  <Link href={`/dashboard/registrations/${request.id}`}>
                    <CardTitle className="text-(--color-accent)">{request.fullName}</CardTitle>
                  </Link>
                  <Badge variant={statusBadgeVariant(request.status)}>{request.status.replace("_", " ")}</Badge>
                </div>
                <p className="mt-2 text-xs text-(--color-text-secondary)">
                  {request.rollNumber} · {batchNameById.get(request.batchId) ?? "—"}
                </p>
                <p className="mt-1 text-xs text-(--color-text-secondary)">Submitted {formatDate(request.createdAt)}</p>
                <Link
                  href={`/dashboard/registrations/${request.id}`}
                  className="mt-3 inline-block text-sm font-medium text-(--color-accent) hover:underline"
                >
                  Review →
                </Link>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
