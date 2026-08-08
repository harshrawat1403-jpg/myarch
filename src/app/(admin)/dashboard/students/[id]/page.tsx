"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Archive, ChevronLeft, GraduationCap, KeyRound, Layers, RotateCcw } from "lucide-react";
import { useAuth } from "@/modules/auth/client";
import { apiClient, ApiError } from "@/lib/api-client";
import type { StudentRecord } from "@/modules/students";
import type { Batch } from "@/modules/batches";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { DataLabel } from "@/components/ui/typography";
import { DashboardPanel } from "@/components/dashboard-panel";
import { RevealPasswordModal } from "@/components/ui/reveal-password-modal";
import { useToast } from "@/components/ui/toast";

export default function StudentDetailPage() {
  const params = useParams<{ id: string }>();
  const studentId = params.id;
  const { accessToken } = useAuth();
  const router = useRouter();
  const toast = useToast();

  const [student, setStudent] = useState<StudentRecord | null>(null);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [selectedBatchId, setSelectedBatchId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isResetOpen, setIsResetOpen] = useState(false);
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [isResetting, setIsResetting] = useState(false);

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

  async function handleResetPassword() {
    if (!accessToken || !student) return;
    setIsResetting(true);
    try {
      const result = await apiClient.post<{ tempPassword: string }>(
        `/api/students/${studentId}/reset-password`,
        undefined,
        accessToken,
      );
      setTempPassword(result.tempPassword);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Unable to reset password.");
      setIsResetOpen(false);
    } finally {
      setIsResetting(false);
    }
  }

  if (error && !student) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-(--color-danger)">{error}</p>
        <Button variant="secondary" onClick={() => router.push("/dashboard/students")}>
          Back to students
        </Button>
      </div>
    );
  }

  if (!student) {
    return <p className="text-sm text-(--color-text-secondary)">Loading…</p>;
  }

  return (
    <div className="max-w-2xl space-y-6">
      <Link
        href="/dashboard/students"
        className="inline-flex items-center gap-1 text-sm font-medium text-(--color-accent) hover:underline"
      >
        <ChevronLeft aria-hidden="true" size={16} strokeWidth={2} />
        Back to Students
      </Link>

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold text-(--color-text-primary)">
            {student.fullName}
          </h1>
          <p className="mt-0.5 flex items-center gap-1.5 text-sm text-(--color-text-secondary)">
            <GraduationCap aria-hidden="true" size={14} strokeWidth={1.75} />
            Roll {student.rollNumber}
          </p>
        </div>
        <Badge variant={student.isActive ? "active" : "archived"}>
          {student.isActive ? "Active" : "Archived"}
        </Badge>
      </div>

      {notice && <p className="text-sm text-(--color-success)">{notice}</p>}
      {error && <p className="text-sm text-(--color-danger)">{error}</p>}

      <Card>
        <dl className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
          <div>
            <DataLabel>Roll Number</DataLabel>
            <dd className="mt-0.5 text-(--color-text-primary)">{student.rollNumber}</dd>
          </div>
          <div>
            <DataLabel>CGPA</DataLabel>
            <dd className="mt-0.5 text-(--color-text-primary)">{student.private.cgpa ?? "—"}</dd>
          </div>
          <div>
            <DataLabel>Phone</DataLabel>
            <dd className="mt-0.5 text-(--color-text-primary)">{student.private.phone ?? "—"}</dd>
          </div>
          <div>
            <DataLabel>Personal Email</DataLabel>
            <dd className="mt-0.5 break-words text-(--color-text-primary)">{student.private.personalEmail ?? "—"}</dd>
          </div>
          <div>
            <DataLabel>Active Backlog</DataLabel>
            <dd className="mt-0.5 text-(--color-text-primary)">{student.private.hasActiveBacklog ? "Yes" : "No"}</dd>
          </div>
        </dl>
        {student.private.internalRemarks && (
          <div className="mt-4 border-t border-(--color-border) pt-4">
            <DataLabel>Internal Remarks</DataLabel>
            <p className="mt-1 text-sm text-(--color-text-primary)">{student.private.internalRemarks}</p>
          </div>
        )}
        <p className="mt-4 border-t border-(--color-border) pt-3 text-xs text-(--color-text-secondary)">
          Private profile · last updated {new Date(student.updatedAt).toISOString().slice(0, 10)}
        </p>
      </Card>

      <DashboardPanel title="Batch Reassignment" icon={Layers}>
        <div className="space-y-3">
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
      </DashboardPanel>

      <DashboardPanel title="Password" icon={KeyRound}>
        <p className="text-sm text-(--color-text-secondary)">
          Issue a new temporary password. The student will be required to change it on their next sign-in, and
          every existing session will be signed out immediately.
        </p>
        <Button type="button" variant="secondary" className="mt-3" onClick={() => setIsResetOpen(true)}>
          Reset Password
        </Button>
      </DashboardPanel>

      <Button
        variant={student.isActive ? "destructive" : "primary"}
        onClick={handleArchiveToggle}
        className="gap-2"
      >
        {student.isActive ? (
          <Archive aria-hidden="true" size={16} strokeWidth={1.75} />
        ) : (
          <RotateCcw aria-hidden="true" size={16} strokeWidth={1.75} />
        )}
        {student.isActive ? "Archive Student" : "Restore Student"}
      </Button>

      <RevealPasswordModal
        isOpen={isResetOpen}
        onClose={() => {
          setIsResetOpen(false);
          setTempPassword(null);
        }}
        pendingTitle="Reset password?"
        revealedTitle="Password reset"
        tempPassword={tempPassword}
        description={<>Share this temporary password with {student.fullName} — it will not be shown again.</>}
      >
        <div className="space-y-4">
          <p className="text-sm text-(--color-text-secondary)">
            This generates a new temporary password and immediately signs {student.fullName} out of every
            session. They&apos;ll need to set a new password on their next sign-in.
          </p>
          <div className="flex justify-end gap-3 border-t border-(--color-border) pt-4">
            <Button type="button" variant="ghost" onClick={() => setIsResetOpen(false)} disabled={isResetting}>
              Cancel
            </Button>
            <Button type="button" variant="primary" onClick={handleResetPassword} disabled={isResetting}>
              {isResetting ? "Resetting…" : "Reset Password"}
            </Button>
          </div>
        </div>
      </RevealPasswordModal>
    </div>
  );
}
