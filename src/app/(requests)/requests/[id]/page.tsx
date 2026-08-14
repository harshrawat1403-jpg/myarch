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
import { AssignRequestModal } from "./assign-request-modal";

type RequestStatus = "SUBMITTED" | "REVIEW" | "ASSIGNED" | "IN_PROGRESS" | "COMPLETED" | "CLOSED";

interface RequestDetail {
  id: string;
  type: string;
  description: string;
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  status: RequestStatus;
  requesterId: string;
  ownerId: string | null;
  deadline: string | null;
  taskId: string | null;
  decision: "APPROVED" | "REJECTED" | null;
  decisionReason: string | null;
  decidedAt: string | null;
  createdAt: string;
}

interface TaskSummary {
  id: string;
  deadline: string | null;
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

const STATUS_BADGE: Record<RequestStatus, BadgeVariant> = {
  SUBMITTED: "neutral",
  REVIEW: "pending",
  ASSIGNED: "pending",
  IN_PROGRESS: "active",
  COMPLETED: "approved",
  CLOSED: "archived",
};

export default function RequestDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { accessToken, role, userId } = useAuth();
  const router = useRouter();
  const toast = useToast();

  const [request, setRequest] = useState<RequestDetail | null>(null);
  const [task, setTask] = useState<TaskSummary | null>(null);
  const [updates, setUpdates] = useState<UpdateComment[]>([]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [loadState, setLoadState] = useState<"loading" | "ready" | "not_found" | "unauthorized" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [updateBody, setUpdateBody] = useState("");
  const [decisionReason, setDecisionReason] = useState("");
  const [isActing, setIsActing] = useState(false);
  const [isAssignOpen, setIsAssignOpen] = useState(false);

  const isStaff = role === "SECRETARY" || role === "COORDINATOR";

  const load = useCallback(async () => {
    if (!accessToken || !id) return;
    setLoadState("loading");
    try {
      const result = await apiClient.get<{ request: RequestDetail; attachments: Attachment[]; task: TaskSummary | null; updates: UpdateComment[] }>(
        `/api/requests/${id}`,
        accessToken,
      );
      setRequest(result.request);
      setAttachments(result.attachments);
      setTask(result.task);
      setUpdates(result.updates);
      setLoadState("ready");
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) setLoadState("not_found");
      else if (err instanceof ApiError && err.status === 403) setLoadState("unauthorized");
      else {
        setErrorMessage(err instanceof ApiError ? err.message : "Unable to load this request.");
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

  async function handleDecide(decision: "APPROVED" | "REJECTED") {
    if (!request) return;
    await runAction(`/api/requests/${request.id}/decide`, { decision, decisionReason: decisionReason.trim() || undefined });
    setDecisionReason("");
  }

  async function handleAddUpdate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!request || !updateBody.trim() || !accessToken) return;
    setIsActing(true);
    try {
      await apiClient.post(`/api/requests/${request.id}/updates`, { body: updateBody.trim() }, accessToken);
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
    if (!file || !request || !accessToken) return;
    setIsActing(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      await apiClient.upload(`/api/requests/${request.id}/attachments`, formData, accessToken);
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Unable to upload attachment.");
    } finally {
      setIsActing(false);
      event.target.value = "";
    }
  }

  if (loadState === "loading") {
    return <p className="text-sm text-(--color-text-secondary)">Loading request…</p>;
  }
  if (loadState === "not_found") {
    return (
      <div className="space-y-4">
        <p className="text-sm text-(--color-danger)">This request doesn&apos;t exist or has been removed.</p>
        <Button variant="secondary" onClick={() => router.push("/requests")}>
          Back to Requests
        </Button>
      </div>
    );
  }
  if (loadState === "unauthorized") {
    return (
      <Card>
        <EmptyState icon={Lock} message="You don't have access to this request." />
      </Card>
    );
  }
  if (loadState === "error" || !request) {
    return <p className="text-sm text-(--color-danger)">{errorMessage ?? "Something went wrong."}</p>;
  }

  return (
    <div className="max-w-2xl space-y-6">
      <Link href="/requests" className="inline-flex items-center gap-1 text-sm font-medium text-(--color-accent) hover:underline">
        <ChevronLeft aria-hidden="true" size={16} strokeWidth={2} />
        Back to Requests
      </Link>

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold text-(--color-text-primary)">
            {request.type}
          </h1>
          <p className="mt-1 text-sm text-(--color-text-secondary)">Priority: {request.priority}</p>
        </div>
        <Badge variant={STATUS_BADGE[request.status]}>{request.status.replace("_", " ")}</Badge>
      </div>

      <Card>{request.description}</Card>

      <Card className="space-y-2 text-sm text-(--color-text-secondary)">
        {task?.deadline && <p>Deadline: {new Date(task.deadline).toLocaleString()}</p>}
        {task?.escalatedAt && <p className="text-(--color-danger)">Escalated {new Date(task.escalatedAt).toLocaleString()}</p>}
        {request.decision && (
          <p>
            <span className="font-medium text-(--color-text-primary)">Decision: </span>
            {request.decision}
            {request.decisionReason ? ` — ${request.decisionReason}` : ""}
          </p>
        )}
        <p>Submitted {new Date(request.createdAt).toLocaleString()}</p>
      </Card>

      {isStaff && (
        <Card>
          <DataLabel>Staff actions</DataLabel>
          <div className="mt-3 flex flex-wrap gap-2">
            {request.status === "SUBMITTED" && (
              <Button type="button" variant="secondary" disabled={isActing} onClick={() => runAction(`/api/requests/${request.id}/review`)}>
                Start Review
              </Button>
            )}
            {request.status === "REVIEW" && !request.decision && (
              <>
                <Button type="button" variant="primary" disabled={isActing} onClick={() => handleDecide("APPROVED")}>
                  Approve
                </Button>
                <Button type="button" variant="destructive" disabled={isActing} onClick={() => handleDecide("REJECTED")}>
                  Reject
                </Button>
              </>
            )}
            {request.status === "REVIEW" && request.decision === "APPROVED" && (
              <Button type="button" variant="secondary" disabled={isActing} onClick={() => setIsAssignOpen(true)}>
                Assign Owner
              </Button>
            )}
            {(request.status === "ASSIGNED" || request.status === "IN_PROGRESS") && (
              <Button type="button" variant="secondary" disabled={isActing} onClick={() => setIsAssignOpen(true)}>
                Reassign
              </Button>
            )}
            {request.status === "ASSIGNED" && (request.ownerId === userId || role === "SECRETARY") && (
              <Button type="button" variant="secondary" disabled={isActing} onClick={() => runAction(`/api/requests/${request.id}/start-progress`)}>
                Start Progress
              </Button>
            )}
            {request.status === "IN_PROGRESS" && (request.ownerId === userId || role === "SECRETARY") && (
              <Button type="button" variant="secondary" disabled={isActing} onClick={() => runAction(`/api/requests/${request.id}/complete`)}>
                Mark Completed
              </Button>
            )}
            {request.status === "COMPLETED" && (
              <Button type="button" variant="secondary" disabled={isActing} onClick={() => runAction(`/api/requests/${request.id}/close`)}>
                Close
              </Button>
            )}
          </div>

          {request.status === "REVIEW" && !request.decision && (
            <div className="mt-4 border-t border-(--color-border) pt-4">
              <Label htmlFor="decision-reason">Reason (optional, shown to the requester if declined)</Label>
              <Textarea id="decision-reason" rows={2} value={decisionReason} onChange={(e) => setDecisionReason(e.target.value)} />
            </div>
          )}
        </Card>
      )}

      <DashboardPanel title="Attachments" icon={Paperclip}>
        {attachments.length === 0 ? (
          <EmptyState icon={Paperclip} message="No attachments yet." />
        ) : (
          <ul className="space-y-1">
            {attachments.map((a) => (
              <li key={a.id}>
                <a href={`/api/requests/attachments/${a.id}`} target="_blank" rel="noopener noreferrer" className="text-sm text-(--color-accent) hover:underline">
                  {a.mimeType} ({Math.round(a.sizeBytes / 1024)} KB)
                </a>
              </li>
            ))}
          </ul>
        )}
        <div className="mt-4">
          <Label htmlFor="attachment-upload">Add a file</Label>
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
          <EmptyState icon={MessageSquare} message={request.taskId ? "No updates yet." : "Updates are available once this request is assigned."} />
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

        {request.taskId && (
          <form onSubmit={handleAddUpdate} className="mt-4 space-y-2">
            <Label htmlFor="update-body">Post an update</Label>
            <Textarea id="update-body" rows={2} value={updateBody} onChange={(e) => setUpdateBody(e.target.value)} />
            <Button type="submit" variant="secondary" disabled={isActing || !updateBody.trim()}>
              Post
            </Button>
          </form>
        )}
      </DashboardPanel>

      <AssignRequestModal
        isOpen={isAssignOpen}
        onClose={() => setIsAssignOpen(false)}
        accessToken={accessToken}
        requestId={request.id}
        isReassign={request.status === "ASSIGNED" || request.status === "IN_PROGRESS"}
        onAssigned={() => {
          toast.success("Request assigned.");
          void load();
        }}
      />
    </div>
  );
}
