"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useParams, useRouter } from "next/navigation";
import { ChevronLeft, History, KeyRound, Layers, Plus, X } from "lucide-react";
import { useAuth } from "@/modules/auth/client";
import { apiClient, ApiError } from "@/lib/api-client";
import { formatAuditAction } from "@/lib/format-audit-action";
import type { CoordinatorPosition, CoordinatorRecord } from "@/modules/coordinators";
import type { Batch } from "@/modules/batches";
import type { AuditLogEntry } from "@/lib/audit";
import { COORDINATOR_POSITION_OPTIONS } from "@/lib/coordinator-position";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { DataLabel } from "@/components/ui/typography";
import { DashboardPanel } from "@/components/dashboard-panel";
import { RevealPasswordModal } from "@/components/ui/reveal-password-modal";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/empty-state";
import { useToast } from "@/components/ui/toast";

export default function CoordinatorDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { accessToken } = useAuth();
  const router = useRouter();
  const toast = useToast();

  const [coordinator, setCoordinator] = useState<CoordinatorRecord | null>(null);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [activity, setActivity] = useState<AuditLogEntry[]>([]);
  const [fullName, setFullName] = useState("");
  const [position, setPosition] = useState<CoordinatorPosition | "">("");
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedNewBatchId, setSelectedNewBatchId] = useState("");
  const [confirmAction, setConfirmAction] = useState<"disable" | "enable" | null>(null);
  const [isActionWorking, setIsActionWorking] = useState(false);
  const [isResetOpen, setIsResetOpen] = useState(false);
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [isResetting, setIsResetting] = useState(false);

  const load = useCallback(async () => {
    if (!accessToken || !id) return;
    try {
      const [record, batchList, activityEntries] = await Promise.all([
        apiClient.get<CoordinatorRecord>(`/api/coordinators/${id}`, accessToken),
        apiClient.get<Batch[]>("/api/batches", accessToken),
        apiClient.get<AuditLogEntry[]>(`/api/coordinators/${id}/activity`, accessToken).catch(() => []),
      ]);
      setCoordinator(record);
      setFullName(record.fullName);
      setPosition(record.position ?? "");
      setBatches(batchList);
      setActivity(activityEntries);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Unable to load this coordinator.");
    }
  }, [accessToken, id]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  async function handleSaveDetails(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!coordinator || !accessToken) return;
    setIsSaving(true);
    setError(null);
    try {
      await apiClient.patch(`/api/coordinators/${coordinator.id}`, { fullName, position: position || null }, accessToken);
      toast.success("Details updated.");
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Unable to update details.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleAssignBatch() {
    if (!coordinator || !accessToken || !selectedNewBatchId) return;
    try {
      await apiClient.post(`/api/coordinators/${coordinator.id}/batches`, { batchId: selectedNewBatchId }, accessToken);
      setSelectedNewBatchId("");
      toast.success("Batch assigned.");
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Unable to assign batch.");
    }
  }

  async function handleRemoveBatch(batchId: string) {
    if (!coordinator || !accessToken) return;
    try {
      await apiClient.delete(`/api/coordinators/${coordinator.id}/batches?batchId=${batchId}`, accessToken);
      toast.success("Batch removed.");
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Unable to remove batch.");
    }
  }

  async function handleConfirmSetActive() {
    if (!coordinator || !accessToken || !confirmAction) return;
    setIsActionWorking(true);
    try {
      await apiClient.post(`/api/coordinators/${coordinator.id}/${confirmAction}`, undefined, accessToken);
      toast.success(confirmAction === "disable" ? "Coordinator disabled." : "Coordinator enabled.");
      setConfirmAction(null);
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Unable to update status.");
    } finally {
      setIsActionWorking(false);
    }
  }

  async function handleResetPassword() {
    if (!coordinator || !accessToken) return;
    setIsResetting(true);
    try {
      const result = await apiClient.post<{ tempPassword: string }>(
        `/api/coordinators/${coordinator.id}/reset-password`,
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

  if (error && !coordinator) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-(--color-danger)">{error}</p>
        <Button variant="secondary" onClick={() => router.push("/dashboard/admin/coordinators")}>
          Back to Coordinators
        </Button>
      </div>
    );
  }

  if (!coordinator) {
    return <p className="text-sm text-(--color-text-secondary)">Loading…</p>;
  }

  const assignableBatches = batches.filter((b) => !coordinator.batchIds.includes(b.id));
  const assignedBatches = batches.filter((b) => coordinator.batchIds.includes(b.id));

  return (
    <div className="max-w-2xl space-y-6">
      <Link
        href="/dashboard/admin/coordinators"
        className="inline-flex items-center gap-1 text-sm font-medium text-(--color-accent) hover:underline"
      >
        <ChevronLeft aria-hidden="true" size={16} strokeWidth={2} />
        Back to Coordinators
      </Link>

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold text-(--color-text-primary)">
            {coordinator.fullName}
          </h1>
          <p className="text-sm text-(--color-text-secondary)">{coordinator.email}</p>
        </div>
        <Badge variant={coordinator.isActive ? "active" : "archived"}>
          {coordinator.isActive ? "Active" : "Disabled"}
        </Badge>
      </div>

      {error && <p className="text-sm text-(--color-danger)">{error}</p>}

      <Card>
        <form onSubmit={handleSaveDetails} className="space-y-4">
          <div>
            <Label htmlFor="fullName">Name</Label>
            <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="position">Position</Label>
            <Select
              id="position"
              value={position}
              onChange={(e) => setPosition(e.target.value as CoordinatorPosition | "")}
            >
              <option value="">Unspecified</option>
              {COORDINATOR_POSITION_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </div>
          <div className="border-t border-(--color-border) pt-4">
            <Button
              type="submit"
              variant="secondary"
              disabled={isSaving || (fullName.trim() === coordinator.fullName && position === (coordinator.position ?? ""))}
            >
              {isSaving ? "Saving…" : "Save details"}
            </Button>
          </div>
        </form>
      </Card>

      <DashboardPanel title="Batch Assignments" icon={Layers}>
        <div className="space-y-3">
          {assignedBatches.length === 0 ? (
            <EmptyState icon={Layers} message="No batches assigned yet." />
          ) : (
            <div className="flex flex-wrap gap-2">
              {assignedBatches.map((batch) => (
                <span
                  key={batch.id}
                  className="inline-flex items-center gap-1.5 rounded-full bg-(--color-surface-muted) py-1 pl-3 pr-1.5 text-sm text-(--color-text-primary)"
                >
                  {batch.name}
                  <button
                    type="button"
                    onClick={() => handleRemoveBatch(batch.id)}
                    aria-label={`Remove ${batch.name}`}
                    className="inline-flex h-5 w-5 items-center justify-center rounded-full text-(--color-text-secondary) transition-colors duration-150 hover:bg-(--color-danger-soft) hover:text-(--color-danger)"
                  >
                    <X aria-hidden="true" size={12} strokeWidth={2} />
                  </button>
                </span>
              ))}
            </div>
          )}

          {assignableBatches.length > 0 && (
            <div className="flex items-end gap-3 border-t border-(--color-border) pt-3">
              <div className="flex-1">
                <Label htmlFor="add-batch">Assign a batch</Label>
                <Select id="add-batch" value={selectedNewBatchId} onChange={(e) => setSelectedNewBatchId(e.target.value)}>
                  <option value="">Select a batch…</option>
                  {assignableBatches.map((batch) => (
                    <option key={batch.id} value={batch.id}>
                      {batch.name}
                    </option>
                  ))}
                </Select>
              </div>
              <Button type="button" variant="secondary" onClick={handleAssignBatch} disabled={!selectedNewBatchId} className="gap-2">
                <Plus aria-hidden="true" size={16} strokeWidth={1.75} />
                Assign
              </Button>
            </div>
          )}
        </div>
      </DashboardPanel>

      <DashboardPanel title="Password" icon={KeyRound}>
        <p className="text-sm text-(--color-text-secondary)">
          Issue a new temporary password. The coordinator will be required to change it on their next sign-in, and
          every existing session will be signed out immediately.
        </p>
        <Button type="button" variant="secondary" className="mt-3" onClick={() => setIsResetOpen(true)}>
          Reset Password
        </Button>
      </DashboardPanel>

      <DashboardPanel title="Recent Activity" icon={History}>
        {activity.length === 0 ? (
          <EmptyState icon={History} message="No recent activity." />
        ) : (
          <ul className="space-y-2">
            {activity.map((entry) => (
              <li key={entry.id} className="flex items-baseline justify-between gap-3 text-sm">
                <span className="text-(--color-text-primary)">{formatAuditAction(entry.action)}</span>
                <span className="shrink-0 font-[family-name:var(--font-data)] text-xs text-(--color-text-secondary)">
                  {new Date(entry.occurredAt).toLocaleString()}
                </span>
              </li>
            ))}
          </ul>
        )}
      </DashboardPanel>

      <Card className="border-t-2 border-t-(--color-danger)">
        <DataLabel>Danger Zone</DataLabel>
        <p className="mt-1 text-sm text-(--color-text-secondary)">
          {coordinator.isActive
            ? "Disabling immediately revokes access and signs the coordinator out of every session."
            : "Enabling restores this coordinator's access."}
        </p>
        <Button
          type="button"
          variant="destructive"
          className="mt-3"
          onClick={() => setConfirmAction(coordinator.isActive ? "disable" : "enable")}
        >
          {coordinator.isActive ? "Disable Coordinator" : "Enable Coordinator"}
        </Button>
      </Card>

      <ConfirmDialog
        isOpen={confirmAction !== null}
        onClose={() => setConfirmAction(null)}
        onConfirm={handleConfirmSetActive}
        title={confirmAction === "disable" ? "Disable this coordinator?" : "Enable this coordinator?"}
        description={
          confirmAction === "disable"
            ? `${coordinator.fullName} will immediately lose access and be signed out of every session.`
            : `${coordinator.fullName} will regain access.`
        }
        confirmLabel={confirmAction === "disable" ? "Disable" : "Enable"}
        variant={confirmAction === "disable" ? "destructive" : "default"}
        isConfirming={isActionWorking}
      />

      <RevealPasswordModal
        isOpen={isResetOpen}
        onClose={() => {
          setIsResetOpen(false);
          setTempPassword(null);
        }}
        pendingTitle="Reset password?"
        revealedTitle="Password reset"
        tempPassword={tempPassword}
        description={
          <>Share this temporary password with {coordinator.fullName} — it will not be shown again.</>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-(--color-text-secondary)">
            This generates a new temporary password and immediately signs {coordinator.fullName} out of every
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
