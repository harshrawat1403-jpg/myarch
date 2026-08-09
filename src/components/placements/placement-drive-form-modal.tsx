"use client";

import { useEffect, useState, type FormEvent } from "react";
import { apiClient, ApiError } from "@/lib/api-client";
import type { CompanyRecord } from "@/modules/companies";
import type { Batch } from "@/modules/batches";
import type { PlacementDriveRecord, PlacementDriveType } from "@/modules/placements";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Modal } from "@/components/ui/modal";

export interface PlacementDriveFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  accessToken: string | null;
  companies: readonly CompanyRecord[];
  batches: readonly Batch[];
  /** When set (the Internships page), the type field is pre-selected and locked. */
  fixedType?: PlacementDriveType;
  /** Present when editing an existing drive; absent when creating one. companyId/type are immutable after creation. */
  drive?: PlacementDriveRecord | null;
  onSaved: () => void;
}

function toDateInputValue(date: Date | null): string {
  return date ? date.toISOString().slice(0, 10) : "";
}

/**
 * V4.0 D2 — the drive creation/edit form (§14: "a drive creation form
 * (Company picker, title, type toggle, eligibility criteria, deadline)").
 * Shared by /dashboard/placement-drives and /dashboard/internships (the
 * latter locks `type` to INTERNSHIP) since both are the same PlacementDrive
 * entity, never a parallel Internship form (§0's explicit "type variant, not
 * a parallel entity" decision).
 */
export function PlacementDriveFormModal({
  isOpen,
  onClose,
  accessToken,
  companies,
  batches,
  fixedType,
  drive,
  onSaved,
}: PlacementDriveFormModalProps) {
  const isEditing = drive != null;

  const [companyId, setCompanyId] = useState(drive?.companyId ?? "");
  const [title, setTitle] = useState(drive?.title ?? "");
  const [type, setType] = useState<PlacementDriveType>(drive?.type ?? fixedType ?? "PLACEMENT");
  const [eligibleBatchIds, setEligibleBatchIds] = useState<string[]>([...(drive?.eligibility.eligibleBatchIds ?? [])]);
  const [minCgpa, setMinCgpa] = useState(drive?.eligibility.minCgpa?.toString() ?? "");
  const [excludeBacklog, setExcludeBacklog] = useState(drive?.eligibility.backlogAllowance === false);
  const [packageOrStipend, setPackageOrStipend] = useState(drive?.packageOrStipend ?? "");
  const [description, setDescription] = useState(drive?.description ?? "");
  const [applicationDeadline, setApplicationDeadline] = useState(toDateInputValue(drive?.applicationDeadline ?? null));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Render-time reset when the target drive changes or the modal reopens —
  // the same pattern CompanyFormModal already uses.
  const [lastDriveId, setLastDriveId] = useState(drive?.id);
  const [wasOpen, setWasOpen] = useState(isOpen);
  if (drive?.id !== lastDriveId || isOpen !== wasOpen) {
    setLastDriveId(drive?.id);
    setWasOpen(isOpen);
    setCompanyId(drive?.companyId ?? "");
    setTitle(drive?.title ?? "");
    setType(drive?.type ?? fixedType ?? "PLACEMENT");
    setEligibleBatchIds([...(drive?.eligibility.eligibleBatchIds ?? [])]);
    setMinCgpa(drive?.eligibility.minCgpa?.toString() ?? "");
    setExcludeBacklog(drive?.eligibility.backlogAllowance === false);
    setPackageOrStipend(drive?.packageOrStipend ?? "");
    setDescription(drive?.description ?? "");
    setApplicationDeadline(toDateInputValue(drive?.applicationDeadline ?? null));
    setError(null);
  }

  function toggleBatch(batchId: string, checked: boolean) {
    setEligibleBatchIds((current) => (checked ? [...current, batchId] : current.filter((id) => id !== batchId)));
  }

  function handleClose() {
    setError(null);
    onClose();
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const eligibility = {
      eligibleBatchIds,
      minCgpa: minCgpa.trim() ? Number(minCgpa) : undefined,
      backlogAllowance: excludeBacklog ? false : undefined,
    };

    try {
      if (isEditing) {
        await apiClient.patch(
          `/api/placements/drives/${drive.id}`,
          {
            title,
            eligibility,
            packageOrStipend: packageOrStipend || null,
            description: description || null,
            applicationDeadline: applicationDeadline || null,
          },
          accessToken ?? undefined,
        );
      } else {
        await apiClient.post(
          "/api/placements/drives",
          {
            companyId,
            title,
            type,
            eligibility,
            packageOrStipend: packageOrStipend || undefined,
            description: description || undefined,
            applicationDeadline: applicationDeadline || undefined,
          },
          accessToken ?? undefined,
        );
      }
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Unable to save this drive.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={isEditing ? "Edit Drive" : `New ${fixedType === "INTERNSHIP" ? "Internship" : "Placement Drive"}`}>
      <form onSubmit={handleSubmit} className="max-h-[70vh] space-y-4 overflow-y-auto">
        {!isEditing && (
          <div>
            <Label htmlFor="drive-company">Company</Label>
            <Select id="drive-company" required value={companyId} onChange={(e) => setCompanyId(e.target.value)}>
              <option value="">Select a company…</option>
              {companies.map((company) => (
                <option key={company.id} value={company.id}>
                  {company.name}
                </option>
              ))}
            </Select>
          </div>
        )}

        <div>
          <Label htmlFor="drive-title">Title</Label>
          <Input id="drive-title" required value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>

        {!isEditing && !fixedType && (
          <div>
            <Label htmlFor="drive-type">Type</Label>
            <Select id="drive-type" value={type} onChange={(e) => setType(e.target.value as PlacementDriveType)}>
              <option value="PLACEMENT">Placement</option>
              <option value="INTERNSHIP">Internship</option>
            </Select>
          </div>
        )}

        <div>
          <Label>Eligible batches (leave empty to allow every batch — Secretary only)</Label>
          <div className="max-h-32 space-y-1.5 overflow-y-auto rounded-md border border-(--color-border) p-3">
            {batches.map((batch) => (
              <Checkbox
                key={batch.id}
                id={`drive-batch-${batch.id}`}
                label={batch.name}
                checked={eligibleBatchIds.includes(batch.id)}
                onChange={(e) => toggleBatch(batch.id, e.target.checked)}
              />
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="drive-min-cgpa">Minimum CGPA (optional)</Label>
            <Input
              id="drive-min-cgpa"
              type="number"
              step="0.1"
              min="0"
              max="10"
              value={minCgpa}
              onChange={(e) => setMinCgpa(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="drive-deadline">Application deadline</Label>
            <Input
              id="drive-deadline"
              type="date"
              value={applicationDeadline}
              onChange={(e) => setApplicationDeadline(e.target.value)}
            />
          </div>
        </div>

        <Checkbox
          id="drive-exclude-backlog"
          label="Exclude students with an active backlog"
          checked={excludeBacklog}
          onChange={(e) => setExcludeBacklog(e.target.checked)}
        />

        <div>
          <Label htmlFor="drive-package">Package / Stipend (optional)</Label>
          <Input
            id="drive-package"
            placeholder="e.g. 12 LPA or ₹25,000/month"
            value={packageOrStipend}
            onChange={(e) => setPackageOrStipend(e.target.value)}
          />
        </div>

        <div>
          <Label htmlFor="drive-description">Description (optional)</Label>
          <Textarea id="drive-description" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>

        {error && <p className="text-sm text-(--color-danger)">{error}</p>}

        <div className="flex justify-end gap-3 border-t border-(--color-border) pt-4">
          <Button type="button" variant="ghost" onClick={handleClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={isSubmitting || (!isEditing && !companyId)}>
            {isSubmitting ? "Saving…" : isEditing ? "Save changes" : "Create Drive"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
