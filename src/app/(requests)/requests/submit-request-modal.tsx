"use client";

import { useState, type FormEvent } from "react";
import { apiClient, ApiError } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input, Label, FieldError } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Modal } from "@/components/ui/modal";

interface SubmitRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  accessToken: string | null;
  onSubmitted: () => void;
}

export function SubmitRequestModal({ isOpen, onClose, accessToken, onSubmitted }: SubmitRequestModalProps) {
  const [type, setType] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("MEDIUM");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function reset() {
    setType("");
    setDescription("");
    setPriority("MEDIUM");
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
      await apiClient.post("/api/requests", { type, description, priority }, accessToken ?? undefined);
      onSubmitted();
      handleClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Unable to submit this request.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Submit a Request">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="request-type">Type</Label>
          <Input id="request-type" required value={type} onChange={(e) => setType(e.target.value)} placeholder="e.g. Budget approval, Equipment loan" />
        </div>

        <div>
          <Label htmlFor="request-description">Description</Label>
          <Textarea id="request-description" required rows={4} value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>

        <div>
          <Label htmlFor="request-priority">Priority</Label>
          <Select id="request-priority" value={priority} onChange={(e) => setPriority(e.target.value)}>
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
            <option value="URGENT">Urgent</option>
          </Select>
        </div>

        <FieldError>{error ?? undefined}</FieldError>

        <div className="flex justify-end gap-3 border-t border-(--color-border) pt-4">
          <Button type="button" variant="ghost" onClick={handleClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={isSubmitting}>
            {isSubmitting ? "Submitting…" : "Submit Request"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
