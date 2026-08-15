"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Plus, Users } from "lucide-react";
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
import { CreateMeetingModal } from "./create-meeting-modal";

interface MeetingListItem {
  id: string;
  title: string;
  status: "SCHEDULED" | "COMPLETED" | "CANCELLED";
  startAt: string;
  venueOrLink: string | null;
  organizerId: string;
}

const STATUS_BADGE: Record<MeetingListItem["status"], BadgeVariant> = {
  SCHEDULED: "active",
  COMPLETED: "approved",
  CANCELLED: "rejected",
};

const PAGE_SIZE = 20;

/** MYARCH Phase 3 (§4.4) — Meeting Management list, scoped server-side to meetings the actor organizes/manages/participates in (SearchMeetingsUseCase). */
export default function MeetingsListPage() {
  const { accessToken, role } = useAuth();
  const toast = useToast();

  const [meetings, setMeetings] = useState<MeetingListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const canCreate = role === "SECRETARY" || role === "COORDINATOR";

  const load = useCallback(async () => {
    if (!accessToken) return;
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (status) params.set("status", status);
      params.set("page", String(page));
      params.set("pageSize", String(PAGE_SIZE));
      const res = await apiClient.getWithMeta<MeetingListItem[], { total: number }>(
        `/api/meetings?${params.toString()}`,
        accessToken,
      );
      setMeetings(res.data);
      setTotal(res.meta.total);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Unable to load meetings.");
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
            Meetings
          </h1>
          <p className="mt-1 text-sm text-(--color-text-secondary)">Meetings you organize or participate in.</p>
        </div>
        {canCreate && (
          <Button type="button" variant="primary" onClick={() => setIsCreateOpen(true)} className="gap-2">
            <Plus aria-hidden="true" size={16} strokeWidth={1.75} />
            New Meeting
          </Button>
        )}
      </div>

      <Card>
        <form onSubmit={handleFilterSubmit} className="flex flex-wrap items-end gap-4">
          <div className="min-w-40">
            <Label htmlFor="filter-meeting-status">Status</Label>
            <Select id="filter-meeting-status" value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">All statuses</option>
              <option value="SCHEDULED">Scheduled</option>
              <option value="COMPLETED">Completed</option>
              <option value="CANCELLED">Cancelled</option>
            </Select>
          </div>
          <Button type="submit" variant="secondary">
            Apply
          </Button>
        </form>
      </Card>

      {error && <p className="text-sm text-(--color-danger)">{error}</p>}
      {isLoading && <p className="text-sm text-(--color-text-secondary)">Loading meetings…</p>}

      {!isLoading && !error && meetings.length === 0 && (
        <Card>
          <EmptyState icon={Users} message="No meetings match these filters." />
        </Card>
      )}

      {!isLoading && !error && meetings.length > 0 && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {meetings.map((meeting) => (
            <Card key={meeting.id} className="transition-shadow duration-150 hover:shadow-md">
              <div className="flex items-start justify-between gap-2">
                <Link href={`/meetings/${meeting.id}`}>
                  <CardTitle className="text-(--color-accent)">{meeting.title}</CardTitle>
                </Link>
                <Badge variant={STATUS_BADGE[meeting.status]}>{meeting.status}</Badge>
              </div>
              <p className="mt-2 text-xs text-(--color-text-secondary)">
                {new Date(meeting.startAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
                {meeting.venueOrLink ? ` · ${meeting.venueOrLink}` : ""}
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
          <Button
            type="button"
            variant="secondary"
            disabled={page * PAGE_SIZE >= total}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </Button>
        </div>
      )}

      <CreateMeetingModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        accessToken={accessToken}
        onCreated={() => {
          toast.success("Meeting created.");
          void load();
        }}
      />
    </div>
  );
}
