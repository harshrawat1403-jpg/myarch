"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Building2, Plus, UserCheck } from "lucide-react";
import { useAuth } from "@/modules/auth/client";
import { apiClient, ApiError } from "@/lib/api-client";
import { useRowSelection } from "@/lib/use-row-selection";
import type { RecruiterAccountRecord } from "@/modules/recruiters";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { StatPanel } from "@/components/ui/stat-panel";
import { CardTitle } from "@/components/ui/typography";
import { RevealPasswordModal } from "@/components/ui/reveal-password-modal";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { FloatingActionBar } from "@/components/ui/floating-action-bar";
import {
  Table,
  TableBody,
  TableCell,
  TableCheckboxCell,
  TableCheckboxHeaderCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/empty-state";
import { useToast } from "@/components/ui/toast";

/**
 * Module 5 of the V3.0 Administration Platform — Recruiter Management,
 * Secretary-only (matches every /api/recruiters/admin route's own role
 * gate). Mirrors the Coordinators list page exactly, substituting company
 * name for batch assignment and surfacing Approve/Reject for any PENDING
 * row (dormant today — every Secretary-created recruiter is pre-approved —
 * but real and tested for a future public-signup phase).
 */
export default function RecruitersPage() {
  const { accessToken } = useAuth();
  const toast = useToast();

  const [recruiters, setRecruiters] = useState<RecruiterAccountRecord[]>([]);
  const [name, setName] = useState("");
  const [includeInactive, setIncludeInactive] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [confirmBulkAction, setConfirmBulkAction] = useState<"enable" | "disable" | null>(null);
  const [isBulkWorking, setIsBulkWorking] = useState(false);

  const selection = useRowSelection(recruiters, (r) => r.id);

  const load = useCallback(async () => {
    if (!accessToken) return;
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (name) params.set("name", name);
      if (includeInactive) params.set("includeInactive", "true");
      const results = await apiClient.get<RecruiterAccountRecord[]>(
        `/api/recruiters/admin?${params.toString()}`,
        accessToken,
      );
      setRecruiters(results);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Unable to load recruiters.");
    } finally {
      setIsLoading(false);
    }
  }, [accessToken, name, includeInactive]);

  useEffect(() => {
    // load() only sets state after its own awaited fetch resolves — the
    // same fetch-on-mount pattern every other admin list page uses.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  function handleSearchSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void load();
  }

  async function handleBulkConfirm() {
    if (!confirmBulkAction || !accessToken) return;
    setIsBulkWorking(true);
    try {
      const result = await apiClient.post<{ succeeded: string[]; failed: { id: string; error: string }[] }>(
        "/api/recruiters/admin/bulk/set-active",
        { recruiterIds: [...selection.selectedIds], isActive: confirmBulkAction === "enable" },
        accessToken,
      );
      toast.success(
        result.failed.length === 0
          ? `${result.succeeded.length} recruiter(s) ${confirmBulkAction}d.`
          : `${result.succeeded.length} succeeded, ${result.failed.length} failed.`,
      );
      selection.clear();
      setConfirmBulkAction(null);
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Bulk action failed.");
    } finally {
      setIsBulkWorking(false);
    }
  }

  async function handleApprove(recruiterId: string) {
    if (!accessToken) return;
    try {
      await apiClient.post(`/api/recruiters/admin/${recruiterId}/approve`, undefined, accessToken);
      toast.success("Recruiter approved.");
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Unable to approve recruiter.");
    }
  }

  async function handleReject(recruiterId: string) {
    if (!accessToken) return;
    try {
      await apiClient.post(`/api/recruiters/admin/${recruiterId}/reject`, undefined, accessToken);
      toast.success("Recruiter rejected.");
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Unable to reject recruiter.");
    }
  }

  const activeCount = recruiters.filter((r) => r.isActive).length;
  const pendingCount = recruiters.filter((r) => r.approvalStatus === "PENDING").length;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold text-(--color-text-primary)">
            Recruiters
          </h1>
          <p className="mt-1 text-sm text-(--color-text-secondary)">Manage recruiter accounts and access.</p>
        </div>
        <Button type="button" variant="primary" onClick={() => setIsCreateOpen(true)} className="gap-2">
          <Plus aria-hidden="true" size={16} strokeWidth={1.75} />
          New Recruiter
        </Button>
      </div>

      {!isLoading && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatPanel compact icon={Building2} label="Total Recruiters" value={recruiters.length} scope="All recruiters" />
          <StatPanel compact icon={UserCheck} label="Active" value={activeCount} scope="Currently enabled" />
          <StatPanel compact icon={UserCheck} label="Pending Approval" value={pendingCount} scope="Awaiting review" />
        </div>
      )}

      <Card>
        <form onSubmit={handleSearchSubmit} className="flex flex-wrap items-end gap-4">
          <div className="min-w-48 flex-1">
            <Label htmlFor="search-name">Name</Label>
            <Input id="search-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Search by name" />
          </div>
          <Checkbox
            id="include-inactive"
            label="Include disabled"
            checked={includeInactive}
            onChange={(e) => setIncludeInactive(e.target.checked)}
          />
          <Button type="submit" variant="secondary">
            Search
          </Button>
        </form>
      </Card>

      {error && <p className="text-sm text-(--color-danger)">{error}</p>}
      {isLoading && <p className="text-sm text-(--color-text-secondary)">Loading recruiters…</p>}

      {!isLoading && recruiters.length === 0 && (
        <Card>
          <EmptyState icon={Building2} message="No recruiters yet." />
        </Card>
      )}

      {!isLoading && recruiters.length > 0 && (
        <>
          {/* Desktop / tablet: data-dense table. */}
          <div className="hidden lg:block">
            <Table>
              <TableHead>
                <TableRow>
                  <TableCheckboxHeaderCell
                    checked={selection.isAllSelected}
                    indeterminate={selection.isIndeterminate}
                    onChange={() => selection.toggleAll()}
                  />
                  <TableHeaderCell>Name</TableHeaderCell>
                  <TableHeaderCell>Email</TableHeaderCell>
                  <TableHeaderCell>Company</TableHeaderCell>
                  <TableHeaderCell>Status</TableHeaderCell>
                  <TableHeaderCell>Actions</TableHeaderCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {recruiters.map((recruiter) => (
                  <TableRow key={recruiter.id}>
                    <TableCheckboxCell
                      label={`Select ${recruiter.fullName}`}
                      checked={selection.isSelected(recruiter)}
                      onChange={() => selection.toggle(recruiter)}
                    />
                    <TableCell>
                      <Link href={`/dashboard/admin/recruiters/${recruiter.id}`} className="text-(--color-accent) hover:underline">
                        {recruiter.fullName}
                      </Link>
                    </TableCell>
                    <TableCell>{recruiter.email}</TableCell>
                    <TableCell>{recruiter.companyName}</TableCell>
                    <TableCell>
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
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap items-center gap-3">
                        {recruiter.approvalStatus === "PENDING" && (
                          <>
                            <button
                              type="button"
                              onClick={() => handleApprove(recruiter.id)}
                              className="text-sm font-medium text-(--color-accent) hover:underline"
                            >
                              Approve
                            </button>
                            <button
                              type="button"
                              onClick={() => handleReject(recruiter.id)}
                              className="text-sm font-medium text-(--color-danger) hover:underline"
                            >
                              Reject
                            </button>
                          </>
                        )}
                        <Link href={`/dashboard/admin/recruiters/${recruiter.id}`} className="text-sm font-medium text-(--color-accent) hover:underline">
                          Manage
                        </Link>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Narrow viewports: one card per recruiter, more scannable than a horizontally-scrolled table. */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:hidden">
            {recruiters.map((recruiter) => (
              <Card key={recruiter.id} className="transition-shadow duration-150 hover:shadow-md">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2">
                    <Checkbox
                      label={`Select ${recruiter.fullName}`}
                      hideLabel
                      className="mt-1"
                      checked={selection.isSelected(recruiter)}
                      onChange={() => selection.toggle(recruiter)}
                    />
                    <Link href={`/dashboard/admin/recruiters/${recruiter.id}`}>
                      <CardTitle className="text-(--color-accent)">{recruiter.fullName}</CardTitle>
                    </Link>
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
                <p className="mt-2 text-xs text-(--color-text-secondary)">
                  {recruiter.email} · {recruiter.companyName}
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  {recruiter.approvalStatus === "PENDING" && (
                    <>
                      <button
                        type="button"
                        onClick={() => handleApprove(recruiter.id)}
                        className="text-sm font-medium text-(--color-accent) hover:underline"
                      >
                        Approve
                      </button>
                      <button
                        type="button"
                        onClick={() => handleReject(recruiter.id)}
                        className="text-sm font-medium text-(--color-danger) hover:underline"
                      >
                        Reject
                      </button>
                    </>
                  )}
                  <Link href={`/dashboard/admin/recruiters/${recruiter.id}`} className="text-sm font-medium text-(--color-accent) hover:underline">
                    Manage
                  </Link>
                </div>
              </Card>
            ))}
          </div>
        </>
      )}

      <FloatingActionBar
        selectedCount={selection.selectedCount}
        onClear={selection.clear}
        actions={[
          { label: "Enable", onClick: () => setConfirmBulkAction("enable") },
          { label: "Disable", onClick: () => setConfirmBulkAction("disable"), variant: "destructive" },
        ]}
      />

      <ConfirmDialog
        isOpen={confirmBulkAction !== null}
        onClose={() => setConfirmBulkAction(null)}
        onConfirm={handleBulkConfirm}
        title={confirmBulkAction === "enable" ? "Enable selected recruiters?" : "Disable selected recruiters?"}
        description={
          confirmBulkAction === "disable"
            ? `${selection.selectedCount} recruiter(s) will immediately lose access and be signed out of every session.`
            : `${selection.selectedCount} recruiter(s) will regain access.`
        }
        confirmLabel={confirmBulkAction === "enable" ? "Enable" : "Disable"}
        variant={confirmBulkAction === "disable" ? "destructive" : "default"}
        isConfirming={isBulkWorking}
      />

      <CreateRecruiterModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        accessToken={accessToken}
        onCreated={() => {
          void load();
        }}
      />
    </div>
  );
}

interface CreateRecruiterModalProps {
  isOpen: boolean;
  onClose: () => void;
  accessToken: string | null;
  onCreated: () => void;
}

function CreateRecruiterModal({ isOpen, onClose, accessToken, onCreated }: CreateRecruiterModalProps) {
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tempPassword, setTempPassword] = useState<string | null>(null);

  function reset() {
    setEmail("");
    setFullName("");
    setCompanyName("");
    setError(null);
    setTempPassword(null);
  }

  function handleClose() {
    reset();
    onClose();
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      const result = await apiClient.post<{ tempPassword: string }>(
        "/api/recruiters/admin",
        { email, fullName, companyName },
        accessToken ?? undefined,
      );
      setTempPassword(result.tempPassword);
      onCreated();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Unable to create recruiter.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <RevealPasswordModal
      isOpen={isOpen}
      onClose={handleClose}
      pendingTitle="New Recruiter"
      revealedTitle="Recruiter created"
      tempPassword={tempPassword}
      description={
        <>
          Share this temporary password with {fullName || "the recruiter"} — it will not be shown again. They must
          change it on first sign-in.
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="create-fullName">Name</Label>
          <Input id="create-fullName" required value={fullName} onChange={(e) => setFullName(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="create-email">Email</Label>
          <Input id="create-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="create-company">Company</Label>
          <Input id="create-company" required value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
        </div>

        {error && <p className="text-sm text-(--color-danger)">{error}</p>}

        <div className="flex justify-end gap-3 border-t border-(--color-border) pt-4">
          <Button type="button" variant="ghost" onClick={handleClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={isSubmitting}>
            {isSubmitting ? "Creating…" : "Create Recruiter"}
          </Button>
        </div>
      </form>
    </RevealPasswordModal>
  );
}
