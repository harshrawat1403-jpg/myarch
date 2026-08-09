"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { useAuth } from "@/modules/auth/client";
import { apiClient, ApiError } from "@/lib/api-client";
import type { CompanyRecord } from "@/modules/companies";
import type { Batch } from "@/modules/batches";
import type { PlacementDriveRecord, PlacementDriveStatus } from "@/modules/placements";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge, type BadgeVariant } from "@/components/ui/badge";
import { DataLabel } from "@/components/ui/typography";
import { useToast } from "@/components/ui/toast";
import { PlacementDriveFormModal } from "@/components/placements/placement-drive-form-modal";

function statusBadgeVariant(status: PlacementDriveStatus): BadgeVariant {
  switch (status) {
    case "DRAFT":
      return "neutral";
    case "ANNOUNCED":
      return "active";
    case "IN_PROGRESS":
      return "pending";
    case "CLOSED":
      return "archived";
  }
}

/** The status this drive can move to next in the ordinary (non-publish) lifecycle — never DRAFT→ANNOUNCED, which is PublishButton's job. */
function nextStatusOptions(status: PlacementDriveStatus): PlacementDriveStatus[] {
  switch (status) {
    case "ANNOUNCED":
      return ["IN_PROGRESS", "CLOSED"];
    case "IN_PROGRESS":
      return ["CLOSED"];
    default:
      return [];
  }
}

/** V4.0 D2 (§14) — a drive's detail/edit view. The applicant board and interview sub-panel are D3's job, not built here. */
export default function PlacementDriveDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { accessToken, role } = useAuth();
  const toast = useToast();
  const isSecretary = role === "SECRETARY";

  const [drive, setDrive] = useState<PlacementDriveRecord | null>(null);
  const [companies, setCompanies] = useState<CompanyRecord[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const load = useCallback(async () => {
    if (!accessToken || !id) return;
    try {
      const [record, companyResults, batchResults] = await Promise.all([
        apiClient.get<PlacementDriveRecord>(`/api/placements/drives/${id}`, accessToken),
        apiClient.get<CompanyRecord[]>("/api/companies", accessToken),
        apiClient.get<Batch[]>("/api/batches", accessToken),
      ]);
      setDrive(record);
      setCompanies(companyResults);
      setBatches(batchResults);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Unable to load this drive.");
    }
  }, [accessToken, id]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  async function handlePublish() {
    if (!accessToken || !drive) return;
    setIsTransitioning(true);
    try {
      await apiClient.post(`/api/placements/drives/${drive.id}/publish`, undefined, accessToken);
      toast.success("Drive published — now visible to eligible students.");
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Unable to publish this drive.");
    } finally {
      setIsTransitioning(false);
    }
  }

  async function handleSetStatus(status: PlacementDriveStatus) {
    if (!accessToken || !drive) return;
    setIsTransitioning(true);
    try {
      await apiClient.patch(`/api/placements/drives/${drive.id}/status`, { status }, accessToken);
      toast.success(`Drive moved to ${status.replace("_", " ")}.`);
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Unable to update this drive's status.");
    } finally {
      setIsTransitioning(false);
    }
  }

  if (error) {
    return <p className="text-sm text-(--color-danger)">{error}</p>;
  }

  if (!drive) {
    return <p className="text-sm text-(--color-text-secondary)">Loading…</p>;
  }

  const backHref = drive.type === "INTERNSHIP" ? "/dashboard/internships" : "/dashboard/placement-drives";

  return (
    <div className="max-w-2xl space-y-6">
      <Link href={backHref} className="inline-flex items-center gap-1 text-sm font-medium text-(--color-accent) hover:underline">
        <ChevronLeft aria-hidden="true" size={16} strokeWidth={2} />
        Back to {drive.type === "INTERNSHIP" ? "Internships" : "Placement Drives"}
      </Link>

      <div className="flex items-start justify-between gap-4">
        <div>
          <DataLabel>{drive.companyName}</DataLabel>
          <h1 className="mt-1 font-[family-name:var(--font-display)] text-2xl font-semibold text-(--color-text-primary)">
            {drive.title}
          </h1>
        </div>
        <Badge variant={statusBadgeVariant(drive.status)}>{drive.status}</Badge>
      </div>

      <Card className="space-y-4">
        {drive.description && <p className="text-sm text-(--color-text-primary)">{drive.description}</p>}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <DataLabel>Type</DataLabel>
            <p className="mt-1 text-(--color-text-primary)">{drive.type === "INTERNSHIP" ? "Internship" : "Placement"}</p>
          </div>
          <div>
            <DataLabel>Package / Stipend</DataLabel>
            <p className="mt-1 text-(--color-text-primary)">{drive.packageOrStipend ?? "—"}</p>
          </div>
          <div>
            <DataLabel>Application Deadline</DataLabel>
            <p className="mt-1 text-(--color-text-primary)">
              {drive.applicationDeadline ? new Date(drive.applicationDeadline).toISOString().slice(0, 10) : "—"}
            </p>
          </div>
          <div>
            <DataLabel>Minimum CGPA</DataLabel>
            <p className="mt-1 text-(--color-text-primary)">{drive.eligibility.minCgpa ?? "—"}</p>
          </div>
        </div>
        <div>
          <DataLabel>Eligible Batches</DataLabel>
          <div className="mt-1 flex flex-wrap gap-1">
            {drive.eligibility.eligibleBatchIds.length === 0 && (
              <Badge variant="neutral">All batches</Badge>
            )}
            {drive.eligibility.eligibleBatchIds.map((batchId) => (
              <Badge key={batchId} variant="neutral">
                {batches.find((b) => b.id === batchId)?.name ?? batchId}
              </Badge>
            ))}
          </div>
        </div>
      </Card>

      <Card className="space-y-3 border-t-2 border-t-(--color-accent)">
        <div className="flex flex-wrap gap-3">
          <Link href={`/dashboard/placement-drives/${drive.id}/applications`}>
            <Button type="button" variant="primary">
              View Applications
            </Button>
          </Link>
          <Button type="button" variant="secondary" onClick={() => setIsEditOpen(true)}>
            Edit
          </Button>
          {drive.status === "DRAFT" && isSecretary && (
            <Button type="button" variant="primary" onClick={handlePublish} disabled={isTransitioning}>
              Publish
            </Button>
          )}
          {drive.status === "DRAFT" && !isSecretary && (
            <p className="self-center text-xs text-(--color-text-secondary)">
              Only the Secretary can publish a drive.
            </p>
          )}
          {nextStatusOptions(drive.status).map((status) => (
            <Button
              key={status}
              type="button"
              variant={status === "CLOSED" ? "destructive" : "secondary"}
              onClick={() => handleSetStatus(status)}
              disabled={isTransitioning}
            >
              Move to {status.replace("_", " ")}
            </Button>
          ))}
        </div>
      </Card>

      <PlacementDriveFormModal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        accessToken={accessToken}
        companies={companies}
        batches={batches}
        drive={drive}
        onSaved={() => void load()}
      />
    </div>
  );
}
