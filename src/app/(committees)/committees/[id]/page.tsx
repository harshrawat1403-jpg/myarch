"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { useAuth } from "@/modules/auth/client";
import { apiClient, ApiError } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Label, FieldError } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { CardTitle, PageTitle } from "@/components/ui/typography";
import { useToast } from "@/components/ui/toast";
import { COMMITTEE_STATUS_BADGE } from "@/design-system/status-badges";

interface CommitteeMembershipDto {
  id: string;
  userId: string;
  position: string | null;
  isLead: boolean;
  isActive: boolean;
  startDate: string;
  endDate: string | null;
}

interface CommitteeDetailDto {
  committee: {
    id: string;
    name: string;
    type: string;
    status: "ACTIVE" | "ARCHIVED";
    academicYear: string | null;
    responsibilities: string | null;
  };
  memberships: CommitteeMembershipDto[];
  attachments: { id: string; mimeType: string; sizeBytes: number; createdAt: string }[];
}

interface RelatedMeeting {
  id: string;
  title: string;
  status: string;
  startAt: string;
}

interface RelatedTask {
  id: string;
  title: string;
  status: string;
  deadline: string | null;
}

interface HistoryEntry {
  id: string;
  action: string;
  occurredAt: string;
}

const TYPE_LABELS: Record<string, string> = {
  STUDENT_COUNCIL: "Student Council",
  CORE_COMMITTEE: "Core Committee",
  EVENT_COMMITTEE: "Event Committee",
  TECHNICAL_COMMITTEE: "Technical Committee",
  PROJECT_TEAM: "Project Team",
  TEMPORARY_COMMITTEE: "Temporary Committee",
};

export default function CommitteeDetailPage() {
  const params = useParams<{ id: string }>();
  const committeeId = params.id;
  const { accessToken, userId, role } = useAuth();
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [detail, setDetail] = useState<CommitteeDetailDto | null>(null);
  const [meetings, setMeetings] = useState<RelatedMeeting[]>([]);
  const [tasks, setTasks] = useState<RelatedTask[]>([]);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [memberUserId, setMemberUserId] = useState("");
  const [memberPosition, setMemberPosition] = useState("");
  const [memberIsLead, setMemberIsLead] = useState(false);

  const load = useCallback(async () => {
    if (!accessToken || !committeeId) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await apiClient.get<CommitteeDetailDto>(`/api/committees/${committeeId}`, accessToken);
      setDetail(res);
      const [meetingRes, taskRes, historyRes] = await Promise.all([
        apiClient.get<RelatedMeeting[]>(`/api/meetings?committeeId=${committeeId}`, accessToken),
        apiClient.get<RelatedTask[]>(`/api/tasks?relatedEntityType=Committee&relatedEntityId=${committeeId}`, accessToken),
        apiClient.get<HistoryEntry[]>(`/api/committees/${committeeId}/history`, accessToken),
      ]);
      setMeetings(meetingRes);
      setTasks(taskRes);
      setHistory(historyRes);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Unable to load this committee.");
    } finally {
      setIsLoading(false);
    }
  }, [accessToken, committeeId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  if (isLoading) return <p className="text-sm text-(--color-text-secondary)">Loading committee…</p>;
  if (error || !detail) return <p className="text-sm text-(--color-danger)">{error ?? "Committee not found."}</p>;

  const { committee, memberships, attachments } = detail;
  // Server re-checks canManageCommittee on every action regardless — this
  // only decides whether to show manager controls. A delegated Coordinator
  // with committees.manage but no personal isLead membership simply won't
  // see them here (an under- not over-permissive UI gap, harmless since the
  // API itself is the real gate) — same honest tradeoff Meeting's own
  // isManager client-side check documents.
  const isManager =
    role === "SECRETARY" || memberships.some((m) => m.userId === userId && m.isActive && m.isLead);
  const activeMembers = memberships.filter((m) => m.isActive);
  const formerMembers = memberships.filter((m) => !m.isActive);

  async function runAction(action: () => Promise<unknown>, successMessage: string) {
    try {
      await action();
      toast.success(successMessage);
      void load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Action failed.");
    }
  }

  async function handleAddMember(e: FormEvent) {
    e.preventDefault();
    if (!memberUserId.trim()) return;
    await runAction(
      () =>
        apiClient.post(
          `/api/committees/${committeeId}/members`,
          { userId: memberUserId.trim(), position: memberPosition || undefined, isLead: memberIsLead },
          accessToken ?? undefined,
        ),
      "Member added.",
    );
    setMemberUserId("");
    setMemberPosition("");
    setMemberIsLead(false);
  }

  async function handleUploadDocument() {
    const file = fileInputRef.current?.files?.[0];
    if (!file || !accessToken) return;
    const formData = new FormData();
    formData.append("file", file);
    try {
      await apiClient.upload(`/api/committees/${committeeId}/attachments`, formData, accessToken);
      toast.success("Document uploaded.");
      if (fileInputRef.current) fileInputRef.current.value = "";
      void load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Unable to upload this document.");
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <PageTitle className="font-semibold">{committee.name}</PageTitle>
          <p className="mt-1 text-sm text-(--color-text-secondary)">
            {TYPE_LABELS[committee.type] ?? committee.type}
            {committee.academicYear ? ` · ${committee.academicYear}` : ""}
          </p>
        </div>
        <Badge variant={COMMITTEE_STATUS_BADGE[committee.status]}>{committee.status}</Badge>
      </div>

      {committee.responsibilities && (
        <Card>
          <CardTitle>Responsibilities</CardTitle>
          <p className="mt-1 text-sm text-(--color-text-primary)">{committee.responsibilities}</p>
        </Card>
      )}

      {isManager && committee.status === "ACTIVE" && (
        <div className="flex flex-wrap gap-3">
          <Button
            type="button"
            variant="secondary"
            onClick={() =>
              runAction(() => apiClient.post(`/api/committees/${committeeId}/archive`, undefined, accessToken ?? undefined), "Committee archived.")
            }
          >
            Archive Committee
          </Button>
        </div>
      )}

      <Card>
        <CardTitle>Members ({activeMembers.length})</CardTitle>
        <ul className="mt-2 space-y-1 text-sm text-(--color-text-secondary)">
          {activeMembers.map((m) => (
            <li key={m.id} className="flex items-center justify-between gap-2">
              <span>
                {m.userId} {m.position ? `— ${m.position}` : ""} {m.isLead ? <Badge variant="active">Lead</Badge> : null}
              </span>
              {isManager && (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() =>
                    runAction(
                      () => apiClient.delete(`/api/committees/${committeeId}/members/${m.id}`, accessToken ?? undefined),
                      "Membership ended.",
                    )
                  }
                >
                  End membership
                </Button>
              )}
            </li>
          ))}
          {activeMembers.length === 0 && <li>No active members yet.</li>}
        </ul>

        {formerMembers.length > 0 && (
          <details className="mt-4">
            <summary className="cursor-pointer text-xs font-medium text-(--color-text-secondary)">
              Former members ({formerMembers.length})
            </summary>
            <ul className="mt-2 space-y-1 text-sm text-(--color-text-secondary)">
              {formerMembers.map((m) => (
                <li key={m.id}>
                  {m.userId} {m.position ? `— ${m.position}` : ""}
                </li>
              ))}
            </ul>
          </details>
        )}

        {isManager && (
          <form onSubmit={handleAddMember} className="mt-4 flex flex-wrap items-end gap-3">
            <div className="min-w-56">
              <Label htmlFor="committee-member-user-id">User ID</Label>
              <Input id="committee-member-user-id" value={memberUserId} onChange={(e) => setMemberUserId(e.target.value)} placeholder="user UUID" />
            </div>
            <div className="min-w-40">
              <Label htmlFor="committee-member-position">Position (optional)</Label>
              <Input id="committee-member-position" value={memberPosition} onChange={(e) => setMemberPosition(e.target.value)} placeholder="President" />
            </div>
            <Checkbox
              id="committee-member-is-lead"
              label="Lead (can manage this committee)"
              checked={memberIsLead}
              onChange={() => setMemberIsLead((v) => !v)}
            />
            <Button type="submit" variant="secondary">Add</Button>
          </form>
        )}
      </Card>

      <Card>
        <CardTitle>Meetings ({meetings.length})</CardTitle>
        <p className="mt-1 text-xs text-(--color-text-secondary)">Tracked via the shared Meetings module.</p>
        <ul className="mt-2 space-y-1 text-sm">
          {meetings.map((meeting) => (
            <li key={meeting.id}>
              <Link href={`/meetings/${meeting.id}`} className="text-(--color-accent) hover:underline">
                {meeting.title}
              </Link>{" "}
              <span className="text-xs text-(--color-text-secondary)">
                ({meeting.status} · {new Date(meeting.startAt).toLocaleDateString()})
              </span>
            </li>
          ))}
          {meetings.length === 0 && <li className="text-(--color-text-secondary)">No meetings yet.</li>}
        </ul>
        {isManager && (
          <Link href="/meetings" className="mt-3 inline-block text-xs font-medium text-(--color-accent) hover:underline">
            Schedule a meeting →
          </Link>
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
        {(role === "SECRETARY" || role === "COORDINATOR") && (
          <Link href="/tasks" className="mt-3 inline-block text-xs font-medium text-(--color-accent) hover:underline">
            Create an action item →
          </Link>
        )}
      </Card>

      <Card>
        <CardTitle>Documents ({attachments.length})</CardTitle>
        <ul className="mt-2 space-y-1 text-sm">
          {attachments.map((a) => (
            <li key={a.id}>
              <a href={`/api/committees/attachments/${a.id}`} className="text-(--color-accent) hover:underline" target="_blank" rel="noreferrer">
                Document
              </a>{" "}
              <span className="text-xs text-(--color-text-secondary)">({Math.ceil(a.sizeBytes / 1024)} KB)</span>
            </li>
          ))}
          {attachments.length === 0 && <li className="text-(--color-text-secondary)">No documents yet.</li>}
        </ul>
        {isManager && (
          <div className="mt-4 flex flex-wrap items-end gap-3">
            <input ref={fileInputRef} type="file" accept=".pdf,.jpg,.jpeg,.png" aria-label="Document" />
            <Button type="button" variant="secondary" onClick={handleUploadDocument}>
              Upload
            </Button>
            <FieldError />
          </div>
        )}
      </Card>

      <Card>
        <CardTitle>Activity history</CardTitle>
        <ul className="mt-2 space-y-1 text-sm text-(--color-text-secondary)">
          {history.map((entry) => (
            <li key={entry.id}>
              {entry.action} — {new Date(entry.occurredAt).toLocaleString()}
            </li>
          ))}
          {history.length === 0 && <li>No activity recorded yet.</li>}
        </ul>
      </Card>
    </div>
  );
}
