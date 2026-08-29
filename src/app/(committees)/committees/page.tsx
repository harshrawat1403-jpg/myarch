"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Plus, Landmark } from "lucide-react";
import { useAuth } from "@/modules/auth/client";
import { apiClient, ApiError } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { CardTitle, PageTitle } from "@/components/ui/typography";
import { EmptyState } from "@/components/empty-state";
import { useToast } from "@/components/ui/toast";
import { FilterBar } from "@/components/ui/filter-bar";
import { Pagination } from "@/components/ui/pagination";
import { CardGridSkeleton } from "@/components/ui/skeleton";
import { COMMITTEE_STATUS_BADGE } from "@/design-system/status-badges";
import { CreateCommitteeModal } from "./create-committee-modal";

interface CommitteeListItem {
  id: string;
  name: string;
  type: string;
  status: "ACTIVE" | "ARCHIVED";
  academicYear: string | null;
}

const TYPE_LABELS: Record<string, string> = {
  STUDENT_COUNCIL: "Student Council",
  CORE_COMMITTEE: "Core Committee",
  EVENT_COMMITTEE: "Event Committee",
  TECHNICAL_COMMITTEE: "Technical Committee",
  PROJECT_TEAM: "Project Team",
  TEMPORARY_COMMITTEE: "Temporary Committee",
};

const PAGE_SIZE = 20;

/** MYARCH Phase 4 (§5) — Council & Committees list. Broadly visible (canViewCommittee — everyone but Recruiter); "New Committee" only for Secretary/Coordinator client-side (server re-checks via canCreateCommittee regardless). */
export default function CommitteesListPage() {
  const { accessToken, role } = useAuth();
  const toast = useToast();

  const [committees, setCommittees] = useState<CommitteeListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [type, setType] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const canCreate = role === "SECRETARY" || role === "COORDINATOR";

  const load = useCallback(async () => {
    if (!accessToken) return;
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (type) params.set("type", type);
      params.set("status", "ACTIVE");
      params.set("page", String(page));
      params.set("pageSize", String(PAGE_SIZE));
      const res = await apiClient.getWithMeta<CommitteeListItem[], { total: number }>(
        `/api/committees?${params.toString()}`,
        accessToken,
      );
      setCommittees(res.data);
      setTotal(res.meta.total);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Unable to load committees.");
    } finally {
      setIsLoading(false);
    }
  }, [accessToken, type, page]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  function handleFilterSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPage(1);
    void load();
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <PageTitle className="font-semibold">Committees</PageTitle>
          <p className="mt-1 text-sm text-(--color-text-secondary)">
            Student Council, Core Committee, and every other active committee, project team, or working group.
          </p>
        </div>
        {canCreate && (
          <Button type="button" variant="primary" onClick={() => setIsCreateOpen(true)} className="gap-2">
            <Plus aria-hidden="true" size={16} strokeWidth={1.75} />
            New Committee
          </Button>
        )}
      </div>

      <FilterBar onSubmit={handleFilterSubmit}>
        <div className="min-w-56">
          <Label htmlFor="filter-committee-type">Type</Label>
          <Select id="filter-committee-type" value={type} onChange={(e) => setType(e.target.value)}>
            <option value="">All types</option>
            {Object.entries(TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </div>
      </FilterBar>

      {error && <p className="text-sm text-(--color-danger)">{error}</p>}
      {isLoading && <CardGridSkeleton />}

      {!isLoading && !error && committees.length === 0 && (
        <Card>
          <EmptyState icon={Landmark} message="No committees match these filters." />
        </Card>
      )}

      {!isLoading && !error && committees.length > 0 && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {committees.map((committee) => (
            <Card key={committee.id} className="transition-shadow duration-150 hover:shadow-md">
              <div className="flex items-start justify-between gap-2">
                <Link href={`/committees/${committee.id}`}>
                  <CardTitle className="text-(--color-accent)">{committee.name}</CardTitle>
                </Link>
                <Badge variant={COMMITTEE_STATUS_BADGE[committee.status]}>{committee.status}</Badge>
              </div>
              <p className="mt-2 text-xs text-(--color-text-secondary)">
                {TYPE_LABELS[committee.type] ?? committee.type}
                {committee.academicYear ? ` · ${committee.academicYear}` : ""}
              </p>
            </Card>
          ))}
        </div>
      )}

      {!isLoading && <Pagination page={page} pageSize={PAGE_SIZE} totalItems={total} onPageChange={setPage} />}

      <CreateCommitteeModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        accessToken={accessToken}
        onCreated={() => {
          toast.success("Committee created.");
          void load();
        }}
      />
    </div>
  );
}
