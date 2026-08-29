"use client";

import { useState, type FormEvent } from "react";
import { apiClient, ApiError } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input, Label, FieldError } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Modal } from "@/components/ui/modal";

interface CreateCommitteeModalProps {
  isOpen: boolean;
  onClose: () => void;
  accessToken: string | null;
  onCreated: () => void;
}

const COMMITTEE_TYPE_OPTIONS = [
  { value: "STUDENT_COUNCIL", label: "Student Council" },
  { value: "CORE_COMMITTEE", label: "Core Committee" },
  { value: "EVENT_COMMITTEE", label: "Event Committee" },
  { value: "TECHNICAL_COMMITTEE", label: "Technical Committee" },
  { value: "PROJECT_TEAM", label: "Project Team" },
  { value: "TEMPORARY_COMMITTEE", label: "Temporary Committee" },
];

export function CreateCommitteeModal({ isOpen, onClose, accessToken, onCreated }: CreateCommitteeModalProps) {
  const [name, setName] = useState("");
  const [type, setType] = useState(COMMITTEE_TYPE_OPTIONS[0]!.value);
  const [academicYear, setAcademicYear] = useState("");
  const [responsibilities, setResponsibilities] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function reset() {
    setName("");
    setType(COMMITTEE_TYPE_OPTIONS[0]!.value);
    setAcademicYear("");
    setResponsibilities("");
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
        "/api/committees",
        { name, type, academicYear: academicYear || undefined, responsibilities: responsibilities || undefined },
        accessToken ?? undefined,
      );
      onCreated();
      handleClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Unable to create this committee.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="New Committee">
      <form onSubmit={handleSubmit} className="max-h-[70vh] space-y-4 overflow-y-auto">
        <div>
          <Label htmlFor="committee-name">Name</Label>
          <Input id="committee-name" required value={name} onChange={(e) => setName(e.target.value)} />
        </div>

        <div>
          <Label htmlFor="committee-type">Type</Label>
          <Select id="committee-type" value={type} onChange={(e) => setType(e.target.value)}>
            {COMMITTEE_TYPE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </div>

        <div>
          <Label htmlFor="committee-academic-year">Academic year (optional)</Label>
          <Input
            id="committee-academic-year"
            placeholder="2025-2026"
            value={academicYear}
            onChange={(e) => setAcademicYear(e.target.value)}
          />
        </div>

        <div>
          <Label htmlFor="committee-responsibilities">Responsibilities (optional)</Label>
          <Textarea id="committee-responsibilities" rows={3} value={responsibilities} onChange={(e) => setResponsibilities(e.target.value)} />
        </div>

        <FieldError>{error ?? undefined}</FieldError>

        <div className="flex justify-end gap-3 border-t border-(--color-border) pt-4">
          <Button type="button" variant="ghost" onClick={handleClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={isSubmitting}>
            {isSubmitting ? "Creating…" : "Create Committee"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
