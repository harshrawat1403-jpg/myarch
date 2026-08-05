"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/modules/auth/client";
import { apiClient, ApiError } from "@/lib/api-client";
import type { StudentRecord } from "@/modules/students";
import type { Batch } from "@/modules/batches";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { TitleBlock } from "@/components/title-block";

export default function StudentDetailPage() {
  const params = useParams<{ id: string }>();
  const studentId = params.id;
  const { accessToken } = useAuth();
  const router = useRouter();

  const [student, setStudent] = useState<StudentRecord | null>(null);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [selectedBatchId, setSelectedBatchId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function load() {
    if (!accessToken) return;
    try {
      const [record, batchList] = await Promise.all([
        apiClient.get<StudentRecord>(`/api/students/${studentId}`, accessToken),
        apiClient.get<Batch[]>("/api/batches", accessToken),
      ]);
      setStudent(record);
      setBatches(batchList);
      setSelectedBatchId(record.batchId);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Unable to load this student.");
    }
  }

  useEffect(() => {
    // load() only sets state after its own awaited fetch resolves — a
    // standard fetch-on-mount effect (see students/page.tsx for the same
    // justification).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken, studentId]);

  async function handleArchiveToggle() {
    if (!accessToken || !student) return;
    const action = student.isActive ? "archive" : "restore";
    try {
      await apiClient.post(`/api/students/${studentId}/${action}`, undefined, accessToken);
      setNotice(student.isActive ? "Student archived." : "Student restored.");
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Unable to update student status.");
    }
  }

  async function handleReassign() {
    if (!accessToken || !student || selectedBatchId === student.batchId) return;
    try {
      await apiClient.patch(`/api/students/${studentId}`, { batchId: selectedBatchId }, accessToken);
      setNotice("Batch reassignment saved.");
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Unable to reassign batch.");
    }
  }

  if (error && !student) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-red-400">{error}</p>
        <Button variant="secondary" onClick={() => router.push("/dashboard/students")}>
          Back to students
        </Button>
      </div>
    );
  }

  if (!student) {
    return <p className="text-sm text-[--color-text-secondary]">Loading…</p>;
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-[family-name:var(--font-display)] text-2xl text-[--color-text-primary]">
          {student.fullName}
        </h1>
        <Badge variant={student.isActive ? "active" : "archived"}>
          {student.isActive ? "Active" : "Archived"}
        </Badge>
      </div>

      {notice && <p className="text-sm text-[--color-accent]">{notice}</p>}
      {error && <p className="text-sm text-red-400">{error}</p>}

      <div className="rounded-lg border border-[--color-text-secondary]/20 bg-[--color-surface] p-5">
        <dl className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <dt className="text-[--color-text-secondary]">Roll Number</dt>
            <dd className="text-[--color-text-primary]">{student.rollNumber}</dd>
          </div>
          <div>
            <dt className="text-[--color-text-secondary]">CGPA</dt>
            <dd className="text-[--color-text-primary]">{student.private.cgpa ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-[--color-text-secondary]">Phone</dt>
            <dd className="text-[--color-text-primary]">{student.private.phone ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-[--color-text-secondary]">Personal Email</dt>
            <dd className="text-[--color-text-primary]">{student.private.personalEmail ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-[--color-text-secondary]">Active Backlog</dt>
            <dd className="text-[--color-text-primary]">{student.private.hasActiveBacklog ? "Yes" : "No"}</dd>
          </div>
        </dl>
        {student.private.internalRemarks && (
          <div className="mt-4">
            <p className="text-[--color-text-secondary] text-sm">Internal Remarks</p>
            <p className="text-sm text-[--color-text-primary]">{student.private.internalRemarks}</p>
          </div>
        )}
        <TitleBlock
          project={student.fullName}
          scale={`Roll ${student.rollNumber}`}
          date={student.updatedAt}
          drawnBy="Private Profile"
        />
      </div>

      <div className="rounded-lg border border-[--color-text-secondary]/20 bg-[--color-surface] p-5 space-y-3">
        <h2 className="font-[family-name:var(--font-display)] text-lg text-[--color-text-primary]">
          Batch Reassignment
        </h2>
        <Select value={selectedBatchId} onChange={(e) => setSelectedBatchId(e.target.value)}>
          {batches.map((batch) => (
            <option key={batch.id} value={batch.id}>
              {batch.name}
            </option>
          ))}
        </Select>
        <Button variant="secondary" onClick={handleReassign} disabled={selectedBatchId === student.batchId}>
          Save Batch Reassignment
        </Button>
      </div>

      <Button variant={student.isActive ? "destructive" : "primary"} onClick={handleArchiveToggle}>
        {student.isActive ? "Archive Student" : "Restore Student"}
      </Button>
    </div>
  );
}
