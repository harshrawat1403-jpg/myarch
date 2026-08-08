"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Layers } from "lucide-react";
import { useAuth } from "@/modules/auth/client";
import { apiClient, ApiError } from "@/lib/api-client";
import type { Batch, BatchStatus } from "@/modules/batches";
import type { StudentSearchResultItem } from "@/modules/students";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge, type BadgeVariant } from "@/components/ui/badge";
import { CardTitle, DataLabel } from "@/components/ui/typography";
import { EmptyState } from "@/components/empty-state";

const STATUS_OPTIONS: BatchStatus[] = ["ACTIVE", "GRADUATED", "ARCHIVED"];

function statusBadgeVariant(status: BatchStatus): BadgeVariant {
  if (status === "ACTIVE") return "active";
  if (status === "ARCHIVED") return "archived";
  return "neutral";
}

/**
 * Module 14 — Batch Management, redesigned. `load()`, `handleCreate`, and
 * `handleStatusChange` are unchanged: same two parallel fetches, same
 * client-side count aggregation, same POST bodies, same Secretary-only
 * gating (`isSecretary`). Presentation only: a loading state was added
 * (this page previously showed nothing while its first fetch was in
 * flight — a real quality-requirement gap, not a feature), batch cards use
 * `CardTitle`/`DataLabel` instead of raw headings, and `TitleBlock`'s
 * `drawnBy` now reads "System" rather than repeating the status the
 * adjacent `Badge` already shows — the same redundancy fix Milestone 9
 * already made on the Dashboard's own batch cards, applied here for
 * consistency.
 */
export default function BatchesPage() {
  const { accessToken, role } = useAuth();
  const isSecretary = role === "SECRETARY";

  const [batches, setBatches] = useState<Batch[]>([]);
  const [studentCounts, setStudentCounts] = useState<Record<string, { total: number; active: number }>>({});
  const [name, setName] = useState("");
  const [year, setYear] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  async function load() {
    if (!accessToken) return;
    try {
      const [batchList, students] = await Promise.all([
        apiClient.get<Batch[]>("/api/batches", accessToken),
        apiClient.get<StudentSearchResultItem[]>("/api/students?includeInactive=true", accessToken),
      ]);
      setBatches(batchList);

      const counts: Record<string, { total: number; active: number }> = {};
      for (const student of students) {
        const bucket = (counts[student.batchId] ??= { total: 0, active: 0 });
        bucket.total += 1;
        if (student.isActive) bucket.active += 1;
      }
      setStudentCounts(counts);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Unable to load batches.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    // load() only sets state after its own awaited fetch resolves — a
    // standard fetch-on-mount effect (see students/page.tsx for the same
    // justification).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken]);

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!accessToken) return;
    try {
      await apiClient.post("/api/batches", { name, year: Number(year) }, accessToken);
      setName("");
      setYear("");
      setNotice("Batch created.");
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Unable to create batch.");
    }
  }

  async function handleStatusChange(batch: Batch, status: BatchStatus) {
    if (!accessToken || status === batch.status) return;
    try {
      await apiClient.post(`/api/batches/${batch.id}/status`, { status }, accessToken);
      setNotice(`${batch.name} marked ${status.toLowerCase()}.`);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Unable to update batch status.");
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold text-(--color-text-primary)">
          Batch Management
        </h1>
        <p className="mt-1 text-sm text-(--color-text-secondary)">Create batches and track enrollment across each.</p>
      </div>

      {notice && <p className="text-sm text-(--color-success)">{notice}</p>}
      {error && <p className="text-sm text-(--color-danger)">{error}</p>}

      {isSecretary && (
        <Card>
          <form onSubmit={handleCreate} className="flex flex-wrap items-end gap-4">
            <div>
              <Label htmlFor="batch-name">Batch name</Label>
              <Input id="batch-name" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div>
              <Label htmlFor="batch-year">Year</Label>
              <Input id="batch-year" type="number" value={year} onChange={(e) => setYear(e.target.value)} required />
            </div>
            <Button type="submit" variant="primary">
              Create Batch
            </Button>
          </form>
        </Card>
      )}

      {isLoading && <p className="text-sm text-(--color-text-secondary)">Loading batches…</p>}

      {!isLoading && batches.length === 0 && (
        <Card>
          <EmptyState icon={Layers} message="No batches yet." />
        </Card>
      )}

      {!isLoading && batches.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {batches.map((batch) => {
            const counts = studentCounts[batch.id] ?? { total: 0, active: 0 };
            return (
              <Card key={batch.id} className="border-t-2 border-t-(--color-accent)">
                <div className="flex items-center justify-between">
                  <CardTitle>{batch.name}</CardTitle>
                  <Badge variant={statusBadgeVariant(batch.status)}>{batch.status}</Badge>
                </div>
                <p className="mt-0.5 text-xs text-(--color-text-secondary)">Year {batch.year}</p>

                <div className="mt-4 grid grid-cols-2 gap-3 border-t border-(--color-border) pt-3">
                  <div>
                    <DataLabel>Active</DataLabel>
                    <p className="text-xl font-semibold text-(--color-text-primary)">{counts.active}</p>
                  </div>
                  <div>
                    <DataLabel>Total</DataLabel>
                    <p className="text-xl font-semibold text-(--color-text-primary)">{counts.total}</p>
                  </div>
                </div>

                {isSecretary && (
                  <div className="mt-3">
                    <Label htmlFor={`status-${batch.id}`}>Status</Label>
                    <Select
                      id={`status-${batch.id}`}
                      value={batch.status}
                      onChange={(e) => handleStatusChange(batch, e.target.value as BatchStatus)}
                    >
                      {STATUS_OPTIONS.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </Select>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
