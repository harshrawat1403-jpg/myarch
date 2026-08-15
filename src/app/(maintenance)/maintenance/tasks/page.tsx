"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, ListTodo } from "lucide-react";
import { useAuth } from "@/modules/auth/client";
import { apiClient, ApiError } from "@/lib/api-client";
import { Card } from "@/components/ui/card";
import { Badge, type BadgeVariant } from "@/components/ui/badge";
import { CardTitle } from "@/components/ui/typography";
import { EmptyState } from "@/components/empty-state";

interface TaskListItem {
  id: string;
  title: string;
  status: "TODO" | "IN_PROGRESS" | "BLOCKED" | "DONE" | "CANCELLED";
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  ownerId: string;
  deadline: string | null;
}

const STATUS_BADGE: Record<TaskListItem["status"], BadgeVariant> = {
  TODO: "neutral",
  IN_PROGRESS: "active",
  BLOCKED: "pending",
  DONE: "approved",
  CANCELLED: "rejected",
};

function isOverdue(deadline: string | null, status: TaskListItem["status"]): boolean {
  if (!deadline || status === "DONE" || status === "CANCELLED") return false;
  return new Date(deadline).getTime() < Date.now();
}

/**
 * MYARCH Maintenance functional hierarchy — the workspace's "Tasks" tab.
 * Reuses the existing Task/Follow-up Engine directly (relatedEntityType
 * "MaintenanceIssue") rather than a parallel task list — see
 * AssignMaintenanceIssueUseCase's own task-engine-bridge doc comment for
 * why every maintenance assignment already creates exactly this kind of
 * row. Visibility of the tab itself is gated by canViewMaintenanceTasks
 * (nav-level, in this route group's layout); the tasks actually returned
 * here are still scoped by Task Engine's own SearchTasksUseCase (a
 * Coordinator sees only tasks they own or created, same as everywhere
 * else Task Engine is used) — this page never widens that.
 */
export default function MaintenanceTasksPage() {
  const { accessToken } = useAuth();
  const [tasks, setTasks] = useState<TaskListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!accessToken) return;
    setIsLoading(true);
    setError(null);
    try {
      const result = await apiClient.getWithMeta<TaskListItem[], { total: number }>(
        "/api/tasks?relatedEntityType=MaintenanceIssue&sortField=deadline&sortDirection=asc&pageSize=100",
        accessToken,
      );
      setTasks(result.data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Unable to load maintenance tasks.");
    } finally {
      setIsLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold text-(--color-text-primary)">
          Maintenance Tasks
        </h1>
        <p className="mt-1 text-sm text-(--color-text-secondary)">
          Task/Follow-up Engine rows linked to maintenance issues — scoped to what you own or created.
        </p>
      </div>

      {error && <p className="text-sm text-(--color-danger)">{error}</p>}
      {isLoading && <p className="text-sm text-(--color-text-secondary)">Loading tasks…</p>}

      {!isLoading && !error && tasks.length === 0 && (
        <Card>
          <EmptyState icon={ListTodo} message="No maintenance tasks yet." />
        </Card>
      )}

      {!isLoading && !error && tasks.length > 0 && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {tasks.map((task) => {
            const overdue = isOverdue(task.deadline, task.status);
            return (
              <Card key={task.id} className="transition-shadow duration-150 hover:shadow-md">
                <div className="flex items-start justify-between gap-2">
                  <Link href={`/tasks/${task.id}`}>
                    <CardTitle className="text-(--color-accent)">{task.title}</CardTitle>
                  </Link>
                  <Badge variant={STATUS_BADGE[task.status]}>{task.status.replace("_", " ")}</Badge>
                </div>
                <p className="mt-2 text-xs text-(--color-text-secondary)">Priority: {task.priority}</p>
                {task.deadline && (
                  <p
                    className={`mt-1 flex items-center gap-1 text-xs ${overdue ? "text-(--color-danger)" : "text-(--color-text-secondary)"}`}
                  >
                    {overdue && <AlertTriangle aria-hidden="true" size={12} strokeWidth={2} />}
                    Due {new Date(task.deadline).toLocaleDateString()}
                  </p>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
