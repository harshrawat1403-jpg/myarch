"use client";

import { useState, type FormEvent } from "react";
import { apiClient, ApiError } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input, Label, FieldError } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Modal } from "@/components/ui/modal";

interface CreateMeetingModalProps {
  isOpen: boolean;
  onClose: () => void;
  accessToken: string | null;
  onCreated: () => void;
}

export function CreateMeetingModal({ isOpen, onClose, accessToken, onCreated }: CreateMeetingModalProps) {
  const [title, setTitle] = useState("");
  const [agenda, setAgenda] = useState("");
  const [startAt, setStartAt] = useState("");
  const [venueOrLink, setVenueOrLink] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function reset() {
    setTitle("");
    setAgenda("");
    setStartAt("");
    setVenueOrLink("");
    setError(null);
  }

  function handleClose() {
    reset();
    onClose();
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await apiClient.post(
        "/api/meetings",
        { title, agenda: agenda || undefined, startAt, venueOrLink: venueOrLink || undefined },
        accessToken ?? undefined,
      );
      onCreated();
      handleClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Unable to create this meeting.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="New Meeting">
      <form onSubmit={handleSubmit} className="max-h-[70vh] space-y-4 overflow-y-auto">
        <div>
          <Label htmlFor="meeting-title">Title</Label>
          <Input id="meeting-title" required value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>

        <div>
          <Label htmlFor="meeting-agenda">Agenda (optional)</Label>
          <Textarea id="meeting-agenda" rows={3} value={agenda} onChange={(e) => setAgenda(e.target.value)} />
        </div>

        <div>
          <Label htmlFor="meeting-start">Starts at</Label>
          <Input id="meeting-start" type="datetime-local" required value={startAt} onChange={(e) => setStartAt(e.target.value)} />
        </div>

        <div>
          <Label htmlFor="meeting-venue">Venue or link (optional)</Label>
          <Input id="meeting-venue" value={venueOrLink} onChange={(e) => setVenueOrLink(e.target.value)} />
        </div>

        <FieldError>{error ?? undefined}</FieldError>

        <div className="flex justify-end gap-3 border-t border-(--color-border) pt-4">
          <Button type="button" variant="ghost" onClick={handleClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={isSubmitting}>
            {isSubmitting ? "Creating…" : "Create Meeting"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
