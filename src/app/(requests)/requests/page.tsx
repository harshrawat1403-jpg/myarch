"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { ClipboardList, Plus } from "lucide-react";
import { useAuth } from "@/modules/auth/client";
import { apiClient, ApiError } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge, type BadgeVariant } from "@/components/ui/badge";
import { CardTitle } from "@/components/ui/typography";
import { EmptyState } from "@/components/empty-state";
import { useToast } from "@/components/ui/toast";
import { SubmitRequestModal } from "./submit-request-modal";

interface RequestListItem {
  id: string;
  type: string;
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  status: "SUBMITTED" | "REVIEW" | "ASSIGNED" | "IN_PROGRESS" | "COMPLETED" | "CLOSED";
  requesterId: string;
  ownerId: string | null;
  createdAt: string;
}

const STATUS_BADGE: Record<RequestListItem["status"], BadgeVariant> = {
  SUBMITTED: "neutral",
  REVIEW: "pending",
  ASSIGNED: "pending",
  IN_PROGRESS: "active",
  COMPLETED: "approved",
  CLOSED: "archived",
};

const PAGE_SIZE = 20;

/** §3.7 — students see only their own submitted requests; staff see what they're scoped to (server-enforced by SearchRequestsUseCase). */
export default function RequestsListPage() {
  const { accessToken, role, userId } = useAuth();
  const toast = useToast();

  const [requests, setRequests] = useState<RequestListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitOpen, setIsSubmitOpen] = useState(false);

  const load = useCallback(async () => {
    if (!accessToken) return;
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (status) params.set("status", status);
      params.set("page", String(page));
      params.set("pageSize", String(PAGE_SIZE));
      const res = await apiClient.getWithMeta<RequestListItem[], { total: number }>(`/api/requests?${params.toString()}`, accessToken);
      setRequests(res.data);
      setTotal(res.meta.total);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Unable to load requests.");
    } finally {
      setIsLoading(false);
    }
  }, [accessToken, status, page]);

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
            Requests
          </h1>
          <p className="mt-1 text-sm text-(--color-text-secondary)">
            {role === "STUDENT" ? "Requests you've submitted." : "Requests you own or awaiting review."}
          </p>
        </div>
        <Button type="button" variant="primary" onClick={() => setIsSubmitOpen(true)} className="gap-2">
          <Plus aria-hidden="true" size={16} strokeWidth={1.75} />
          New Request
        </Button>
      </div>

      <Card>
        <form onSubmit={handleFilterSubmit} className="flex flex-wrap items-end gap-4">
          <div className="min-w-40">
            <Label htmlFor="filter-status">Status</Label>
            <Select id="filter-status" value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">All statuses</option>
              <option value="SUBMITTED">Submitted</option>
              <option value="REVIEW">Review</option>
              <option value="ASSIGNED">Assigned</option>
              <option value="IN_PROGRESS">In progress</option>
              <option value="COMPLETED">Completed</option>
              <option value="CLOSED">Closed</option>
            </Select>
          </div>
          <Button type="submit" variant="secondary">
            Apply
          </Button>
        </form>
      </Card>

      {error && <p className="text-sm text-(--color-danger)">{error}</p>}
      {isLoading && <p className="text-sm text-(--color-text-secondary)">Loading requests…</p>}

      {!isLoading && !error && requests.length === 0 && (
        <Card>
          <EmptyState icon={ClipboardList} message="No requests match these filters." />
        </Card>
      )}

      {!isLoading && !error && requests.length > 0 && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {requests.map((request) => (
            <Card key={request.id} className="transition-shadow duration-150 hover:shadow-md">
              <div className="flex items-start justify-between gap-2">
                <Link href={`/requests/${request.id}`}>
                  <CardTitle className="text-(--color-accent)">{request.type}</CardTitle>
                </Link>
                <Badge variant={STATUS_BADGE[request.status]}>{request.status.replace("_", " ")}</Badge>
              </div>
              <p className="mt-2 text-xs text-(--color-text-secondary)">
                Priority: {request.priority}
                {request.ownerId === userId ? " · Owned by you" : ""}
              </p>
            </Card>
          ))}
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

      <SubmitRequestModal
        isOpen={isSubmitOpen}
        onClose={() => setIsSubmitOpen(false)}
        accessToken={accessToken}
        onSubmitted={() => {
          toast.success("Request submitted.");
          void load();
        }}
      />
    </div>
  );
}
