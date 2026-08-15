"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Megaphone, Plus } from "lucide-react";
import { useAuth } from "@/modules/auth/client";
import { apiClient, ApiError } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge, type BadgeVariant } from "@/components/ui/badge";
import { CardTitle } from "@/components/ui/typography";
import { EmptyState } from "@/components/empty-state";
import { useToast } from "@/components/ui/toast";
import { CreateAnnouncementModal } from "./create-announcement-modal";

interface AnnouncementListItem {
  id: string;
  title: string;
  content: string;
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  audienceType: string;
  publishAt: string;
  expiresAt: string | null;
  authorId: string;
}

const PRIORITY_BADGE: Record<AnnouncementListItem["priority"], BadgeVariant> = {
  LOW: "neutral",
  MEDIUM: "active",
  HIGH: "pending",
  URGENT: "rejected",
};

const PAGE_SIZE = 20;

/** MYARCH Phase 3 (§4.5) — Announcements list. Server-side visibility per announcement follows canViewAnnouncement (only active announcements this actor is addressed by, unless they manage announcements). */
export default function AnnouncementsListPage() {
  const { accessToken, role } = useAuth();
  const toast = useToast();

  const [announcements, setAnnouncements] = useState<AnnouncementListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
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
      params.set("page", String(page));
      params.set("pageSize", String(PAGE_SIZE));
      const res = await apiClient.getWithMeta<AnnouncementListItem[], { total: number }>(
        `/api/announcements?${params.toString()}`,
        accessToken,
      );
      setAnnouncements(res.data);
      setTotal(res.meta.total);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Unable to load announcements.");
    } finally {
      setIsLoading(false);
    }
  }, [accessToken, page]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold text-(--color-text-primary)">
            Announcements
          </h1>
          <p className="mt-1 text-sm text-(--color-text-secondary)">Department news addressed to you.</p>
        </div>
        {canCreate && (
          <Button type="button" variant="primary" onClick={() => setIsCreateOpen(true)} className="gap-2">
            <Plus aria-hidden="true" size={16} strokeWidth={1.75} />
            New Announcement
          </Button>
        )}
      </div>

      {error && <p className="text-sm text-(--color-danger)">{error}</p>}
      {isLoading && <p className="text-sm text-(--color-text-secondary)">Loading announcements…</p>}

      {!isLoading && !error && announcements.length === 0 && (
        <Card>
          <EmptyState icon={Megaphone} message="No announcements right now." />
        </Card>
      )}

      {!isLoading && !error && announcements.length > 0 && (
        <div className="space-y-3">
          {announcements.map((announcement) => (
            <Card key={announcement.id} className="transition-shadow duration-150 hover:shadow-md">
              <div className="flex items-start justify-between gap-2">
                <Link href={`/announcements/${announcement.id}`}>
                  <CardTitle className="text-(--color-accent)">{announcement.title}</CardTitle>
                </Link>
                <Badge variant={PRIORITY_BADGE[announcement.priority]}>{announcement.priority}</Badge>
              </div>
              <p className="mt-2 line-clamp-2 text-sm text-(--color-text-secondary)">{announcement.content}</p>
              <p className="mt-2 text-xs text-(--color-text-secondary)">
                {new Date(announcement.publishAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
                {" · "}
                {announcement.audienceType}
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

      <CreateAnnouncementModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        accessToken={accessToken}
        onCreated={() => {
          toast.success("Announcement published.");
          void load();
        }}
      />
    </div>
  );
}
