"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useParams, useRouter } from "next/navigation";
import { ChevronLeft, History, KeyRound } from "lucide-react";
import { useAuth } from "@/modules/auth/client";
import { apiClient, ApiError } from "@/lib/api-client";
import { formatAuditAction } from "@/lib/format-audit-action";
import type { RecruiterAccountRecord } from "@/modules/recruiters";
import type { AuditLogEntry } from "@/lib/audit";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { DataLabel } from "@/components/ui/typography";
import { DashboardPanel } from "@/components/dashboard-panel";
import { RevealPasswordModal } from "@/components/ui/reveal-password-modal";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/empty-state";
import { useToast } from "@/components/ui/toast";

export default function RecruiterDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { accessToken } = useAuth();
  const router = useRouter();
  const toast = useToast();

  const [recruiter, setRecruiter] = useState<RecruiterAccountRecord | null>(null);
  const [activity, setActivity] = useState<AuditLogEntry[]>([]);
  const [fullName, setFullName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [confirmAction, setConfirmAction] = useState<"disable" | "enable" | null>(null);
  const [isActionWorking, setIsActionWorking] = useState(false);
  const [isResetOpen, setIsResetOpen] = useState(false);
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [isResetting, setIsResetting] = useState(false);
  const [isApprovalWorking, setIsApprovalWorking] = useState(false);

  const load = useCallback(async () => {
    if (!accessToken || !id) return;
    try {
      const [record, activityEntries] = await Promise.all([
        apiClient.get<RecruiterAccountRecord>(`/api/recruiters/admin/${id}`, accessToken),
        apiClient.get<AuditLogEntry[]>(`/api/recruiters/admin/${id}/activity`, accessToken).catch(() => []),
      ]);
      setRecruiter(record);
      setFullName(record.fullName);
      setCompanyName(record.companyName);
      setActivity(activityEntries);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Unable to load this recruiter.");
    }
  }, [accessToken, id]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  async function handleSaveDetails(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!recruiter || !accessToken) return;
    setIsSaving(true);
    setError(null);
    try {
      await apiClient.patch(`/api/recruiters/admin/${recruiter.id}`, { fullName, companyName }, accessToken);
      toast.success("Recruiter updated.");
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Unable to update recruiter.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleConfirmSetActive() {
    if (!recruiter || !accessToken || !confirmAction) return;
    setIsActionWorking(true);
    try {
      await apiClient.post(`/api/recruiters/admin/${recruiter.id}/${confirmAction}`, undefined, accessToken);
      toast.success(confirmAction === "disable" ? "Recruiter disabled." : "Recruiter enabled.");
      setConfirmAction(null);
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Unable to update status.");
    } finally {
      setIsActionWorking(false);
    }
  }

  async function handleResetPassword() {
    if (!recruiter || !accessToken) return;
    setIsResetting(true);
    try {
      const result = await apiClient.post<{ tempPassword: string }>(
        `/api/recruiters/admin/${recruiter.id}/reset-password`,
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

  async function handleApprovalDecision(decision: "approve" | "reject") {
    if (!recruiter || !accessToken) return;
    setIsApprovalWorking(true);
    try {
      await apiClient.post(`/api/recruiters/admin/${recruiter.id}/${decision}`, undefined, accessToken);
      toast.success(decision === "approve" ? "Recruiter approved." : "Recruiter rejected.");
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Unable to record the decision.");
    } finally {
      setIsApprovalWorking(false);
    }
  }

  if (error && !recruiter) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-(--color-danger)">{error}</p>
        <Button variant="secondary" onClick={() => router.push("/dashboard/admin/recruiters")}>
          Back to Recruiters
        </Button>
      </div>
    );
  }

  if (!recruiter) {
    return <p className="text-sm text-(--color-text-secondary)">Loading…</p>;
  }

  return (
    <div className="max-w-2xl space-y-6">
      <Link
        href="/dashboard/admin/recruiters"
        className="inline-flex items-center gap-1 text-sm font-medium text-(--color-accent) hover:underline"
      >
        <ChevronLeft aria-hidden="true" size={16} strokeWidth={2} />
        Back to Recruiters
      </Link>

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold text-(--color-text-primary)">
            {recruiter.fullName}
          </h1>
          <p className="text-sm text-(--color-text-secondary)">{recruiter.email}</p>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge variant={recruiter.isActive ? "active" : "archived"}>
            {recruiter.isActive ? "Active" : "Disabled"}
          </Badge>
          {recruiter.approvalStatus !== "APPROVED" && (
            <Badge variant={recruiter.approvalStatus === "PENDING" ? "pending" : "rejected"}>
              {recruiter.approvalStatus === "PENDING" ? "Pending" : "Rejected"}
            </Badge>
          )}
        </div>
      </div>

      {error && <p className="text-sm text-(--color-danger)">{error}</p>}

      {recruiter.approvalStatus === "PENDING" && (
        <Card className="border-t-2 border-t-(--color-warning)">
          <DataLabel>Awaiting Approval</DataLabel>
          <p className="mt-1 text-sm text-(--color-text-secondary)">
            This recruiter signed up and is waiting for a decision before they can access the platform.
          </p>
          <div className="mt-3 flex gap-3">
            <Button type="button" variant="primary" disabled={isApprovalWorking} onClick={() => handleApprovalDecision("approve")}>
              Approve
            </Button>
            <Button type="button" variant="destructive" disabled={isApprovalWorking} onClick={() => handleApprovalDecision("reject")}>
              Reject
            </Button>
          </div>
        </Card>
      )}

      <Card>
        <form onSubmit={handleSaveDetails} className="space-y-4">
          <div>
            <Label htmlFor="fullName">Name</Label>
            <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="companyName">Company</Label>
            <Input id="companyName" value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
          </div>
          <div className="border-t border-(--color-border) pt-4">
            <Button
              type="submit"
              variant="secondary"
              disabled={
                isSaving ||
                (fullName.trim() === recruiter.fullName && companyName.trim() === recruiter.companyName)
              }
            >
              {isSaving ? "Saving…" : "Save changes"}
            </Button>
          </div>
        </form>
      </Card>

      <DashboardPanel title="Password" icon={KeyRound}>
        <p className="text-sm text-(--color-text-secondary)">
          Issue a new temporary password. The recruiter will be required to change it on their next sign-in, and
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
          {recruiter.isActive
            ? "Disabling immediately revokes access and signs the recruiter out of every session."
            : "Enabling restores this recruiter's access."}
        </p>
        <Button
          type="button"
          variant="destructive"
          className="mt-3"
          onClick={() => setConfirmAction(recruiter.isActive ? "disable" : "enable")}
        >
          {recruiter.isActive ? "Disable Recruiter" : "Enable Recruiter"}
        </Button>
      </Card>

      <ConfirmDialog
        isOpen={confirmAction !== null}
        onClose={() => setConfirmAction(null)}
        onConfirm={handleConfirmSetActive}
        title={confirmAction === "disable" ? "Disable this recruiter?" : "Enable this recruiter?"}
        description={
          confirmAction === "disable"
            ? `${recruiter.fullName} will immediately lose access and be signed out of every session.`
            : `${recruiter.fullName} will regain access.`
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
        description={<>Share this temporary password with {recruiter.fullName} — it will not be shown again.</>}
      >
        <div className="space-y-4">
          <p className="text-sm text-(--color-text-secondary)">
            This generates a new temporary password and immediately signs {recruiter.fullName} out of every
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
