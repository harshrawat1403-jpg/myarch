"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useParams, useRouter } from "next/navigation";
import { ChevronLeft, Lock, MessageSquare } from "lucide-react";
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

type TaskStatus = "TODO" | "IN_PROGRESS" | "BLOCKED" | "DONE" | "CANCELLED";

interface TaskDetail {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  ownerId: string;
  creatorId: string;
  deadline: string | null;
  reminderAt: string | null;
  escalatedAt: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
  createdAt: string;
}

interface TaskComment {
  id: string;
  authorId: string;
  body: string;
  createdAt: string;
}

const STATUS_BADGE: Record<TaskStatus, BadgeVariant> = {
  TODO: "neutral",
  IN_PROGRESS: "active",
  BLOCKED: "pending",
  DONE: "approved",
  CANCELLED: "rejected",
};

const FORWARD_TRANSITIONS: Record<TaskStatus, TaskStatus[]> = {
  TODO: ["IN_PROGRESS", "BLOCKED", "CANCELLED"],
  IN_PROGRESS: ["BLOCKED", "DONE", "CANCELLED"],
  BLOCKED: ["IN_PROGRESS", "CANCELLED"],
  DONE: [],
  CANCELLED: [],
};

const STATUS_LABEL: Record<TaskStatus, string> = {
  TODO: "To do",
  IN_PROGRESS: "In progress",
  BLOCKED: "Blocked",
  DONE: "Done",
  CANCELLED: "Cancelled",
};

export default function TaskDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { accessToken, role, userId } = useAuth();
  const router = useRouter();
  const toast = useToast();

  const [task, setTask] = useState<TaskDetail | null>(null);
  const [comments, setComments] = useState<TaskComment[]>([]);
  const [loadState, setLoadState] = useState<"loading" | "ready" | "not_found" | "unauthorized" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [commentBody, setCommentBody] = useState("");
  const [isCommenting, setIsCommenting] = useState(false);
  const [isActing, setIsActing] = useState(false);

  const load = useCallback(async () => {
    if (!accessToken || !id) return;
    setLoadState("loading");
    try {
      const result = await apiClient.get<{ task: TaskDetail; comments: TaskComment[] }>(`/api/tasks/${id}`, accessToken);
      setTask(result.task);
      setComments(result.comments);
      setLoadState("ready");
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        setLoadState("not_found");
      } else if (err instanceof ApiError && err.status === 403) {
        setLoadState("unauthorized");
      } else {
        setErrorMessage(err instanceof ApiError ? err.message : "Unable to load this task.");
        setLoadState("error");
      }
    }
  }, [accessToken, id]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const canManage = task !== null && (role === "SECRETARY" || (role === "COORDINATOR" && (task.ownerId === userId || task.creatorId === userId)));
  const canUpdateOwnStatus = task !== null && role === "STUDENT" && task.ownerId === userId;

  async function handleSetStatus(status: TaskStatus) {
    if (!task || !accessToken) return;
    setIsActing(true);
    try {
      await apiClient.patch(`/api/tasks/${task.id}/status`, { status }, accessToken);
      toast.success(`Task marked ${STATUS_LABEL[status].toLowerCase()}.`);
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Unable to update status.");
    } finally {
      setIsActing(false);
    }
  }

  async function handleReopen() {
    if (!task || !accessToken) return;
    setIsActing(true);
    try {
      await apiClient.post(`/api/tasks/${task.id}/reopen`, undefined, accessToken);
      toast.success("Task reopened.");
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Unable to reopen this task.");
    } finally {
      setIsActing(false);
    }
  }

  async function handleEscalate() {
    if (!task || !accessToken) return;
    setIsActing(true);
    try {
      await apiClient.post(`/api/tasks/${task.id}/escalate`, undefined, accessToken);
      toast.success("Task escalated to the Technical Secretary.");
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Unable to escalate this task.");
    } finally {
      setIsActing(false);
    }
  }

  async function handleAddComment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!task || !accessToken || !commentBody.trim()) return;
    setIsCommenting(true);
    try {
      await apiClient.post(`/api/tasks/${task.id}/comments`, { body: commentBody.trim() }, accessToken);
      setCommentBody("");
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Unable to add comment.");
    } finally {
      setIsCommenting(false);
    }
  }

  if (loadState === "loading") {
    return <p className="text-sm text-(--color-text-secondary)">Loading task…</p>;
  }

  if (loadState === "not_found") {
    return (
      <div className="space-y-4">
        <p className="text-sm text-(--color-danger)">This task doesn&apos;t exist or has been removed.</p>
        <Button variant="secondary" onClick={() => router.push("/tasks")}>
          Back to Tasks
        </Button>
      </div>
    );
  }

  if (loadState === "unauthorized") {
    return (
      <Card>
        <EmptyState icon={Lock} message="You don't have access to this task." />
      </Card>
    );
  }

  if (loadState === "error" || !task) {
    return <p className="text-sm text-(--color-danger)">{errorMessage ?? "Something went wrong."}</p>;
  }

  return (
    <div className="max-w-2xl space-y-6">
      <Link href="/tasks" className="inline-flex items-center gap-1 text-sm font-medium text-(--color-accent) hover:underline">
        <ChevronLeft aria-hidden="true" size={16} strokeWidth={2} />
        Back to Tasks
      </Link>

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold text-(--color-text-primary)">
            {task.title}
          </h1>
          <p className="mt-1 text-sm text-(--color-text-secondary)">Priority: {task.priority}</p>
        </div>
        <Badge variant={STATUS_BADGE[task.status]}>{STATUS_LABEL[task.status]}</Badge>
      </div>

      {task.description && <Card>{task.description}</Card>}

      <Card className="space-y-2 text-sm text-(--color-text-secondary)">
        {task.deadline && <p>Deadline: {new Date(task.deadline).toLocaleString()}</p>}
        {task.escalatedAt && <p className="text-(--color-danger)">Escalated {new Date(task.escalatedAt).toLocaleString()}</p>}
        {task.completedAt && <p>Completed {new Date(task.completedAt).toLocaleString()}</p>}
        {task.cancelledAt && <p>Cancelled {new Date(task.cancelledAt).toLocaleString()}</p>}
        <p>Created {new Date(task.createdAt).toLocaleString()}</p>
      </Card>

      {(canManage || canUpdateOwnStatus) && FORWARD_TRANSITIONS[task.status].length > 0 && (
        <Card>
          <DataLabel>Update status</DataLabel>
          <div className="mt-3 flex flex-wrap gap-2">
            {FORWARD_TRANSITIONS[task.status]
              .filter((next) => canManage || next !== "CANCELLED")
              .map((next) => (
                <Button
                  key={next}
                  type="button"
                  variant={next === "CANCELLED" ? "destructive" : "secondary"}
                  disabled={isActing}
                  onClick={() => handleSetStatus(next)}
                >
                  {STATUS_LABEL[next]}
                </Button>
              ))}
          </div>
        </Card>
      )}

      {canManage && (task.status === "DONE" || task.status === "CANCELLED") && (
        <Card>
          <DataLabel>Reopen</DataLabel>
          <p className="mt-1 text-sm text-(--color-text-secondary)">Move this task back to To do.</p>
          <Button type="button" variant="secondary" className="mt-3" disabled={isActing} onClick={handleReopen}>
            Reopen Task
          </Button>
        </Card>
      )}

      {canManage && task.status !== "DONE" && task.status !== "CANCELLED" && !task.escalatedAt && (
        <Card>
          <DataLabel>Escalate</DataLabel>
          <p className="mt-1 text-sm text-(--color-text-secondary)">Notify the Technical Secretary about this task.</p>
          <Button type="button" variant="secondary" className="mt-3" disabled={isActing} onClick={handleEscalate}>
            Escalate to Secretary
          </Button>
        </Card>
      )}

      <DashboardPanel title="Comments" icon={MessageSquare}>
        {comments.length === 0 ? (
          <EmptyState icon={MessageSquare} message="No comments yet." />
        ) : (
          <ul className="space-y-3">
            {comments.map((comment) => (
              <li key={comment.id} className="border-b border-(--color-border) pb-3 last:border-0 last:pb-0">
                <p className="text-sm text-(--color-text-primary)">{comment.body}</p>
                <p className="mt-1 text-xs text-(--color-text-secondary)">
                  {comment.authorId === userId ? "You" : "—"} · {new Date(comment.createdAt).toLocaleString()}
                </p>
              </li>
            ))}
          </ul>
        )}

        <form onSubmit={handleAddComment} className="mt-4 space-y-2">
          <Label htmlFor="comment-body">Add an update</Label>
          <Textarea
            id="comment-body"
            rows={2}
            value={commentBody}
            onChange={(e) => setCommentBody(e.target.value)}
          />
          <Button type="submit" variant="secondary" disabled={isCommenting || !commentBody.trim()}>
            {isCommenting ? "Posting…" : "Post"}
          </Button>
        </form>
      </DashboardPanel>
    </div>
  );
}
