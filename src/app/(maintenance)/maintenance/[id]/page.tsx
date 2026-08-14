"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useParams, useRouter } from "next/navigation";
import { ChevronLeft, Lock, MessageSquare, Paperclip } from "lucide-react";
import { useAuth } from "@/modules/auth/client";
import { apiClient, ApiError } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge, type BadgeVariant } from "@/components/ui/badge";
import { DataLabel } from "@/components/ui/typography";
import { DashboardPanel } from "@/components/dashboard-panel";
import { EmptyState } from "@/components/empty-state";
import { useToast } from "@/components/ui/toast";
import { AssignIssueModal } from "./assign-issue-modal";

type IssueStatus = "SUBMITTED" | "ACKNOWLEDGED" | "ASSIGNED" | "IN_PROGRESS" | "RESOLVED" | "VERIFIED" | "CLOSED" | "REOPENED";

interface IssueDetail {
  id: string;
  category: string;
  location: string;
  description: string;
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  status: IssueStatus;
  requesterId: string;
  assigneeId: string | null;
  deadline: string | null;
  taskId: string | null;
  resolutionDetails: string | null;
  acknowledgedAt: string | null;
  resolvedAt: string | null;
  createdAt: string;
}

interface TaskSummary {
  id: string;
  deadline: string | null;
  reminderAt: string | null;
  escalatedAt: string | null;
}

interface UpdateComment {
  id: string;
  authorId: string;
  body: string;
  createdAt: string;
}

interface Attachment {
  id: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
}

const STATUS_BADGE: Record<IssueStatus, BadgeVariant> = {
  SUBMITTED: "neutral",
  ACKNOWLEDGED: "pending",
  ASSIGNED: "pending",
  IN_PROGRESS: "active",
  RESOLVED: "approved",
  VERIFIED: "approved",
  CLOSED: "archived",
  REOPENED: "rejected",
};

export default function MaintenanceIssueDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { accessToken, role, userId } = useAuth();
  const router = useRouter();
  const toast = useToast();

  const [issue, setIssue] = useState<IssueDetail | null>(null);
  const [task, setTask] = useState<TaskSummary | null>(null);
  const [updates, setUpdates] = useState<UpdateComment[]>([]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [loadState, setLoadState] = useState<"loading" | "ready" | "not_found" | "unauthorized" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [updateBody, setUpdateBody] = useState("");
  const [resolutionDetails, setResolutionDetails] = useState("");
  const [isActing, setIsActing] = useState(false);
  const [isAssignOpen, setIsAssignOpen] = useState(false);

  const isStaff = role === "SECRETARY" || role === "COORDINATOR";

  const load = useCallback(async () => {
    if (!accessToken || !id) return;
    setLoadState("loading");
    try {
      const result = await apiClient.get<{ issue: IssueDetail; attachments: Attachment[]; task: TaskSummary | null; updates: UpdateComment[] }>(
        `/api/maintenance/issues/${id}`,
        accessToken,
      );
      setIssue(result.issue);
      setAttachments(result.attachments);
      setTask(result.task);
      setUpdates(result.updates);
      setLoadState("ready");
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) setLoadState("not_found");
      else if (err instanceof ApiError && err.status === 403) setLoadState("unauthorized");
      else {
        setErrorMessage(err instanceof ApiError ? err.message : "Unable to load this issue.");
        setLoadState("error");
      }
    }
  }, [accessToken, id]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  async function runAction(path: string, body?: unknown) {
    if (!accessToken) return;
    setIsActing(true);
    try {
      await apiClient.post(path, body, accessToken);
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Action failed.");
    } finally {
      setIsActing(false);
    }
  }

  async function handleResolve(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!issue || !resolutionDetails.trim()) return;
    await runAction(`/api/maintenance/issues/${issue.id}/resolve`, { resolutionDetails: resolutionDetails.trim() });
    setResolutionDetails("");
  }

  async function handleAddUpdate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!issue || !updateBody.trim() || !accessToken) return;
    setIsActing(true);
    try {
      await apiClient.post(`/api/maintenance/issues/${issue.id}/updates`, { body: updateBody.trim() }, accessToken);
      setUpdateBody("");
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Unable to post update.");
    } finally {
      setIsActing(false);
    }
  }

  async function handleAttachmentUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file || !issue || !accessToken) return;
    setIsActing(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      await apiClient.upload(`/api/maintenance/issues/${issue.id}/attachments`, formData, accessToken);
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Unable to upload attachment.");
    } finally {
      setIsActing(false);
      event.target.value = "";
    }
  }

  if (loadState === "loading") {
    return <p className="text-sm text-(--color-text-secondary)">Loading issue…</p>;
  }
  if (loadState === "not_found") {
    return (
      <div className="space-y-4">
        <p className="text-sm text-(--color-danger)">This issue doesn&apos;t exist or has been removed.</p>
        <Button variant="secondary" onClick={() => router.push("/maintenance")}>
          Back to Maintenance
        </Button>
      </div>
    );
  }
  if (loadState === "unauthorized") {
    return (
      <Card>
        <EmptyState icon={Lock} message="You don't have access to this issue." />
      </Card>
    );
  }
  if (loadState === "error" || !issue) {
    return <p className="text-sm text-(--color-danger)">{errorMessage ?? "Something went wrong."}</p>;
  }

  const isComplainant = issue.requesterId === userId;
  const isAssignee = issue.assigneeId === userId;

  return (
    <div className="max-w-2xl space-y-6">
      <Link href="/maintenance" className="inline-flex items-center gap-1 text-sm font-medium text-(--color-accent) hover:underline">
        <ChevronLeft aria-hidden="true" size={16} strokeWidth={2} />
        Back to Maintenance
      </Link>

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold text-(--color-text-primary)">
            {issue.location}
          </h1>
          <p className="mt-1 text-sm text-(--color-text-secondary)">
            {issue.category.replace("_", " ")} · Priority: {issue.priority}
          </p>
        </div>
        <Badge variant={STATUS_BADGE[issue.status]}>{issue.status.replace("_", " ")}</Badge>
      </div>

      <Card>{issue.description}</Card>

      <Card className="space-y-2 text-sm text-(--color-text-secondary)">
        {task?.deadline && <p>Expected resolution: {new Date(task.deadline).toLocaleString()}</p>}
        {task?.escalatedAt && <p className="text-(--color-danger)">Escalated {new Date(task.escalatedAt).toLocaleString()}</p>}
        {issue.resolutionDetails && (
          <p>
            <span className="font-medium text-(--color-text-primary)">Resolution: </span>
            {issue.resolutionDetails}
          </p>
        )}
        <p>Reported {new Date(issue.createdAt).toLocaleString()}</p>
      </Card>

      {isStaff && (
        <Card>
          <DataLabel>Staff actions</DataLabel>
          <div className="mt-3 flex flex-wrap gap-2">
            {issue.status === "SUBMITTED" && (
              <Button type="button" variant="secondary" disabled={isActing} onClick={() => runAction(`/api/maintenance/issues/${issue.id}/acknowledge`)}>
                Acknowledge
              </Button>
            )}
            {(issue.status === "ACKNOWLEDGED" || issue.status === "REOPENED") && (
              <Button type="button" variant="secondary" disabled={isActing} onClick={() => setIsAssignOpen(true)}>
                Assign
              </Button>
            )}
            {(issue.status === "ASSIGNED" || issue.status === "IN_PROGRESS") && (
              <Button type="button" variant="secondary" disabled={isActing} onClick={() => setIsAssignOpen(true)}>
                Reassign
              </Button>
            )}
            {issue.status === "ASSIGNED" && (isAssignee || role === "SECRETARY") && (
              <Button type="button" variant="secondary" disabled={isActing} onClick={() => runAction(`/api/maintenance/issues/${issue.id}/start-progress`)}>
                Start Progress
              </Button>
            )}
            {issue.status === "VERIFIED" && (
              <Button type="button" variant="secondary" disabled={isActing} onClick={() => runAction(`/api/maintenance/issues/${issue.id}/close`)}>
                Close
              </Button>
            )}
          </div>

          {issue.status === "IN_PROGRESS" && (isAssignee || role === "SECRETARY") && (
            <form onSubmit={handleResolve} className="mt-4 space-y-2 border-t border-(--color-border) pt-4">
              <Label htmlFor="resolution-details">Resolve this issue</Label>
              <Textarea id="resolution-details" rows={3} value={resolutionDetails} onChange={(e) => setResolutionDetails(e.target.value)} placeholder="What was done to fix it?" />
              <Button type="submit" variant="primary" disabled={isActing || !resolutionDetails.trim()}>
                Mark Resolved
              </Button>
            </form>
          )}
        </Card>
      )}

      {(isComplainant || role === "SECRETARY") && issue.status === "RESOLVED" && (
        <Card>
          <DataLabel>Confirm resolution</DataLabel>
          <p className="mt-1 text-sm text-(--color-text-secondary)">Is this issue actually fixed?</p>
          <div className="mt-3 flex gap-2">
            <Button type="button" variant="primary" disabled={isActing} onClick={() => runAction(`/api/maintenance/issues/${issue.id}/confirm`)}>
              Confirm Resolved
            </Button>
            <Button type="button" variant="destructive" disabled={isActing} onClick={() => runAction(`/api/maintenance/issues/${issue.id}/reopen`)}>
              Reopen
            </Button>
          </div>
        </Card>
      )}

      {(isComplainant || isStaff) && (issue.status === "VERIFIED" || issue.status === "CLOSED") && (
        <Card>
          <DataLabel>Reopen</DataLabel>
          <p className="mt-1 text-sm text-(--color-text-secondary)">Still having this problem?</p>
          <Button type="button" variant="secondary" className="mt-3" disabled={isActing} onClick={() => runAction(`/api/maintenance/issues/${issue.id}/reopen`)}>
            Reopen Issue
          </Button>
        </Card>
      )}

      <DashboardPanel title="Attachments" icon={Paperclip}>
        {attachments.length === 0 ? (
          <EmptyState icon={Paperclip} message="No photos or attachments yet." />
        ) : (
          <ul className="space-y-1">
            {attachments.map((a) => (
              <li key={a.id}>
                <a
                  href={`/api/maintenance/attachments/${a.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-(--color-accent) hover:underline"
                >
                  {a.mimeType} ({Math.round(a.sizeBytes / 1024)} KB)
                </a>
              </li>
            ))}
          </ul>
        )}
        <div className="mt-4">
          <Label htmlFor="attachment-upload">Add a photo or file</Label>
          <input
            id="attachment-upload"
            type="file"
            accept="image/jpeg,image/png,application/pdf"
            onChange={handleAttachmentUpload}
            disabled={isActing}
            className="mt-1 block w-full text-sm text-(--color-text-secondary)"
          />
        </div>
      </DashboardPanel>

      <DashboardPanel title="Updates" icon={MessageSquare}>
        {updates.length === 0 ? (
          <EmptyState icon={MessageSquare} message={issue.taskId ? "No updates yet." : "Updates are available once this issue is assigned."} />
        ) : (
          <ul className="space-y-3">
            {updates.map((update) => (
              <li key={update.id} className="border-b border-(--color-border) pb-3 last:border-0 last:pb-0">
                <p className="text-sm text-(--color-text-primary)">{update.body}</p>
                <p className="mt-1 text-xs text-(--color-text-secondary)">
                  {update.authorId === userId ? "You" : "—"} · {new Date(update.createdAt).toLocaleString()}
                </p>
              </li>
            ))}
          </ul>
        )}

        {issue.taskId && (
          <form onSubmit={handleAddUpdate} className="mt-4 space-y-2">
            <Label htmlFor="update-body">Post an update</Label>
            <Textarea id="update-body" rows={2} value={updateBody} onChange={(e) => setUpdateBody(e.target.value)} />
            <Button type="submit" variant="secondary" disabled={isActing || !updateBody.trim()}>
              Post
            </Button>
          </form>
        )}
      </DashboardPanel>

      <AssignIssueModal
        isOpen={isAssignOpen}
        onClose={() => setIsAssignOpen(false)}
        accessToken={accessToken}
        issueId={issue.id}
        isReassign={issue.status === "ASSIGNED" || issue.status === "IN_PROGRESS"}
        onAssigned={() => {
          toast.success("Issue assigned.");
          void load();
        }}
      />
    </div>
  );
}
