"use client";

import { useState, type FormEvent } from "react";
import { apiClient, ApiError } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input, Label, FieldError } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Modal } from "@/components/ui/modal";

interface CreateEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  accessToken: string | null;
  onCreated: () => void;
}

export function CreateEventModal({ isOpen, onClose, accessToken, onCreated }: CreateEventModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");
  const [venue, setVenue] = useState("");
  const [shortDescription, setShortDescription] = useState("");
  const [category, setCategory] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function reset() {
    setTitle("");
    setDescription("");
    setStartAt("");
    setEndAt("");
    setVenue("");
    setShortDescription("");
    setCategory("");
    setIsPublic(false);
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
        "/api/events",
        {
          title,
          description: description || undefined,
          startAt,
          endAt: endAt || undefined,
          venue: venue || undefined,
          shortDescription: shortDescription || undefined,
          category: category || undefined,
          isPublic,
        },
        accessToken ?? undefined,
      );
      onCreated();
      handleClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Unable to create this event.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="New Event">
      <form onSubmit={handleSubmit} className="max-h-[70vh] space-y-4 overflow-y-auto">
        <div>
          <Label htmlFor="event-title">Title</Label>
          <Input id="event-title" required value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>

        <div>
          <Label htmlFor="event-description">Description (optional)</Label>
          <Textarea id="event-description" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>

        <div>
          <Label htmlFor="event-start">Starts at</Label>
          <Input id="event-start" type="datetime-local" required value={startAt} onChange={(e) => setStartAt(e.target.value)} />
        </div>

        <div>
          <Label htmlFor="event-end">Ends at (optional)</Label>
          <Input id="event-end" type="datetime-local" value={endAt} onChange={(e) => setEndAt(e.target.value)} />
        </div>

        <div>
          <Label htmlFor="event-venue">Venue (optional)</Label>
          <Input id="event-venue" value={venue} onChange={(e) => setVenue(e.target.value)} />
        </div>

        <label className="flex items-center gap-2 text-sm text-(--color-text-primary)"><input type="checkbox" checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} /> Show this event on Explore after it is published</label>

        <FieldError>{error ?? undefined}</FieldError>

        <div className="flex justify-end gap-3 border-t border-(--color-border) pt-4">
          <Button type="button" variant="ghost" onClick={handleClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={isSubmitting}>
            {isSubmitting ? "Creating…" : "Create Event"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
