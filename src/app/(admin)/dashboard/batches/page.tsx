"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useAuth } from "@/modules/auth/client";
import { apiClient, ApiError } from "@/lib/api-client";
import type { Batch, BatchStatus } from "@/modules/batches";
import type { StudentSearchResultItem } from "@/modules/students";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge, type BadgeVariant } from "@/components/ui/badge";
import { TitleBlock } from "@/components/title-block";

const STATUS_OPTIONS: BatchStatus[] = ["ACTIVE", "GRADUATED", "ARCHIVED"];

function statusBadgeVariant(status: BatchStatus): BadgeVariant {
  if (status === "ACTIVE") return "active";
  if (status === "ARCHIVED") return "archived";
  return "neutral";
}

export default function BatchesPage() {
  const { accessToken, role } = useAuth();
  const isSecretary = role === "SECRETARY";

  const [batches, setBatches] = useState<Batch[]>([]);
  const [studentCounts, setStudentCounts] = useState<Record<string, { total: number; active: number }>>({});
  const [name, setName] = useState("");
  const [year, setYear] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

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
    <div className="space-y-6">
      <h1 className="font-[family-name:var(--font-display)] text-2xl text-[--color-text-primary]">
        Batch Management
      </h1>

      {notice && <p className="text-sm text-[--color-accent]">{notice}</p>}
      {error && <p className="text-sm text-red-400">{error}</p>}

      {isSecretary && (
        <form
          onSubmit={handleCreate}
          className="flex flex-wrap items-end gap-4 rounded-lg border border-[--color-text-secondary]/20 bg-[--color-surface] p-5"
        >
          <div>
            <Label htmlFor="batch-name">Batch name</Label>
            <Input id="batch-name" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div>
            <Label htmlFor="batch-year">Year</Label>
            <Input
              id="batch-year"
              type="number"
              value={year}
              onChange={(e) => setYear(e.target.value)}
              required
            />
          </div>
          <Button type="submit" variant="primary">
            Create Batch
          </Button>
        </form>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {batches.map((batch) => {
          const counts = studentCounts[batch.id] ?? { total: 0, active: 0 };
          return (
            <div key={batch.id} className="rounded-lg border border-[--color-text-secondary]/20 bg-[--color-surface] p-5">
              <div className="flex items-center justify-between">
                <h2 className="font-[family-name:var(--font-display)] text-lg text-[--color-text-primary]">
                  {batch.name}
                </h2>
                <Badge variant={statusBadgeVariant(batch.status)}>{batch.status}</Badge>
              </div>
              <p className="mt-2 font-[family-name:var(--font-data)] text-sm text-[--color-text-secondary]">
                {counts.active} active / {counts.total} total students
              </p>

              {isSecretary && (
                <div className="mt-3 flex items-center gap-2">
                  <Select
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

              <TitleBlock project={batch.name} scale={`Year ${batch.year}`} date={batch.updatedAt} drawnBy={batch.status} />
            </div>
          );
        })}
        {batches.length === 0 && <p className="text-sm text-[--color-text-secondary]">No batches yet.</p>}
      </div>
    </div>
  );
}
