"use client";

import { useState, type FormEvent } from "react";
import { apiClient, ApiError } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input, Label, FieldError } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Modal } from "@/components/ui/modal";

interface CreateAnnouncementModalProps {
  isOpen: boolean;
  onClose: () => void;
  accessToken: string | null;
  onCreated: () => void;
}

const AUDIENCE_OPTIONS = [
  { value: "EVERYONE", label: "Everyone" },
  { value: "YEAR", label: "A specific year (batch)" },
  { value: "COORDINATORS", label: "Coordinators" },
  { value: "SELECTED_GROUP", label: "Selected people" },
];

export function CreateAnnouncementModal({ isOpen, onClose, accessToken, onCreated }: CreateAnnouncementModalProps) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [priority, setPriority] = useState("MEDIUM");
  const [audienceType, setAudienceType] = useState("EVERYONE");
  const [audienceValue, setAudienceValue] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [selectedRecipients, setSelectedRecipients] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function reset() {
    setTitle("");
    setContent("");
    setPriority("MEDIUM");
    setAudienceType("EVERYONE");
    setAudienceValue("");
    setExpiresAt("");
    setSelectedRecipients("");
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
        "/api/announcements",
        {
          title,
          content,
          priority,
          audienceType,
          audienceValue: audienceType === "YEAR" ? audienceValue || undefined : undefined,
          expiresAt: expiresAt || undefined,
          selectedRecipientUserIds:
            audienceType === "SELECTED_GROUP"
              ? selectedRecipients
                  .split(",")
                  .map((id) => id.trim())
                  .filter(Boolean)
              : undefined,
        },
        accessToken ?? undefined,
      );
      onCreated();
      handleClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Unable to create this announcement.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="New Announcement">
      <form onSubmit={handleSubmit} className="max-h-[70vh] space-y-4 overflow-y-auto">
        <div>
          <Label htmlFor="announcement-title">Title</Label>
          <Input id="announcement-title" required value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>

        <div>
          <Label htmlFor="announcement-content">Content</Label>
          <Textarea id="announcement-content" rows={4} required value={content} onChange={(e) => setContent(e.target.value)} />
        </div>

        <div>
          <Label htmlFor="announcement-priority">Priority</Label>
          <Select id="announcement-priority" value={priority} onChange={(e) => setPriority(e.target.value)}>
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
            <option value="URGENT">Urgent</option>
          </Select>
        </div>

        <div>
          <Label htmlFor="announcement-audience">Audience</Label>
          <Select id="announcement-audience" value={audienceType} onChange={(e) => setAudienceType(e.target.value)}>
            {AUDIENCE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </Select>
        </div>

        {audienceType === "YEAR" && (
          <div>
            <Label htmlFor="announcement-audience-value">Batch ID</Label>
            <Input id="announcement-audience-value" value={audienceValue} onChange={(e) => setAudienceValue(e.target.value)} placeholder="batch UUID" />
          </div>
        )}

        {audienceType === "SELECTED_GROUP" && (
          <div>
            <Label htmlFor="announcement-recipients">Recipient user IDs (comma-separated)</Label>
            <Textarea id="announcement-recipients" rows={2} value={selectedRecipients} onChange={(e) => setSelectedRecipients(e.target.value)} />
          </div>
        )}

        <div>
          <Label htmlFor="announcement-expires">Expires at (optional)</Label>
          <Input id="announcement-expires" type="datetime-local" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} />
        </div>

        <FieldError>{error ?? undefined}</FieldError>

        <div className="flex justify-end gap-3 border-t border-(--color-border) pt-4">
          <Button type="button" variant="ghost" onClick={handleClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={isSubmitting}>
            {isSubmitting ? "Publishing…" : "Publish"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
