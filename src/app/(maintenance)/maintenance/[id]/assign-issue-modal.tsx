"use client";

import { useEffect, useState } from "react";
import { apiClient, ApiError } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input, Label, FieldError } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";

interface DirectoryEntry {
  userId: string;
  fullName: string;
  role: string;
}

interface AssignIssueModalProps {
  isOpen: boolean;
  onClose: () => void;
  accessToken: string | null;
  issueId: string;
  isReassign: boolean;
  onAssigned: () => void;
}

/** §3.5 — assignee must be Secretary/Coordinator (enforced server-side); the directory search here mirrors the Task Engine's own owner picker, restricted to staff roles. */
export function AssignIssueModal({ isOpen, onClose, accessToken, issueId, isReassign, onAssigned }: AssignIssueModalProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<DirectoryEntry[]>([]);
  const [selected, setSelected] = useState<DirectoryEntry | null>(null);
  const [deadline, setDeadline] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function reset() {
    setQuery("");
    setResults([]);
    setSelected(null);
    setDeadline("");
    setError(null);
  }

  function handleClose() {
    reset();
    onClose();
  }

  useEffect(() => {
    if (!accessToken || query.trim().length < 2 || selected) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setResults([]);
      return;
    }
    let cancelled = false;
    setIsSearching(true);
    const timeout = setTimeout(() => {
      (async () => {
        try {
          const params = new URLSearchParams({ query: query.trim() });
          const list = await Promise.all(
            ["SECRETARY", "COORDINATOR"].map((r) =>
              apiClient.get<DirectoryEntry[]>(`/api/administration/directory?${params.toString()}&role=${r}`, accessToken),
            ),
          );
          if (!cancelled) setResults(list.flat());
        } catch {
          if (!cancelled) setResults([]);
        } finally {
          if (!cancelled) setIsSearching(false);
        }
      })();
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [accessToken, query, selected]);

  async function handleSubmit() {
    if (!selected) {
      setError("Select who this issue should be assigned to.");
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      const path = isReassign ? `/api/maintenance/issues/${issueId}/reassign` : `/api/maintenance/issues/${issueId}/assign`;
      const body: Record<string, unknown> = { assigneeId: selected.userId };
      if (!isReassign && deadline) body.deadline = deadline;
      await apiClient.post(path, body, accessToken ?? undefined);
      onAssigned();
      handleClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Unable to assign this issue.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={isReassign ? "Reassign Issue" : "Assign Issue"}>
      <div className="space-y-4">
        <div>
          <Label htmlFor="assignee-search">Assign to</Label>
          {selected ? (
            <div className="flex items-center justify-between rounded-md border border-(--color-border) px-4 py-2.5 text-sm">
              <span>
                {selected.fullName} <span className="text-(--color-text-secondary)">({selected.role})</span>
              </span>
              <button type="button" onClick={() => setSelected(null)} className="text-xs font-medium text-(--color-accent) hover:underline">
                Change
              </button>
            </div>
          ) : (
            <>
              <Input id="assignee-search" placeholder="Search by name…" value={query} onChange={(e) => setQuery(e.target.value)} />
              {isSearching && <p className="mt-1 text-xs text-(--color-text-secondary)">Searching…</p>}
              {results.length > 0 && (
                <ul className="mt-1 max-h-40 overflow-y-auto rounded-md border border-(--color-border)">
                  {results.map((entry) => (
                    <li key={entry.userId}>
                      <button
                        type="button"
                        onClick={() => {
                          setSelected(entry);
                          setResults([]);
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

        {!isReassign && (
          <div>
            <Label htmlFor="assignee-deadline">Deadline (optional)</Label>
            <Input id="assignee-deadline" type="datetime-local" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
          </div>
        )}

        <FieldError>{error ?? undefined}</FieldError>

        <div className="flex justify-end gap-3 border-t border-(--color-border) pt-4">
          <Button type="button" variant="ghost" onClick={handleClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="button" variant="primary" onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? "Assigning…" : isReassign ? "Reassign" : "Assign"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
