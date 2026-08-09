"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Plus, UserCog, Users } from "lucide-react";
import { useAuth } from "@/modules/auth/client";
import { apiClient, ApiError } from "@/lib/api-client";
import { useRowSelection } from "@/lib/use-row-selection";
import type { CoordinatorPosition, CoordinatorRecord } from "@/modules/coordinators";
import type { Batch } from "@/modules/batches";
import { COORDINATOR_POSITION_OPTIONS, coordinatorPositionLabel } from "@/lib/coordinator-position";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
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
 * Module 4 of the V3.0 Administration Platform — Coordinator Management,
 * Secretary-only (matches every /api/coordinators route's own role gate).
 * Follows the exact V2.0 design language established across Student
 * Management/Approval Workspace/Batch Management: StatPanel row, EmptyState,
 * semantic color tokens — plus the new M2 primitives (Modal, ConfirmDialog,
 * FloatingActionBar, bulk-select table) in their first real page usage.
 */
export default function CoordinatorsPage() {
  const { accessToken } = useAuth();
  const toast = useToast();

  const [coordinators, setCoordinators] = useState<CoordinatorRecord[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [name, setName] = useState("");
  const [position, setPosition] = useState<CoordinatorPosition | "">("");
  const [includeInactive, setIncludeInactive] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [confirmBulkAction, setConfirmBulkAction] = useState<"enable" | "disable" | null>(null);
  const [isBulkWorking, setIsBulkWorking] = useState(false);

  const selection = useRowSelection(coordinators, (c) => c.id);

  const load = useCallback(async () => {
    if (!accessToken) return;
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (name) params.set("name", name);
      if (position) params.set("position", position);
      if (includeInactive) params.set("includeInactive", "true");
      const [coordinatorResults, batchResults] = await Promise.all([
        apiClient.get<CoordinatorRecord[]>(`/api/coordinators?${params.toString()}`, accessToken),
        apiClient.get<Batch[]>("/api/batches", accessToken),
      ]);
      setCoordinators(coordinatorResults);
      setBatches(batchResults);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Unable to load coordinators.");
    } finally {
      setIsLoading(false);
    }
  }, [accessToken, name, position, includeInactive]);

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

  const batchNameById = new Map(batches.map((b) => [b.id, b.name]));

  async function handleBulkConfirm() {
    if (!confirmBulkAction || !accessToken) return;
    setIsBulkWorking(true);
    try {
      const result = await apiClient.post<{ succeeded: string[]; failed: { id: string; error: string }[] }>(
        "/api/coordinators/bulk/set-active",
        { coordinatorIds: [...selection.selectedIds], isActive: confirmBulkAction === "enable" },
        accessToken,
      );
      toast.success(
        result.failed.length === 0
          ? `${result.succeeded.length} coordinator(s) ${confirmBulkAction}d.`
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

  const activeCount = coordinators.filter((c) => c.isActive).length;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold text-(--color-text-primary)">
            Coordinators
          </h1>
          <p className="mt-1 text-sm text-(--color-text-secondary)">Manage coordinator accounts and batch assignments.</p>
        </div>
        <Button type="button" variant="primary" onClick={() => setIsCreateOpen(true)} className="gap-2">
          <Plus aria-hidden="true" size={16} strokeWidth={1.75} />
          New Coordinator
        </Button>
      </div>

      {!isLoading && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <StatPanel compact icon={Users} label="Total Coordinators" value={coordinators.length} scope="All coordinators" />
          <StatPanel compact icon={UserCog} label="Active" value={activeCount} scope="Currently enabled" />
        </div>
      )}

      <Card>
        <form onSubmit={handleSearchSubmit} className="flex flex-wrap items-end gap-4">
          <div className="min-w-48 flex-1">
            <Label htmlFor="search-name">Name</Label>
            <Input id="search-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Search by name" />
          </div>
          <div className="min-w-40">
            <Label htmlFor="search-position">Position</Label>
            <Select
              id="search-position"
              value={position}
              onChange={(e) => setPosition(e.target.value as CoordinatorPosition | "")}
            >
              <option value="">All positions</option>
              {COORDINATOR_POSITION_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
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
      {isLoading && <p className="text-sm text-(--color-text-secondary)">Loading coordinators…</p>}

      {!isLoading && coordinators.length === 0 && (
        <Card>
          <EmptyState icon={UserCog} message="No coordinators yet." />
        </Card>
      )}

      {!isLoading && coordinators.length > 0 && (
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
                  <TableHeaderCell>Position</TableHeaderCell>
                  <TableHeaderCell>Batches</TableHeaderCell>
                  <TableHeaderCell>Status</TableHeaderCell>
                  <TableHeaderCell>Actions</TableHeaderCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {coordinators.map((coordinator) => (
                  <TableRow key={coordinator.id}>
                    <TableCheckboxCell
                      label={`Select ${coordinator.fullName}`}
                      checked={selection.isSelected(coordinator)}
                      onChange={() => selection.toggle(coordinator)}
                    />
                    <TableCell>
                      <Link href={`/dashboard/admin/coordinators/${coordinator.id}`} className="text-(--color-accent) hover:underline">
                        {coordinator.fullName}
                      </Link>
                    </TableCell>
                    <TableCell>{coordinator.email}</TableCell>
                    <TableCell>{coordinatorPositionLabel(coordinator.position)}</TableCell>
                    <TableCell>
                      {coordinator.batchIds.length === 0 ? (
                        <span className="text-(--color-text-secondary)">None</span>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {coordinator.batchIds.map((batchId) => (
                            <Badge key={batchId} variant="neutral">
                              {batchNameById.get(batchId) ?? batchId}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={coordinator.isActive ? "active" : "archived"}>
                        {coordinator.isActive ? "Active" : "Disabled"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Link href={`/dashboard/admin/coordinators/${coordinator.id}`} className="text-sm font-medium text-(--color-accent) hover:underline">
                        Manage
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Narrow viewports: one card per coordinator, more scannable than a horizontally-scrolled table. */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:hidden">
            {coordinators.map((coordinator) => (
              <Card key={coordinator.id} className="transition-shadow duration-150 hover:shadow-md">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2">
                    <Checkbox
                      label={`Select ${coordinator.fullName}`}
                      hideLabel
                      className="mt-1"
                      checked={selection.isSelected(coordinator)}
                      onChange={() => selection.toggle(coordinator)}
                    />
                    <Link href={`/dashboard/admin/coordinators/${coordinator.id}`}>
                      <CardTitle className="text-(--color-accent)">{coordinator.fullName}</CardTitle>
                    </Link>
                  </div>
                  <Badge variant={coordinator.isActive ? "active" : "archived"}>
                    {coordinator.isActive ? "Active" : "Disabled"}
                  </Badge>
                </div>
                <p className="mt-2 text-xs text-(--color-text-secondary)">{coordinator.email}</p>
                <p className="mt-1 text-xs text-(--color-text-secondary)">{coordinatorPositionLabel(coordinator.position)}</p>
                {coordinator.batchIds.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {coordinator.batchIds.map((batchId) => (
                      <Badge key={batchId} variant="neutral">
                        {batchNameById.get(batchId) ?? batchId}
                      </Badge>
                    ))}
                  </div>
                )}
                <div className="mt-3">
                  <Link href={`/dashboard/admin/coordinators/${coordinator.id}`} className="text-sm font-medium text-(--color-accent) hover:underline">
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
        title={confirmBulkAction === "enable" ? "Enable selected coordinators?" : "Disable selected coordinators?"}
        description={
          confirmBulkAction === "disable"
            ? `${selection.selectedCount} coordinator(s) will immediately lose access and be signed out of every session.`
            : `${selection.selectedCount} coordinator(s) will regain access.`
        }
        confirmLabel={confirmBulkAction === "enable" ? "Enable" : "Disable"}
        variant={confirmBulkAction === "disable" ? "destructive" : "default"}
        isConfirming={isBulkWorking}
      />

      <CreateCoordinatorModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        batches={batches}
        accessToken={accessToken}
        onCreated={() => {
          void load();
        }}
      />
    </div>
  );
}

interface CreateCoordinatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  batches: readonly Batch[];
  accessToken: string | null;
  onCreated: () => void;
}

function CreateCoordinatorModal({ isOpen, onClose, batches, accessToken, onCreated }: CreateCoordinatorModalProps) {
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [position, setPosition] = useState<CoordinatorPosition | "">("");
  const [selectedBatchIds, setSelectedBatchIds] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tempPassword, setTempPassword] = useState<string | null>(null);

  function reset() {
    setEmail("");
    setFullName("");
    setPosition("");
    setSelectedBatchIds([]);
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
        "/api/coordinators",
        { email, fullName, position: position || undefined, batchIds: selectedBatchIds },
        accessToken ?? undefined,
      );
      setTempPassword(result.tempPassword);
      onCreated();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Unable to create coordinator.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <RevealPasswordModal
      isOpen={isOpen}
      onClose={handleClose}
      pendingTitle="New Coordinator"
      revealedTitle="Coordinator created"
      tempPassword={tempPassword}
      description={
        <>
          Share this temporary password with {fullName || "the coordinator"} — it will not be shown again. They must
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
          <Label htmlFor="create-position">Position</Label>
          <Select
            id="create-position"
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
        {batches.length > 0 && (
          <div>
            <Label htmlFor="create-batches">Assigned batches</Label>
            <div className="mt-1 flex flex-wrap gap-3">
              {batches.map((batch) => (
                <Checkbox
                  key={batch.id}
                  label={batch.name}
                  checked={selectedBatchIds.includes(batch.id)}
                  onChange={(e) =>
                    setSelectedBatchIds((current) =>
                      e.target.checked ? [...current, batch.id] : current.filter((id) => id !== batch.id),
                    )
                  }
                />
              ))}
            </div>
          </div>
        )}

        {error && <p className="text-sm text-(--color-danger)">{error}</p>}

        <div className="flex justify-end gap-3 border-t border-(--color-border) pt-4">
          <Button type="button" variant="ghost" onClick={handleClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={isSubmitting}>
            {isSubmitting ? "Creating…" : "Create Coordinator"}
          </Button>
        </div>
      </form>
    </RevealPasswordModal>
  );
}
