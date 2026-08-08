"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Archive, Download, Layers, Upload, UserCheck, Users } from "lucide-react";
import { useAuth } from "@/modules/auth/client";
import { apiClient, ApiError } from "@/lib/api-client";
import { useRowSelection } from "@/lib/use-row-selection";
import { toCsv } from "@/lib/csv";
import { triggerBrowserDownload } from "@/lib/browser-download";
import type { StudentSearchResultItem, BulkImportRunRecord } from "@/modules/students";
import type { Batch } from "@/modules/batches";
import { Button, buttonClassName } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { CardTitle, DataLabel } from "@/components/ui/typography";
import { StatPanel } from "@/components/ui/stat-panel";
import { EmptyState } from "@/components/empty-state";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { FloatingActionBar } from "@/components/ui/floating-action-bar";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import {
  Table,
  TableBody,
  TableCell,
  TableCheckboxCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from "@/components/ui/table";

interface Filters {
  name: string;
  rollNumber: string;
  batchId: string;
  includeInactive: boolean;
}

const EMPTY_FILTERS: Filters = { name: "", rollNumber: "", batchId: "", includeInactive: false };

function buildQuery(filters: Filters): string {
  const params = new URLSearchParams();
  if (filters.name) params.set("name", filters.name);
  if (filters.rollNumber) params.set("rollNumber", filters.rollNumber);
  if (filters.batchId) params.set("batchId", filters.batchId);
  if (filters.includeInactive) params.set("includeInactive", "true");
  return params.toString();
}

interface BatchGroup {
  batchId: string;
  batchName: string;
  items: StudentSearchResultItem[];
}

/** Groups the already-fetched results by batch, in order of first appearance — a purely client-side presentation grouping over the same flat list the API already returns, not a second query. */
function groupByBatch(students: StudentSearchResultItem[]): BatchGroup[] {
  const groups: BatchGroup[] = [];
  const indexByBatch = new Map<string, number>();

  for (const student of students) {
    const existingIndex = indexByBatch.get(student.batchId);
    if (existingIndex === undefined) {
      indexByBatch.set(student.batchId, groups.length);
      groups.push({ batchId: student.batchId, batchName: student.batchName, items: [student] });
    } else {
      groups[existingIndex]!.items.push(student);
    }
  }

  return groups;
}

export default function StudentsPage() {
  const { accessToken } = useAuth();
  const toast = useToast();
  const [batches, setBatches] = useState<Batch[]>([]);
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [students, setStudents] = useState<StudentSearchResultItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [confirmBulkAction, setConfirmBulkAction] = useState<"enable" | "disable" | null>(null);
  const [isBulkWorking, setIsBulkWorking] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);

  const selection = useRowSelection(students, (s) => s.id);

  const runSearch = useCallback(
    async (nextFilters: Filters) => {
      if (!accessToken) return;
      setIsLoading(true);
      setError(null);
      try {
        const query = buildQuery(nextFilters);
        const results = await apiClient.get<StudentSearchResultItem[]>(
          `/api/students${query ? `?${query}` : ""}`,
          accessToken,
        );
        setStudents(results);
      } catch (err) {
        setError(err instanceof ApiError ? err.message : "Unable to load students.");
      } finally {
        setIsLoading(false);
      }
    },
    [accessToken],
  );

  useEffect(() => {
    if (!accessToken) return;
    apiClient.get<Batch[]>("/api/batches", accessToken).then(setBatches).catch(() => {});
    // runSearch only ever sets state inside its own awaited fetch
    // completion (never synchronously during render) — a standard
    // fetch-on-mount effect; the lint rule can't see through the
    // useCallback-wrapped function to verify that.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    runSearch(EMPTY_FILTERS).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void runSearch(filters);
  }

  function handleReset() {
    setFilters(EMPTY_FILTERS);
    void runSearch(EMPTY_FILTERS);
  }

  async function handleArchiveToggle(student: StudentSearchResultItem) {
    if (!accessToken) return;
    try {
      const action = student.isActive ? "archive" : "restore";
      await apiClient.post(`/api/students/${student.id}/${action}`, undefined, accessToken);
      await runSearch(filters);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Unable to update student status.");
    }
  }

  async function handleBulkConfirm() {
    if (!confirmBulkAction || !accessToken) return;
    setIsBulkWorking(true);
    try {
      const result = await apiClient.post<{ succeeded: string[]; failed: { id: string; error: string }[] }>(
        "/api/students/bulk/set-active",
        { studentIds: [...selection.selectedIds], isActive: confirmBulkAction === "enable" },
        accessToken,
      );
      toast.success(
        result.failed.length === 0
          ? `${result.succeeded.length} student(s) ${confirmBulkAction === "enable" ? "restored" : "archived"}.`
          : `${result.succeeded.length} succeeded, ${result.failed.length} failed.`,
      );
      selection.clear();
      setConfirmBulkAction(null);
      await runSearch(filters);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Bulk action failed.");
    } finally {
      setIsBulkWorking(false);
    }
  }

  const activeCount = students.filter((s) => s.isActive).length;
  const archivedCount = students.length - activeCount;
  const batchGroups = groupByBatch(students);
  const hasActiveFilters = Boolean(filters.name || filters.rollNumber || filters.batchId || filters.includeInactive);

  function renderStatusBadge(student: StudentSearchResultItem) {
    return <Badge variant={student.isActive ? "active" : "archived"}>{student.isActive ? "Active" : "Archived"}</Badge>;
  }

  function renderArchiveButton(student: StudentSearchResultItem) {
    return (
      <Button variant="ghost" onClick={() => handleArchiveToggle(student)}>
        {student.isActive ? "Archive" : "Restore"}
      </Button>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold text-(--color-text-primary)">
            Student Management
          </h1>
          <p className="mt-1 text-sm text-(--color-text-secondary)">Search, filter, and manage student records.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button type="button" variant="secondary" className="gap-2" onClick={() => setIsImportOpen(true)}>
            <Upload aria-hidden="true" size={16} strokeWidth={1.75} />
            Bulk Import
          </Button>
          <Link href="/dashboard/exports" className={buttonClassName("secondary", "gap-2")}>
            <Download aria-hidden="true" size={16} strokeWidth={1.75} />
            Export Student Directory
          </Link>
        </div>
      </div>

      <Card>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={filters.name}
                onChange={(e) => setFilters((f) => ({ ...f, name: e.target.value }))}
                placeholder="Search by name"
              />
            </div>
            <div>
              <Label htmlFor="rollNumber">Roll Number</Label>
              <Input
                id="rollNumber"
                value={filters.rollNumber}
                onChange={(e) => setFilters((f) => ({ ...f, rollNumber: e.target.value }))}
                placeholder="Search by roll number"
              />
            </div>
            <div>
              <Label htmlFor="batchId">Batch</Label>
              <Select
                id="batchId"
                value={filters.batchId}
                onChange={(e) => setFilters((f) => ({ ...f, batchId: e.target.value }))}
              >
                <option value="">All batches</option>
                {batches.map((batch) => (
                  <option key={batch.id} value={batch.id}>
                    {batch.name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="flex items-end">
              <Checkbox
                id="includeInactive"
                checked={filters.includeInactive}
                onChange={(e) => setFilters((f) => ({ ...f, includeInactive: e.target.checked }))}
                label="Include archived"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 border-t border-(--color-border) pt-4">
            <Button type="submit" variant="primary">
              Search
            </Button>
            {hasActiveFilters && (
              <Button type="button" variant="ghost" onClick={handleReset}>
                Reset filters
              </Button>
            )}
          </div>
        </form>
      </Card>

      {error && <p className="text-sm text-(--color-danger)">{error}</p>}

      {!isLoading && students.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatPanel compact icon={Users} label="Results" value={students.length} scope="Matching current filters" />
          <StatPanel compact icon={UserCheck} label="Active" value={activeCount} scope="Currently enrolled" />
          <StatPanel compact icon={Archive} label="Archived" value={archivedCount} scope="Not currently enrolled" />
        </div>
      )}

      {!isLoading && students.length > 0 && (
        <Checkbox
          id="select-all-students"
          label={`Select all ${students.length} result(s)`}
          checked={selection.isAllSelected}
          indeterminate={selection.isIndeterminate}
          onChange={() => selection.toggleAll()}
        />
      )}

      {isLoading && <p className="text-sm text-(--color-text-secondary)">Loading students…</p>}

      {!isLoading && students.length === 0 && (
        <Card>
          <EmptyState
            icon={Users}
            message={hasActiveFilters ? "No students match the current filters." : "No students found."}
          />
          {hasActiveFilters && (
            <div className="flex justify-center">
              <Button type="button" variant="ghost" onClick={handleReset}>
                Clear filters
              </Button>
            </div>
          )}
        </Card>
      )}

      {!isLoading && students.length > 0 && (
        <div className="space-y-6">
          {batchGroups.map((group) => (
            <div key={group.batchId}>
              <div className="mb-3 flex items-center gap-2.5">
                <Layers aria-hidden="true" size={15} strokeWidth={1.75} className="text-(--color-text-secondary)" />
                <DataLabel>{group.batchName}</DataLabel>
                <span className="rounded-full bg-(--color-surface-muted) px-2 py-0.5 text-xs text-(--color-text-secondary)">
                  {group.items.length}
                </span>
              </div>

              {/* Desktop / tablet: data-dense table. */}
              <div className="hidden lg:block">
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableHeaderCell> </TableHeaderCell>
                      <TableHeaderCell>Name</TableHeaderCell>
                      <TableHeaderCell>Roll Number</TableHeaderCell>
                      <TableHeaderCell>CGPA</TableHeaderCell>
                      <TableHeaderCell>Status</TableHeaderCell>
                      <TableHeaderCell>Actions</TableHeaderCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {group.items.map((student) => (
                      <TableRow key={student.id}>
                        <TableCheckboxCell
                          label={`Select ${student.fullName}`}
                          checked={selection.isSelected(student)}
                          onChange={() => selection.toggle(student)}
                        />
                        <TableCell>
                          <Link
                            href={`/dashboard/students/${student.id}`}
                            className="text-(--color-accent) hover:underline"
                          >
                            {student.fullName}
                          </Link>
                        </TableCell>
                        <TableCell>{student.rollNumber}</TableCell>
                        <TableCell>{student.cgpa ?? "—"}</TableCell>
                        <TableCell>{renderStatusBadge(student)}</TableCell>
                        <TableCell>{renderArchiveButton(student)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Narrow viewports: one card per student, more scannable than a horizontally-scrolled table. */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:hidden">
                {group.items.map((student) => (
                  <Card key={student.id} className="transition-shadow duration-150 hover:shadow-md">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2">
                        <Checkbox
                          label={`Select ${student.fullName}`}
                          hideLabel
                          className="mt-1"
                          checked={selection.isSelected(student)}
                          onChange={() => selection.toggle(student)}
                        />
                        <Link href={`/dashboard/students/${student.id}`}>
                          <CardTitle className="text-(--color-accent)">{student.fullName}</CardTitle>
                        </Link>
                      </div>
                      {renderStatusBadge(student)}
                    </div>
                    <p className="mt-2 text-xs text-(--color-text-secondary)">
                      {student.rollNumber} · CGPA {student.cgpa ?? "—"}
                    </p>
                    <div className="mt-3">{renderArchiveButton(student)}</div>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <FloatingActionBar
        selectedCount={selection.selectedCount}
        onClear={selection.clear}
        actions={[
          { label: "Restore", onClick: () => setConfirmBulkAction("enable") },
          { label: "Archive", onClick: () => setConfirmBulkAction("disable"), variant: "destructive" },
        ]}
      />

      <ConfirmDialog
        isOpen={confirmBulkAction !== null}
        onClose={() => setConfirmBulkAction(null)}
        onConfirm={handleBulkConfirm}
        title={confirmBulkAction === "enable" ? "Restore selected students?" : "Archive selected students?"}
        description={
          confirmBulkAction === "disable"
            ? `${selection.selectedCount} student(s) will be archived and their login access disabled.`
            : `${selection.selectedCount} student(s) will be restored and regain login access.`
        }
        confirmLabel={confirmBulkAction === "enable" ? "Restore" : "Archive"}
        variant={confirmBulkAction === "disable" ? "destructive" : "default"}
        isConfirming={isBulkWorking}
      />

      <BulkImportModal
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        batches={batches}
        accessToken={accessToken}
        onImported={() => {
          void runSearch(filters);
        }}
      />
    </div>
  );
}

const EXPECTED_CSV_COLUMNS = "email, fullName, rollNumber, phone, personalEmail, cgpa";

interface BulkImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  batches: readonly Batch[];
  accessToken: string | null;
  onImported: () => void;
}

/**
 * File picker -> batch select -> upload -> poll GET /api/students/bulk-import/{runId}
 * -> summary, with a "download error report" CSV for any failed rows. The
 * expected column set is fixed (documented inline, not a dynamic
 * column-mapping UI) — a full mapper would be speculative complexity for a
 * department-scale roster with one well-known shape.
 */
function BulkImportModal({ isOpen, onClose, batches, accessToken, onImported }: BulkImportModalProps) {
  const toast = useToast();
  const [batchId, setBatchId] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [runId, setRunId] = useState<string | null>(null);
  const [run, setRun] = useState<BulkImportRunRecord | null>(null);

  useEffect(() => {
    if (!runId || !accessToken) return;
    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout>;

    async function poll() {
      try {
        const result = await apiClient.get<BulkImportRunRecord>(`/api/students/bulk-import/${runId}`, accessToken ?? undefined);
        if (cancelled) return;
        setRun(result);
        if (result.status === "PENDING" || result.status === "RUNNING") {
          timeoutId = setTimeout(poll, 1500);
        } else {
          onImported();
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof ApiError ? err.message : "Unable to check import status.");
      }
    }

    void poll();
    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runId, accessToken]);

  function reset() {
    setBatchId("");
    setFile(null);
    setError(null);
    setRunId(null);
    setRun(null);
  }

  function handleClose() {
    reset();
    onClose();
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file || !batchId) return;
    setError(null);
    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("batchId", batchId);
      const result = await apiClient.upload<{ bulkImportRunId: string; totalRows: number }>(
        "/api/students/bulk-import",
        formData,
        accessToken ?? undefined,
      );
      setRunId(result.bulkImportRunId);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Unable to start the import.");
    } finally {
      setIsSubmitting(false);
    }
  }

  function downloadErrorReport() {
    if (!run || run.errorReport.length === 0) return;
    const csv = toCsv(run.errorReport, [
      { header: "Row", value: (r) => String(r.row) },
      { header: "Roll Number", value: (r) => r.rollNumber ?? "" },
      { header: "Email", value: (r) => r.email ?? "" },
      { header: "Error", value: (r) => r.error },
    ]);
    triggerBrowserDownload(new Blob([csv], { type: "text/csv" }), "bulk-import-errors.csv");
  }

  const isFinished = run && run.status !== "PENDING" && run.status !== "RUNNING";
  // Gated on runId (has an upload already been accepted?), not on run (have
  // we successfully polled at least once?) — a poll failure must never fall
  // back to a re-submittable upload form, or a transient network blip could
  // let the same file be imported twice while the first import is still
  // running server-side.
  const hasStartedImport = runId !== null;

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={hasStartedImport ? "Bulk Import" : "Bulk Import Students"}>
      {!hasStartedImport ? (
        <form onSubmit={handleSubmit} className="space-y-4">
          <p className="text-sm text-(--color-text-secondary)">
            Upload a CSV with columns: <code className="font-[family-name:var(--font-data)] text-xs">{EXPECTED_CSV_COLUMNS}</code>.
            Only email, fullName, and rollNumber are required.
          </p>
          <div>
            <Label htmlFor="import-batch">Batch</Label>
            <Select id="import-batch" required value={batchId} onChange={(e) => setBatchId(e.target.value)}>
              <option value="">Select a batch…</option>
              {batches.map((batch) => (
                <option key={batch.id} value={batch.id}>
                  {batch.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="import-file">CSV File</Label>
            <input
              id="import-file"
              type="file"
              accept=".csv,text/csv"
              required
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="block w-full text-sm text-(--color-text-secondary) file:mr-3 file:rounded-md file:border-0 file:bg-(--color-surface-muted) file:px-3 file:py-2 file:text-sm file:font-medium file:text-(--color-text-primary)"
            />
          </div>

          {error && <p className="text-sm text-(--color-danger)">{error}</p>}

          <div className="flex justify-end gap-3 border-t border-(--color-border) pt-4">
            <Button type="button" variant="ghost" onClick={handleClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={isSubmitting || !file || !batchId}>
              {isSubmitting ? "Uploading…" : "Start Import"}
            </Button>
          </div>
        </form>
      ) : (
        <div className="space-y-4">
          {!run ? (
            <p className="text-sm text-(--color-text-secondary)">
              {error ? "Checking import status…" : "Starting…"}
            </p>
          ) : !isFinished ? (
            <p className="text-sm text-(--color-text-secondary)">
              Importing… {run.processedRows} of {run.totalRows} rows processed.
            </p>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-(--color-text-primary)">
                {run.status === "FAILED"
                  ? "The import failed before it could process any rows."
                  : `${run.successCount} of ${run.totalRows} row(s) imported successfully.`}
              </p>
              {run.failureCount > 0 && (
                <div className="rounded-md border border-(--color-border) bg-(--color-surface-muted) p-3">
                  <p className="text-sm text-(--color-danger)">{run.failureCount} row(s) failed.</p>
                  <Button type="button" variant="secondary" className="mt-2 gap-2" onClick={downloadErrorReport}>
                    <Download aria-hidden="true" size={14} strokeWidth={1.75} />
                    Download Error Report
                  </Button>
                </div>
              )}
            </div>
          )}

          {error && <p className="text-sm text-(--color-danger)">{error}</p>}

          <div className="flex justify-end border-t border-(--color-border) pt-4">
            <Button type="button" variant="primary" onClick={handleClose} disabled={!isFinished}>
              Done
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
