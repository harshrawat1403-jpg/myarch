"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState, type FormEvent } from "react";
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

interface EventDetailDto {
  event: {
    id: string;
    title: string;
    description: string | null;
    status: "DRAFT" | "PUBLISHED" | "COMPLETED" | "CANCELLED";
    startAt: string;
    endAt: string | null;
    venue: string | null;
    organizerId: string;
    budgetAmount: string | null;
    budgetNotes: string | null;
    postEventReport: string | null;
  };
  participants: { id: string; userId: string; role: "ORGANIZER" | "COORDINATOR" | "VOLUNTEER" }[];
  checklist: { id: string; label: string; isDone: boolean }[];
  attachments: { id: string; kind: "DOCUMENT" | "MEDIA"; mimeType: string }[];
  registrationCount: number;
  isSelfRegistered: boolean;
}

interface RelatedTask {
  id: string;
  title: string;
  status: string;
  deadline: string | null;
}

const STATUS_BADGE: Record<EventDetailDto["event"]["status"], BadgeVariant> = {
  DRAFT: "neutral",
  PUBLISHED: "active",
  COMPLETED: "approved",
  CANCELLED: "rejected",
};

export default function EventDetailPage() {
  const params = useParams<{ id: string }>();
  const eventId = params.id;
  const { accessToken, userId, role } = useAuth();
  const toast = useToast();

  const [detail, setDetail] = useState<EventDetailDto | null>(null);
  const [tasks, setTasks] = useState<RelatedTask[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [participantUserId, setParticipantUserId] = useState("");
  const [participantRole, setParticipantRole] = useState("VOLUNTEER");
  const [checklistLabel, setChecklistLabel] = useState("");
  const [report, setReport] = useState("");

  const load = useCallback(async () => {
    if (!accessToken || !eventId) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await apiClient.get<EventDetailDto>(`/api/events/${eventId}`, accessToken);
      setDetail(res);
      setReport(res.event.postEventReport ?? "");
      const taskRes = await apiClient.get<RelatedTask[]>(
        `/api/tasks?relatedEntityType=Event&relatedEntityId=${eventId}`,
        accessToken,
      );
      setTasks(taskRes);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Unable to load this event.");
    } finally {
      setIsLoading(false);
    }
  }, [accessToken, eventId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  if (isLoading) return <p className="text-sm text-(--color-text-secondary)">Loading event…</p>;
  if (error || !detail) return <p className="text-sm text-(--color-danger)">{error ?? "Event not found."}</p>;

  const { event } = detail;
  const isManager = role === "SECRETARY" || role === "COORDINATOR" || event.organizerId === userId;
  const canRegister = (role === "STUDENT" || role === "ALUMNI") && event.status === "PUBLISHED";

  async function runAction(action: () => Promise<unknown>, successMessage: string) {
    try {
      await action();
      toast.success(successMessage);
      void load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Action failed.");
    }
  }

  async function handleAddParticipant(e: FormEvent) {
    e.preventDefault();
    if (!participantUserId.trim()) return;
    await runAction(
      () =>
        apiClient.post(
          `/api/events/${eventId}/participants`,
          { userId: participantUserId.trim(), role: participantRole },
          accessToken ?? undefined,
        ),
      "Participant added.",
    );
    setParticipantUserId("");
  }

  async function handleAddChecklistItem(e: FormEvent) {
    e.preventDefault();
    if (!checklistLabel.trim()) return;
    await runAction(
      () => apiClient.post(`/api/events/${eventId}/checklist`, { label: checklistLabel.trim() }, accessToken ?? undefined),
      "Checklist item added.",
    );
    setChecklistLabel("");
  }

  async function handleSaveReport(e: FormEvent) {
    e.preventDefault();
    await runAction(
      () => apiClient.patch(`/api/events/${eventId}`, { postEventReport: report }, accessToken ?? undefined),
      "Report saved.",
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold text-(--color-text-primary)">
            {event.title}
          </h1>
          <p className="mt-1 text-sm text-(--color-text-secondary)">
            {new Date(event.startAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
            {event.venue ? ` · ${event.venue}` : ""}
          </p>
        </div>
        <Badge variant={STATUS_BADGE[event.status]}>{event.status}</Badge>
      </div>

      {event.description && <Card><p className="text-sm text-(--color-text-primary)">{event.description}</p></Card>}

      {isManager && (
        <div className="flex flex-wrap gap-3">
          {event.status === "DRAFT" && (
            <Button type="button" variant="primary" onClick={() => runAction(() => apiClient.post(`/api/events/${eventId}/publish`, undefined, accessToken ?? undefined), "Event published.")}>
              Publish
            </Button>
          )}
          {event.status === "PUBLISHED" && (
            <Button type="button" variant="primary" onClick={() => runAction(() => apiClient.post(`/api/events/${eventId}/complete`, undefined, accessToken ?? undefined), "Event marked complete.")}>
              Mark Completed
            </Button>
          )}
          {(event.status === "DRAFT" || event.status === "PUBLISHED") && (
            <Button type="button" variant="secondary" onClick={() => runAction(() => apiClient.post(`/api/events/${eventId}/cancel`, undefined, accessToken ?? undefined), "Event cancelled.")}>
              Cancel Event
            </Button>
          )}
        </div>
      )}

      {canRegister && !detail.isSelfRegistered && (
        <Button type="button" variant="primary" onClick={() => runAction(() => apiClient.post(`/api/events/${eventId}/register`, undefined, accessToken ?? undefined), "Registered for this event.")}>
          Register
        </Button>
      )}
      {canRegister && detail.isSelfRegistered && <Badge variant="approved">You are registered</Badge>}

      <Card>
        <CardTitle>Participants ({detail.participants.length})</CardTitle>
        <ul className="mt-2 space-y-1 text-sm text-(--color-text-secondary)">
          {detail.participants.map((p) => (
            <li key={p.id}>
              {p.userId} — {p.role}
            </li>
          ))}
          {detail.participants.length === 0 && <li>No Coordinators/volunteers added yet.</li>}
        </ul>
        {isManager && (
          <form onSubmit={handleAddParticipant} className="mt-4 flex flex-wrap items-end gap-3">
            <div className="min-w-56">
              <Label htmlFor="participant-user-id">User ID</Label>
              <Input id="participant-user-id" value={participantUserId} onChange={(e) => setParticipantUserId(e.target.value)} placeholder="user UUID" />
            </div>
            <div className="min-w-40">
              <Label htmlFor="participant-role">Role</Label>
              <Select id="participant-role" value={participantRole} onChange={(e) => setParticipantRole(e.target.value)}>
                <option value="VOLUNTEER">Volunteer</option>
                <option value="COORDINATOR">Coordinator</option>
              </Select>
            </div>
            <Button type="submit" variant="secondary">Add</Button>
          </form>
        )}
      </Card>

      <Card>
        <CardTitle>Checklist</CardTitle>
        <ul className="mt-2 space-y-2">
          {detail.checklist.map((item) => (
            <li key={item.id} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={item.isDone}
                disabled={!isManager}
                onChange={(e) =>
                  runAction(
                    () => apiClient.patch(`/api/events/${eventId}/checklist/${item.id}`, { isDone: e.target.checked }, accessToken ?? undefined),
                    "Checklist updated.",
                  )
                }
              />
              <span className={item.isDone ? "text-(--color-text-secondary) line-through" : "text-(--color-text-primary)"}>
                {item.label}
              </span>
            </li>
          ))}
          {detail.checklist.length === 0 && <li className="text-sm text-(--color-text-secondary)">Nothing on the checklist yet.</li>}
        </ul>
        {isManager && (
          <form onSubmit={handleAddChecklistItem} className="mt-4 flex items-end gap-3">
            <div className="min-w-56 flex-1">
              <Label htmlFor="checklist-label">New item</Label>
              <Input id="checklist-label" value={checklistLabel} onChange={(e) => setChecklistLabel(e.target.value)} />
            </div>
            <Button type="submit" variant="secondary">Add</Button>
          </form>
        )}
      </Card>

      <Card>
        <CardTitle>Tasks ({tasks.length})</CardTitle>
        <p className="mt-1 text-xs text-(--color-text-secondary)">Prep work tracked via the shared Task/Follow-up system.</p>
        <ul className="mt-2 space-y-1 text-sm">
          {tasks.map((task) => (
            <li key={task.id}>
              <Link href={`/tasks/${task.id}`} className="text-(--color-accent) hover:underline">
                {task.title}
              </Link>{" "}
              <span className="text-xs text-(--color-text-secondary)">
                ({task.status}{task.deadline ? ` · due ${new Date(task.deadline).toLocaleDateString()}` : ""})
              </span>
            </li>
          ))}
          {tasks.length === 0 && <li className="text-(--color-text-secondary)">No tasks yet.</li>}
        </ul>
        {isManager && (
          <Link href={`/tasks`} className="mt-3 inline-block text-xs font-medium text-(--color-accent) hover:underline">
            Create a task for this event →
          </Link>
        )}
      </Card>

      <Card>
        <CardTitle>Attachments ({detail.attachments.length})</CardTitle>
        <ul className="mt-2 space-y-1 text-sm">
          {detail.attachments.map((a) => (
            <li key={a.id}>
              <a href={`/api/events/attachments/${a.id}`} target="_blank" rel="noreferrer" className="text-(--color-accent) hover:underline">
                {a.kind === "MEDIA" ? "Media" : "Document"} ({a.mimeType})
              </a>
            </li>
          ))}
          {detail.attachments.length === 0 && <li className="text-(--color-text-secondary)">No attachments yet.</li>}
        </ul>
      </Card>

      <Card>
        <CardTitle>Registration</CardTitle>
        <p className="mt-1 text-sm text-(--color-text-secondary)">{detail.registrationCount} registered.</p>
      </Card>

      {isManager && event.status === "COMPLETED" && (
        <Card>
          <CardTitle>Post-event report</CardTitle>
          <form onSubmit={handleSaveReport} className="mt-2 space-y-3">
            <Textarea rows={5} value={report} onChange={(e) => setReport(e.target.value)} />
            <FieldError />
            <Button type="submit" variant="secondary">Save report</Button>
          </form>
        </Card>
      )}
    </div>
  );
}
