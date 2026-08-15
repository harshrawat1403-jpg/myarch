"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useAuth } from "@/modules/auth/client";
import { apiClient, ApiError } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Label, FieldError } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge, type BadgeVariant } from "@/components/ui/badge";
import { CardTitle } from "@/components/ui/typography";
import { useToast } from "@/components/ui/toast";

interface MeetingDetailDto {
  meeting: {
    id: string;
    title: string;
    agenda: string | null;
    status: "SCHEDULED" | "COMPLETED" | "CANCELLED";
    startAt: string;
    venueOrLink: string | null;
    organizerId: string;
    notes: string | null;
    decisions: string | null;
  };
  participants: { id: string; userId: string; attended: boolean }[];
}

interface RelatedTask {
  id: string;
  title: string;
  status: string;
  deadline: string | null;
}

const STATUS_BADGE: Record<MeetingDetailDto["meeting"]["status"], BadgeVariant> = {
  SCHEDULED: "active",
  COMPLETED: "approved",
  CANCELLED: "rejected",
};

export default function MeetingDetailPage() {
  const params = useParams<{ id: string }>();
  const meetingId = params.id;
  const { accessToken, userId, role } = useAuth();
  const toast = useToast();

  const [detail, setDetail] = useState<MeetingDetailDto | null>(null);
  const [tasks, setTasks] = useState<RelatedTask[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [participantUserId, setParticipantUserId] = useState("");
  const [notes, setNotes] = useState("");
  const [decisions, setDecisions] = useState("");

  const load = useCallback(async () => {
    if (!accessToken || !meetingId) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await apiClient.get<MeetingDetailDto>(`/api/meetings/${meetingId}`, accessToken);
      setDetail(res);
      setNotes(res.meeting.notes ?? "");
      setDecisions(res.meeting.decisions ?? "");
      const taskRes = await apiClient.get<RelatedTask[]>(
        `/api/tasks?relatedEntityType=Meeting&relatedEntityId=${meetingId}`,
        accessToken,
      );
      setTasks(taskRes);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Unable to load this meeting.");
    } finally {
      setIsLoading(false);
    }
  }, [accessToken, meetingId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  if (isLoading) return <p className="text-sm text-(--color-text-secondary)">Loading meeting…</p>;
  if (error || !detail) return <p className="text-sm text-(--color-danger)">{error ?? "Meeting not found."}</p>;

  const { meeting } = detail;
  // Server re-checks canManageMeeting on every action regardless — this only
  // decides whether to show manager controls. A delegated Coordinator
  // without meetings.manage but not the organizer simply won't see them
  // (an under- not over-permissive UI gap, harmless since the API itself
  // is the real gate).
  const isManager = role === "SECRETARY" || meeting.organizerId === userId;

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
      () => apiClient.post(`/api/meetings/${meetingId}/participants`, { userId: participantUserId.trim() }, accessToken ?? undefined),
      "Participant added.",
    );
    setParticipantUserId("");
  }

  async function handleSaveNotes(e: FormEvent) {
    e.preventDefault();
    await runAction(
      () => apiClient.patch(`/api/meetings/${meetingId}`, { notes, decisions }, accessToken ?? undefined),
      "Notes saved.",
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold text-(--color-text-primary)">
            {meeting.title}
          </h1>
          <p className="mt-1 text-sm text-(--color-text-secondary)">
            {new Date(meeting.startAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
            {meeting.venueOrLink ? ` · ${meeting.venueOrLink}` : ""}
          </p>
        </div>
        <Badge variant={STATUS_BADGE[meeting.status]}>{meeting.status}</Badge>
      </div>

      {meeting.agenda && (
        <Card>
          <CardTitle>Agenda</CardTitle>
          <p className="mt-1 text-sm text-(--color-text-primary)">{meeting.agenda}</p>
        </Card>
      )}

      {isManager && meeting.status === "SCHEDULED" && (
        <div className="flex flex-wrap gap-3">
          <Button type="button" variant="primary" onClick={() => runAction(() => apiClient.post(`/api/meetings/${meetingId}/complete`, undefined, accessToken ?? undefined), "Meeting marked complete.")}>
            Mark Completed
          </Button>
          <Button type="button" variant="secondary" onClick={() => runAction(() => apiClient.post(`/api/meetings/${meetingId}/cancel`, undefined, accessToken ?? undefined), "Meeting cancelled.")}>
            Cancel Meeting
          </Button>
        </div>
      )}

      <Card>
        <CardTitle>Participants ({detail.participants.length})</CardTitle>
        <ul className="mt-2 space-y-1 text-sm text-(--color-text-secondary)">
          {detail.participants.map((p) => (
            <li key={p.id} className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={p.attended}
                disabled={!isManager}
                onChange={(e) =>
                  runAction(
                    () => apiClient.post(`/api/meetings/${meetingId}/attendance`, { userId: p.userId, attended: e.target.checked }, accessToken ?? undefined),
                    "Attendance updated.",
                  )
                }
              />
              {p.userId} {p.attended ? "(attended)" : ""}
            </li>
          ))}
          {detail.participants.length === 0 && <li>No participants added yet.</li>}
        </ul>
        {isManager && (
          <form onSubmit={handleAddParticipant} className="mt-4 flex flex-wrap items-end gap-3">
            <div className="min-w-56">
              <Label htmlFor="meeting-participant-user-id">User ID</Label>
              <Input id="meeting-participant-user-id" value={participantUserId} onChange={(e) => setParticipantUserId(e.target.value)} placeholder="user UUID" />
            </div>
            <Button type="submit" variant="secondary">Add</Button>
          </form>
        )}
      </Card>

      <Card>
        <CardTitle>Action items ({tasks.length})</CardTitle>
        <p className="mt-1 text-xs text-(--color-text-secondary)">Tracked via the shared Task/Follow-up system.</p>
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
          {tasks.length === 0 && <li className="text-(--color-text-secondary)">No action items yet.</li>}
        </ul>
        {isManager && (
          <Link href={`/tasks`} className="mt-3 inline-block text-xs font-medium text-(--color-accent) hover:underline">
            Create an action item →
          </Link>
        )}
      </Card>

      {isManager && (
        <Card>
          <CardTitle>Notes &amp; decisions</CardTitle>
          <form onSubmit={handleSaveNotes} className="mt-2 space-y-3">
            <div>
              <Label htmlFor="meeting-notes">Notes</Label>
              <Textarea id="meeting-notes" rows={4} value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="meeting-decisions">Decisions</Label>
              <Textarea id="meeting-decisions" rows={4} value={decisions} onChange={(e) => setDecisions(e.target.value)} />
            </div>
            <FieldError />
            <Button type="submit" variant="secondary">Save</Button>
          </form>
        </Card>
      )}

      {!isManager && (meeting.notes || meeting.decisions) && (
        <Card>
          <CardTitle>Notes &amp; decisions</CardTitle>
          {meeting.notes && <p className="mt-2 text-sm text-(--color-text-primary)">{meeting.notes}</p>}
          {meeting.decisions && <p className="mt-2 text-sm text-(--color-text-primary)">{meeting.decisions}</p>}
        </Card>
      )}
    </div>
  );
}
