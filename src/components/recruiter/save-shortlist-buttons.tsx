"use client";

import { useState } from "react";
import { Bookmark, BookmarkCheck, CheckCircle2, Send, Star } from "lucide-react";
import { apiClient, ApiError } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import type { RecruiterInterestRequestStatus } from "@/modules/recruiters";

export interface InteractionState {
  isSaved: boolean;
  isShortlisted: boolean;
}

export interface SaveShortlistButtonsProps {
  studentId: string;
  state: InteractionState;
  accessToken: string | null;
  onChange: (next: InteractionState) => void;
  /** Cards render these nested inside a <Link> to the profile — clicks must never bubble into a navigation. Detail-page usage (not inside a Link) can omit this. */
  stopPropagation?: boolean;
}

/**
 * V4.0 C1 — one tap, private, on every directory card and the detail page
 * (§8 steps 2–3). Shared here (not duplicated per page) since both the
 * `/recruiter` card grid and `/recruiter/students/[id]` detail page need
 * identical toggle behavior from the first two call sites.
 */
export function SaveShortlistButtons({ studentId, state, accessToken, onChange, stopPropagation }: SaveShortlistButtonsProps) {
  const toast = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [isShortlisting, setIsShortlisting] = useState(false);

  function guard(event: React.MouseEvent) {
    if (stopPropagation) {
      event.preventDefault();
      event.stopPropagation();
    }
  }

  async function toggleSaved(event: React.MouseEvent) {
    guard(event);
    if (!accessToken || isSaving) return;
    const next = !state.isSaved;
    setIsSaving(true);
    try {
      const result = await apiClient.patch<InteractionState>(
        `/api/recruiters/students/${studentId}/save`,
        { saved: next },
        accessToken,
      );
      onChange(result);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Unable to update saved status.");
    } finally {
      setIsSaving(false);
    }
  }

  async function toggleShortlisted(event: React.MouseEvent) {
    guard(event);
    if (!accessToken || isShortlisting || !state.isSaved) return;
    const next = !state.isShortlisted;
    setIsShortlisting(true);
    try {
      const result = await apiClient.patch<InteractionState>(
        `/api/recruiters/students/${studentId}/shortlist`,
        { isShortlisted: next },
        accessToken,
      );
      onChange({ ...state, ...result });
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Unable to update shortlist status.");
    } finally {
      setIsShortlisting(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button type="button" variant={state.isSaved ? "primary" : "secondary"} onClick={toggleSaved} disabled={isSaving} className="gap-1.5 text-xs">
        {state.isSaved ? (
          <BookmarkCheck aria-hidden="true" size={14} strokeWidth={1.75} />
        ) : (
          <Bookmark aria-hidden="true" size={14} strokeWidth={1.75} />
        )}
        {state.isSaved ? "Saved" : "Save"}
      </Button>
      <Button
        type="button"
        variant={state.isShortlisted ? "primary" : "secondary"}
        onClick={toggleShortlisted}
        disabled={isShortlisting || !state.isSaved}
        title={!state.isSaved ? "Save this student before shortlisting" : undefined}
        className="gap-1.5 text-xs"
      >
        <Star aria-hidden="true" size={14} strokeWidth={1.75} />
        {state.isShortlisted ? "Shortlisted" : "Shortlist"}
      </Button>
    </div>
  );
}

export interface ExpressInterestControlProps {
  studentId: string;
  interestStatus: RecruiterInterestRequestStatus | null;
  accessToken: string | null;
  onChange: (status: RecruiterInterestRequestStatus) => void;
  stopPropagation?: boolean;
}

/**
 * V4.0 C2 — one tap opens a lightweight inline panel (not a modal wizard)
 * with only an optional message field, submits immediately; confirmation
 * is inline ("✓ Interest Sent"), never a redirect (§8 step 4). A second
 * attempt is impossible from this control once sent — the button itself
 * becomes the confirmed state, matching the backend's own idempotent
 * "just return the existing request" behavior.
 */
export function ExpressInterestControl({ studentId, interestStatus, accessToken, onChange, stopPropagation }: ExpressInterestControlProps) {
  const toast = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);

  function guard(event: React.MouseEvent) {
    if (stopPropagation) {
      event.preventDefault();
      event.stopPropagation();
    }
  }

  function openPanel(event: React.MouseEvent) {
    guard(event);
    setIsOpen(true);
  }

  function closePanel(event: React.MouseEvent) {
    guard(event);
    setIsOpen(false);
    setMessage("");
  }

  async function send(event: React.MouseEvent) {
    guard(event);
    if (!accessToken || isSending) return;
    setIsSending(true);
    try {
      const result = await apiClient.post<{ status: RecruiterInterestRequestStatus }>(
        `/api/recruiters/students/${studentId}/interest`,
        { message: message.trim() || undefined },
        accessToken,
      );
      onChange(result.status);
      setIsOpen(false);
      setMessage("");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Unable to send interest.");
    } finally {
      setIsSending(false);
    }
  }

  if (interestStatus) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-(--color-success)">
        <CheckCircle2 aria-hidden="true" size={14} strokeWidth={1.75} />
        Interest Sent
      </span>
    );
  }

  if (!isOpen) {
    return (
      <Button type="button" variant="secondary" onClick={openPanel} className="gap-1.5 text-xs">
        <Send aria-hidden="true" size={14} strokeWidth={1.75} />
        Express Interest
      </Button>
    );
  }

  return (
    <div className="w-full space-y-2" onClick={(e) => stopPropagation && e.stopPropagation()}>
      <Textarea
        aria-label="Message (optional)"
        placeholder="Optional message to the department…"
        rows={2}
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        className="text-xs"
      />
      <div className="flex gap-2">
        <Button type="button" variant="primary" onClick={send} disabled={isSending} className="text-xs">
          {isSending ? "Sending…" : "Send"}
        </Button>
        <Button type="button" variant="ghost" onClick={closePanel} disabled={isSending} className="text-xs">
          Cancel
        </Button>
      </div>
    </div>
  );
}
