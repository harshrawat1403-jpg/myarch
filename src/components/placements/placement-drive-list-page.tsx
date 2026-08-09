"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Briefcase, Plus } from "lucide-react";
import { useAuth } from "@/modules/auth/client";
import { apiClient, ApiError } from "@/lib/api-client";
import type { CompanyRecord } from "@/modules/companies";
import type { Batch } from "@/modules/batches";
import type { PlacementDriveRecord, PlacementDriveStatus, PlacementDriveType } from "@/modules/placements";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { Label } from "@/components/ui/input";
import { Badge, type BadgeVariant } from "@/components/ui/badge";
import { CardTitle, DataLabel } from "@/components/ui/typography";
import { EmptyState } from "@/components/empty-state";
import { PlacementDriveFormModal } from "./placement-drive-form-modal";

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

export interface PlacementDriveListPageProps {
  /** Present on /dashboard/internships — locks the list, filters, and create form to INTERNSHIP drives. Absent on /dashboard/placement-drives, which shows every type. */
  fixedType?: PlacementDriveType;
}

/**
 * V4.0 D2 (§14) — the Secretary/Coordinator drive list + creation entry
 * point. Shared by /dashboard/placement-drives and /dashboard/internships
 * (§0/§5.1: Internships are a `type` variant of the same PlacementDrive
 * model, never a parallel entity/page pair) — the only difference between
 * the two routes is `fixedType`. The per-drive applicant board and
 * interview sub-panel are D3's job, not built here.
 */
export function PlacementDriveListPage({ fixedType }: PlacementDriveListPageProps) {
  const { accessToken } = useAuth();

  const [drives, setDrives] = useState<PlacementDriveRecord[]>([]);
  const [companies, setCompanies] = useState<CompanyRecord[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [statusFilter, setStatusFilter] = useState<PlacementDriveStatus | "">("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const load = useCallback(async () => {
    if (!accessToken) return;
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (fixedType) params.set("type", fixedType);
      if (statusFilter) params.set("status", statusFilter);
      const [driveResults, companyResults, batchResults] = await Promise.all([
        apiClient.get<PlacementDriveRecord[]>(`/api/placements/drives?${params.toString()}`, accessToken),
        apiClient.get<CompanyRecord[]>("/api/companies", accessToken),
        apiClient.get<Batch[]>("/api/batches", accessToken),
      ]);
      setDrives(driveResults);
      setCompanies(companyResults);
      setBatches(batchResults);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Unable to load placement drives.");
    } finally {
      setIsLoading(false);
    }
  }, [accessToken, fixedType, statusFilter]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const heading = fixedType === "INTERNSHIP" ? "Internships" : "Placement Drives";
  const createLabel = fixedType === "INTERNSHIP" ? "New Internship" : "New Drive";

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold text-(--color-text-primary)">
            {heading}
          </h1>
          <p className="mt-1 text-sm text-(--color-text-secondary)">
            {fixedType === "INTERNSHIP"
              ? "Internship drives — the same placement lifecycle, tracked through Active and Completed."
              : "Company drives open to your students."}
          </p>
        </div>
        <Button type="button" variant="primary" onClick={() => setIsCreateOpen(true)} className="gap-2">
          <Plus aria-hidden="true" size={16} strokeWidth={1.75} />
          {createLabel}
        </Button>
      </div>

      <Card>
        <div className="max-w-xs">
          <Label htmlFor="status-filter">Status</Label>
          <Select
            id="status-filter"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as PlacementDriveStatus | "")}
          >
            <option value="">All statuses</option>
            <option value="DRAFT">Draft</option>
            <option value="ANNOUNCED">Announced</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="CLOSED">Closed</option>
          </Select>
        </div>
      </Card>

      {error && <p className="text-sm text-(--color-danger)">{error}</p>}
      {isLoading && <p className="text-sm text-(--color-text-secondary)">Loading…</p>}

      {!isLoading && drives.length === 0 && (
        <Card>
          <EmptyState icon={Briefcase} message={`No ${fixedType === "INTERNSHIP" ? "internships" : "drives"} yet.`} />
        </Card>
      )}

      {!isLoading && drives.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {drives.map((drive) => (
            <Link key={drive.id} href={`/dashboard/placement-drives/${drive.id}`} className="block">
              <Card className="h-full transition-[border-color,box-shadow] duration-150 hover:border-(--color-accent) hover:shadow-md">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle>{drive.title}</CardTitle>
                  <Badge variant={statusBadgeVariant(drive.status)}>{drive.status}</Badge>
                </div>
                <DataLabel className="mt-1">{drive.companyName}</DataLabel>
                {drive.packageOrStipend && <p className="mt-2 text-sm text-(--color-text-primary)">{drive.packageOrStipend}</p>}
                {drive.applicationDeadline && (
                  <p className="mt-1 text-xs text-(--color-text-secondary)">
                    Deadline: {new Date(drive.applicationDeadline).toISOString().slice(0, 10)}
                  </p>
                )}
              </Card>
            </Link>
          ))}
        </div>
      )}

      <PlacementDriveFormModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        accessToken={accessToken}
        companies={companies}
        batches={batches}
        fixedType={fixedType}
        onSaved={() => void load()}
      />
    </div>
  );
}
