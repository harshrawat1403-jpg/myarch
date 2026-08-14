"use client";

import { useEffect, useState, type FormEvent } from "react";
import { apiClient, ApiError } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input, Label, FieldError } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Modal } from "@/components/ui/modal";

interface DirectoryEntry {
  userId: string;
  fullName: string;
  role: string;
}

interface CreateTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  accessToken: string | null;
  role: string | null;
  onCreated: () => void;
}

/** MYARCH Phase 2 (§3.8) — owner picker reuses the existing User Directory search (Secretary: any role; Coordinator: Students in their batch scope, per SearchUserDirectoryUseCase) rather than a new lookup — the server-side canAssignTaskTo check in CreateTaskUseCase is the real enforcement regardless of what this picker surfaces. */
export function CreateTaskModal({ isOpen, onClose, accessToken, role, onCreated }: CreateTaskModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("MEDIUM");
  const [deadline, setDeadline] = useState("");
  const [reminderAt, setReminderAt] = useState("");

  const [ownerQuery, setOwnerQuery] = useState("");
  const [ownerResults, setOwnerResults] = useState<DirectoryEntry[]>([]);
  const [selectedOwner, setSelectedOwner] = useState<DirectoryEntry | null>(null);
  const [isSearchingOwner, setIsSearchingOwner] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function reset() {
    setTitle("");
    setDescription("");
    setPriority("MEDIUM");
    setDeadline("");
    setReminderAt("");
    setOwnerQuery("");
    setOwnerResults([]);
    setSelectedOwner(null);
    setError(null);
  }

  function handleClose() {
    reset();
    onClose();
  }

  useEffect(() => {
    if (!accessToken || ownerQuery.trim().length < 2 || selectedOwner) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setOwnerResults([]);
      return;
    }
    let cancelled = false;
    setIsSearchingOwner(true);
    const timeout = setTimeout(() => {
      (async () => {
        try {
          const params = new URLSearchParams({ query: ownerQuery.trim() });
          if (role === "COORDINATOR") params.set("role", "STUDENT");
          const results = await apiClient.get<DirectoryEntry[]>(
            `/api/administration/directory?${params.toString()}`,
            accessToken,
          );
          if (!cancelled) setOwnerResults(results);
        } catch {
          if (!cancelled) setOwnerResults([]);
        } finally {
          if (!cancelled) setIsSearchingOwner(false);
        }
      })();
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [accessToken, ownerQuery, selectedOwner, role]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!selectedOwner) {
      setError("Select who this task is assigned to.");
      return;
    }

    setIsSubmitting(true);
    try {
      await apiClient.post(
        "/api/tasks",
        {
          title,
          description: description || undefined,
          priority,
          ownerId: selectedOwner.userId,
          deadline: deadline || undefined,
          reminderAt: reminderAt || undefined,
        },
        accessToken ?? undefined,
      );
      onCreated();
      handleClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Unable to create this task.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="New Task">
      <form onSubmit={handleSubmit} className="max-h-[70vh] space-y-4 overflow-y-auto">
        <div>
          <Label htmlFor="task-title">Title</Label>
          <Input id="task-title" required value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>

        <div>
          <Label htmlFor="task-description">Description (optional)</Label>
          <Textarea id="task-description" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>

        <div>
          <Label htmlFor="task-owner">Assign to</Label>
          {selectedOwner ? (
            <div className="flex items-center justify-between rounded-md border border-(--color-border) px-4 py-2.5 text-sm">
              <span>
                {selectedOwner.fullName} <span className="text-(--color-text-secondary)">({selectedOwner.role})</span>
              </span>
              <button
                type="button"
                onClick={() => setSelectedOwner(null)}
                className="text-xs font-medium text-(--color-accent) hover:underline"
              >
                Change
              </button>
            </div>
          ) : (
            <>
              <Input
                id="task-owner"
                placeholder="Search by name…"
                value={ownerQuery}
                onChange={(e) => setOwnerQuery(e.target.value)}
              />
              {isSearchingOwner && <p className="mt-1 text-xs text-(--color-text-secondary)">Searching…</p>}
              {ownerResults.length > 0 && (
                <ul className="mt-1 max-h-40 overflow-y-auto rounded-md border border-(--color-border)">
                  {ownerResults.map((entry) => (
                    <li key={entry.userId}>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedOwner(entry);
                          setOwnerResults([]);
                        }}
                        className="block w-full px-4 py-2 text-left text-sm hover:bg-(--color-surface-muted)"
                      >
                        {entry.fullName} <span className="text-(--color-text-secondary)">({entry.role})</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </div>

        <div>
          <Label htmlFor="task-priority">Priority</Label>
          <Select id="task-priority" value={priority} onChange={(e) => setPriority(e.target.value)}>
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
            <option value="URGENT">Urgent</option>
          </Select>
        </div>

        <div>
          <Label htmlFor="task-deadline">Deadline (optional)</Label>
          <Input id="task-deadline" type="datetime-local" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
        </div>

        <div>
          <Label htmlFor="task-reminder">Reminder (optional)</Label>
          <Input id="task-reminder" type="datetime-local" value={reminderAt} onChange={(e) => setReminderAt(e.target.value)} />
        </div>

        <FieldError>{error ?? undefined}</FieldError>

        <div className="flex justify-end gap-3 border-t border-(--color-border) pt-4">
          <Button type="button" variant="ghost" onClick={handleClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={isSubmitting}>
            {isSubmitting ? "Creating…" : "Create Task"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
