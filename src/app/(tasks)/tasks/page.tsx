"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { AlertTriangle, ListTodo, Plus } from "lucide-react";
import { useAuth } from "@/modules/auth/client";
import { apiClient, ApiError } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge, type BadgeVariant } from "@/components/ui/badge";
import { CardTitle } from "@/components/ui/typography";
import { EmptyState } from "@/components/empty-state";
import { useToast } from "@/components/ui/toast";
import { CreateTaskModal } from "./create-task-modal";

interface TaskListItem {
  id: string;
  title: string;
  status: "TODO" | "IN_PROGRESS" | "BLOCKED" | "DONE" | "CANCELLED";
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  ownerId: string;
  creatorId: string;
  deadline: string | null;
  createdAt: string;
}

const STATUS_BADGE: Record<TaskListItem["status"], BadgeVariant> = {
  TODO: "neutral",
  IN_PROGRESS: "active",
  BLOCKED: "pending",
  DONE: "approved",
  CANCELLED: "rejected",
};

const PAGE_SIZE = 20;

function isTaskOverdue(deadline: string | null, status: TaskListItem["status"]): boolean {
  if (!deadline || status === "DONE" || status === "CANCELLED") return false;
  return new Date(deadline).getTime() < Date.now();
}

/** MYARCH Phase 2 (§3.8) — filters/sorts/paginates server-side via SearchTasksUseCase, which itself scopes results by role (Secretary: all; Coordinator: owned/created; Student: owned only). */
export default function TasksListPage() {
  const { accessToken, role, userId } = useAuth();
  const toast = useToast();

  const [tasks, setTasks] = useState<TaskListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const [overdueOnly, setOverdueOnly] = useState(false);
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
      if (overdueOnly) params.set("overdueOnly", "true");
      params.set("page", String(page));
      params.set("pageSize", String(PAGE_SIZE));
      const res = await apiClient.getWithMeta<TaskListItem[], { total: number }>(
        `/api/tasks?${params.toString()}`,
        accessToken,
      );
      setTasks(res.data);
      setTotal(res.meta.total);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Unable to load tasks.");
    } finally {
      setIsLoading(false);
    }
  }, [accessToken, status, overdueOnly, page]);

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
            Tasks
          </h1>
          <p className="mt-1 text-sm text-(--color-text-secondary)">
            {role === "STUDENT" ? "Tasks assigned to you." : "Tasks you own or created."}
          </p>
        </div>
        {canCreate && (
          <Button type="button" variant="primary" onClick={() => setIsCreateOpen(true)} className="gap-2">
            <Plus aria-hidden="true" size={16} strokeWidth={1.75} />
            New Task
          </Button>
        )}
      </div>

      <Card>
        <form onSubmit={handleFilterSubmit} className="flex flex-wrap items-end gap-4">
          <div className="min-w-40">
            <Label htmlFor="filter-status">Status</Label>
            <Select id="filter-status" value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">All statuses</option>
              <option value="TODO">To do</option>
              <option value="IN_PROGRESS">In progress</option>
              <option value="BLOCKED">Blocked</option>
              <option value="DONE">Done</option>
              <option value="CANCELLED">Cancelled</option>
            </Select>
          </div>
          <Checkbox
            id="filter-overdue"
            label="Overdue only"
            checked={overdueOnly}
            onChange={(e) => setOverdueOnly(e.target.checked)}
          />
          <Button type="submit" variant="secondary">
            Apply
          </Button>
        </form>
      </Card>

      {/* Unauthorized state: Recruiter/Alumni are blocked from this route
          group entirely by the layout's useRequireRole, so a 403 here would
          only ever mean a stale/expired session — treated the same as any
          other load error rather than a distinct code path. */}
      {error && <p className="text-sm text-(--color-danger)">{error}</p>}
      {isLoading && <p className="text-sm text-(--color-text-secondary)">Loading tasks…</p>}

      {!isLoading && !error && tasks.length === 0 && (
        <Card>
          <EmptyState icon={ListTodo} message="No tasks match these filters." />
        </Card>
      )}

      {!isLoading && !error && tasks.length > 0 && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {tasks.map((task) => {
            const isOverdue = isTaskOverdue(task.deadline, task.status);
            return (
              <Card key={task.id} className="transition-shadow duration-150 hover:shadow-md">
                <div className="flex items-start justify-between gap-2">
                  <Link href={`/tasks/${task.id}`}>
                    <CardTitle className="text-(--color-accent)">{task.title}</CardTitle>
                  </Link>
                  <Badge variant={STATUS_BADGE[task.status]}>{task.status.replace("_", " ")}</Badge>
                </div>
                <p className="mt-2 text-xs text-(--color-text-secondary)">
                  Priority: {task.priority}
                  {task.ownerId === userId ? " · Assigned to you" : ""}
                </p>
                {task.deadline && (
                  <p className={`mt-1 flex items-center gap-1 text-xs ${isOverdue ? "text-(--color-danger)" : "text-(--color-text-secondary)"}`}>
                    {isOverdue && <AlertTriangle aria-hidden="true" size={12} strokeWidth={2} />}
                    Due {new Date(task.deadline).toLocaleDateString()}
                  </p>
                )}
              </Card>
            );
          })}
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

      <CreateTaskModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        accessToken={accessToken}
        role={role}
        onCreated={() => {
          toast.success("Task created.");
          void load();
        }}
      />
    </div>
  );
}
