"use client";

import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Pencil } from "lucide-react";
import { useAuth } from "@/modules/auth/client";
import { apiClient, ApiError } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Label, FieldError } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
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

  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [editPriority, setEditPriority] = useState<AnnouncementDetailDto["announcement"]["priority"]>("MEDIUM");
  const [editExpiresAt, setEditExpiresAt] = useState("");
  const [editError, setEditError] = useState<string | null>(null);
  const [isSavingEdit, setIsSavingEdit] = useState(false);

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

  function openEdit() {
    setEditTitle(announcement.title);
    setEditContent(announcement.content);
    setEditPriority(announcement.priority);
    setEditExpiresAt(announcement.expiresAt ? announcement.expiresAt.slice(0, 16) : "");
    setEditError(null);
    setIsEditing(true);
  }

  /**
   * MYARCH Phase 1–3 product-completion pass — covers the content fields
   * (title/content/priority/expiresAt) UpdateAnnouncementUseCase already
   * supports. Audience/publishAt editing is deliberately not exposed here:
   * that use case's own doc comment already documents "no re-notification
   * on edit" — widening an audience post-publish wouldn't notify the newly
   * added recipients, a real gap this pass doesn't attempt to paper over
   * with an edit control that would silently under-deliver.
   */
  async function handleSaveEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setEditError(null);
    setIsSavingEdit(true);
    try {
      await apiClient.patch(
        `/api/announcements/${announcementId}`,
        {
          title: editTitle.trim(),
          content: editContent.trim(),
          priority: editPriority,
          expiresAt: editExpiresAt ? new Date(editExpiresAt).toISOString() : null,
        },
        accessToken ?? undefined,
      );
      toast.success("Announcement updated.");
      setIsEditing(false);
      await load();
    } catch (err) {
      setEditError(err instanceof ApiError ? err.message : "Unable to update this announcement.");
    } finally {
      setIsSavingEdit(false);
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
        {isManager && !isEditing && (
          <div className="mb-3 flex justify-end">
            <Button type="button" variant="ghost" className="gap-1.5" onClick={openEdit}>
              <Pencil aria-hidden="true" size={14} strokeWidth={1.75} />
              Edit
            </Button>
          </div>
        )}

        {isEditing ? (
          <form onSubmit={handleSaveEdit} className="space-y-3">
            <div>
              <Label htmlFor="announcement-edit-title">Title</Label>
              <Input id="announcement-edit-title" required value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="announcement-edit-content">Content</Label>
              <Textarea
                id="announcement-edit-content"
                rows={5}
                required
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="announcement-edit-priority">Priority</Label>
              <Select
                id="announcement-edit-priority"
                value={editPriority}
                onChange={(e) => setEditPriority(e.target.value as AnnouncementDetailDto["announcement"]["priority"])}
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="URGENT">Urgent</option>
              </Select>
            </div>
            <div>
              <Label htmlFor="announcement-edit-expires">Expires at (optional)</Label>
              <Input
                id="announcement-edit-expires"
                type="datetime-local"
                value={editExpiresAt}
                onChange={(e) => setEditExpiresAt(e.target.value)}
              />
            </div>
            <FieldError>{editError ?? undefined}</FieldError>
            <div className="flex gap-2">
              <Button type="submit" variant="primary" disabled={isSavingEdit || !editTitle.trim() || !editContent.trim()}>
                {isSavingEdit ? "Saving…" : "Save changes"}
              </Button>
              <Button type="button" variant="ghost" disabled={isSavingEdit} onClick={() => setIsEditing(false)}>
                Cancel
              </Button>
            </div>
          </form>
        ) : (
          <p className="whitespace-pre-wrap text-sm text-(--color-text-primary)">{announcement.content}</p>
        )}
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
