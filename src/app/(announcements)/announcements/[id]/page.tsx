"use client";

import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/modules/auth/client";
import { apiClient, ApiError } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge, type BadgeVariant } from "@/components/ui/badge";
import { CardTitle } from "@/components/ui/typography";
import { useToast } from "@/components/ui/toast";

interface AnnouncementDetailDto {
  announcement: {
    id: string;
    title: string;
    content: string;
    priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
    audienceType: string;
    audienceValue: string | null;
    publishAt: string;
    expiresAt: string | null;
    authorId: string;
  };
  attachments: { id: string; mimeType: string }[];
}

const PRIORITY_BADGE: Record<AnnouncementDetailDto["announcement"]["priority"], BadgeVariant> = {
  LOW: "neutral",
  MEDIUM: "active",
  HIGH: "pending",
  URGENT: "rejected",
};

export default function AnnouncementDetailPage() {
  const params = useParams<{ id: string }>();
  const announcementId = params.id;
  const { accessToken, userId, role } = useAuth();
  const toast = useToast();
  const router = useRouter();

  const [detail, setDetail] = useState<AnnouncementDetailDto | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!accessToken || !announcementId) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await apiClient.get<AnnouncementDetailDto>(`/api/announcements/${announcementId}`, accessToken);
      setDetail(res);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Unable to load this announcement.");
    } finally {
      setIsLoading(false);
    }
  }, [accessToken, announcementId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  if (isLoading) return <p className="text-sm text-(--color-text-secondary)">Loading announcement…</p>;
  if (error || !detail) return <p className="text-sm text-(--color-danger)">{error ?? "Announcement not found."}</p>;

  const { announcement } = detail;
  const isManager = role === "SECRETARY" || announcement.authorId === userId;

  async function handleDelete() {
    try {
      await apiClient.delete(`/api/announcements/${announcementId}`, accessToken ?? undefined);
      toast.success("Announcement deleted.");
      router.push("/announcements");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Unable to delete this announcement.");
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold text-(--color-text-primary)">
            {announcement.title}
          </h1>
          <p className="mt-1 text-sm text-(--color-text-secondary)">
            {new Date(announcement.publishAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
            {" · "}
            {announcement.audienceType}
            {announcement.expiresAt && ` · expires ${new Date(announcement.expiresAt).toLocaleDateString()}`}
          </p>
        </div>
        <Badge variant={PRIORITY_BADGE[announcement.priority]}>{announcement.priority}</Badge>
      </div>

      <Card>
        <p className="whitespace-pre-wrap text-sm text-(--color-text-primary)">{announcement.content}</p>
      </Card>

      <Card>
        <CardTitle>Attachments ({detail.attachments.length})</CardTitle>
        <ul className="mt-2 space-y-1 text-sm">
          {detail.attachments.map((a) => (
            <li key={a.id}>
              <a href={`/api/announcements/attachments/${a.id}`} target="_blank" rel="noreferrer" className="text-(--color-accent) hover:underline">
                Attachment ({a.mimeType})
              </a>
            </li>
          ))}
          {detail.attachments.length === 0 && <li className="text-(--color-text-secondary)">No attachments.</li>}
        </ul>
      </Card>

      {isManager && (
        <Button type="button" variant="secondary" onClick={handleDelete}>
          Delete Announcement
        </Button>
      )}
    </div>
  );
}
