"use client";

import { useState, type FormEvent } from "react";
import { apiClient, ApiError } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input, Label, FieldError } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Modal } from "@/components/ui/modal";

const CATEGORIES: { value: string; label: string }[] = [
  { value: "ELECTRICAL", label: "Electrical" },
  { value: "PLUMBING", label: "Plumbing" },
  { value: "FURNITURE", label: "Furniture" },
  { value: "HVAC", label: "HVAC" },
  { value: "NETWORK", label: "Network/Internet" },
  { value: "CLASSROOM_STUDIO", label: "Classroom/Studio" },
  { value: "LAB", label: "Lab" },
  { value: "EQUIPMENT", label: "Equipment" },
  { value: "CLEANING", label: "Cleaning" },
  { value: "SAFETY", label: "Safety" },
  { value: "CIVIL_BUILDING", label: "Civil/Building" },
  { value: "OTHER", label: "Other" },
];

interface ReportIssueModalProps {
  isOpen: boolean;
  onClose: () => void;
  accessToken: string | null;
  onReported: () => void;
}

export function ReportIssueModal({ isOpen, onClose, accessToken, onReported }: ReportIssueModalProps) {
  const [category, setCategory] = useState("ELECTRICAL");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("MEDIUM");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function reset() {
    setCategory("ELECTRICAL");
    setLocation("");
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
      await apiClient.post("/api/maintenance/issues", { category, location, description, priority }, accessToken ?? undefined);
      onReported();
      handleClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Unable to report this issue.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Report a Maintenance Issue">
      <form onSubmit={handleSubmit} className="max-h-[70vh] space-y-4 overflow-y-auto">
        <div>
          <Label htmlFor="issue-category">Category</Label>
          <Select id="issue-category" value={category} onChange={(e) => setCategory(e.target.value)}>
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </Select>
        </div>

        <div>
          <Label htmlFor="issue-location">Location</Label>
          <Input id="issue-location" required value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. Studio 3, 2nd floor" />
        </div>

        <div>
          <Label htmlFor="issue-description">Description</Label>
          <Textarea id="issue-description" required rows={4} value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>

        <div>
          <Label htmlFor="issue-priority">Priority</Label>
          <Select id="issue-priority" value={priority} onChange={(e) => setPriority(e.target.value)}>
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
            {isSubmitting ? "Submitting…" : "Report Issue"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
