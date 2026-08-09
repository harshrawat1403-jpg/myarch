"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import { useParams } from "next/navigation";
import { ChevronLeft, ClipboardList } from "lucide-react";
import { useAuth } from "@/modules/auth/client";
import { apiClient, ApiError } from "@/lib/api-client";
import { triggerBrowserDownload } from "@/lib/browser-download";
import type {
  ApplicationStatus,
  DriveApplicationDTO,
  InterviewMode,
  InternshipOutcomeRecord,
  PlacementDriveRecord,
} from "@/modules/placements";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { Input, Label } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge, type BadgeVariant } from "@/components/ui/badge";
import { CardTitle, DataLabel } from "@/components/ui/typography";
import { Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow } from "@/components/ui/table";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { EmptyState } from "@/components/empty-state";

const STATUS_ORDER: ApplicationStatus[] = [
  "APPLIED",
  "SHORTLISTED",
  "INTERVIEW",
  "OFFER",
  "ACCEPTED",
  "ACTIVE",
  "COMPLETED",
  "REJECTED",
  "WITHDRAWN",
];

const STATUS_LABELS: Record<ApplicationStatus, string> = {
  APPLIED: "Applied",
  SHORTLISTED: "Shortlisted",
  INTERVIEW: "Interview",
  OFFER: "Offer",
  ACCEPTED: "Accepted",
  ACTIVE: "Active",
  COMPLETED: "Completed",
  REJECTED: "Rejected",
  WITHDRAWN: "Withdrawn",
};

function statusBadgeVariant(status: ApplicationStatus): BadgeVariant {
  switch (status) {
    case "APPLIED":
    case "SHORTLISTED":
    case "INTERVIEW":
      return "pending";
    case "OFFER":
    case "ACCEPTED":
    case "ACTIVE":
    case "COMPLETED":
      return "approved";
    case "REJECTED":
    case "WITHDRAWN":
      return "rejected";
  }
}

function interviewModeLabel(mode: InterviewMode): string {
  switch (mode) {
    case "ONLINE":
      return "Online";
    case "IN_PERSON":
      return "In person";
    case "PHONE":
      return "Phone";
  }
}

/**
 * V4.0 D3 (§14) — the application board for a single drive: grouped by
 * currentStatus, reusing the existing Badge/Table primitives (a grouped
 * table, not a kanban board, per the PRD's own "sufficient and far cheaper"
 * call). Each row can move to any other status (the backend enforces valid
 * transitions — see UpdateApplicationStatusUseCase) and schedule/reschedule
 * an interview (simple date/time/mode fields, no calendar-sync).
 */
export default function DriveApplicationsPage() {
  const { id } = useParams<{ id: string }>();
  const { accessToken } = useAuth();
  const toast = useToast();

  const [drive, setDrive] = useState<PlacementDriveRecord | null>(null);
  const [applications, setApplications] = useState<DriveApplicationDTO[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [pendingStatusFor, setPendingStatusFor] = useState<Record<string, ApplicationStatus>>({});
  const [interviewTarget, setInterviewTarget] = useState<DriveApplicationDTO | null>(null);
  const [outcomeTarget, setOutcomeTarget] = useState<DriveApplicationDTO | null>(null);

  const load = useCallback(async () => {
    if (!accessToken || !id) return;
    setIsLoading(true);
    setError(null);
    try {
      const [driveRecord, applicationRows] = await Promise.all([
        apiClient.get<PlacementDriveRecord>(`/api/placements/drives/${id}`, accessToken),
        apiClient.get<DriveApplicationDTO[]>(`/api/placements/drives/${id}/applications`, accessToken),
      ]);
      setDrive(driveRecord);
      setApplications(applicationRows);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Unable to load applications.");
    } finally {
      setIsLoading(false);
    }
  }, [accessToken, id]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  async function handleStatusChange(application: DriveApplicationDTO) {
    const toStatus = pendingStatusFor[application.applicationId];
    if (!accessToken || !toStatus || toStatus === application.currentStatus) return;
    try {
      await apiClient.patch(`/api/placements/applications/${application.applicationId}/status`, { toStatus }, accessToken);
      toast.success(`Moved ${application.studentName} to ${STATUS_LABELS[toStatus]}.`);
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Unable to update this application's status.");
    }
  }

  const grouped = STATUS_ORDER.map((status) => ({
    status,
    rows: applications.filter((a) => a.currentStatus === status),
  })).filter((group) => group.rows.length > 0);

  if (error) return <p className="text-sm text-(--color-danger)">{error}</p>;

  return (
    <div className="space-y-8">
      <Link
        href={`/dashboard/placement-drives/${id}`}
        className="inline-flex items-center gap-1 text-sm font-medium text-(--color-accent) hover:underline"
      >
        <ChevronLeft aria-hidden="true" size={16} strokeWidth={2} />
        Back to Drive
      </Link>

      <div>
        <DataLabel>{drive?.companyName ?? "Loading…"}</DataLabel>
        <h1 className="mt-1 font-[family-name:var(--font-display)] text-2xl font-semibold text-(--color-text-primary)">
          Applications{drive ? ` — ${drive.title}` : ""}
        </h1>
      </div>

      {isLoading && <p className="text-sm text-(--color-text-secondary)">Loading…</p>}

      {!isLoading && applications.length === 0 && (
        <Card>
          <EmptyState icon={ClipboardList} message="No one has applied to this drive yet." />
        </Card>
      )}

      {!isLoading &&
        grouped.map(({ status, rows }) => (
          <Card key={status} className="space-y-3">
            <div className="flex items-center gap-2">
              <CardTitle>{STATUS_LABELS[status]}</CardTitle>
              <Badge variant={statusBadgeVariant(status)}>{rows.length}</Badge>
            </div>
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeaderCell>Student</TableHeaderCell>
                  <TableHeaderCell>Batch</TableHeaderCell>
                  <TableHeaderCell>Interview</TableHeaderCell>
                  {drive?.type === "INTERNSHIP" && <TableHeaderCell>Internship Outcome</TableHeaderCell>}
                  <TableHeaderCell>Move to</TableHeaderCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((application) => (
                  <TableRow key={application.applicationId}>
                    <TableCell>{application.studentName}</TableCell>
                    <TableCell>{application.batchName}</TableCell>
                    <TableCell>
                      {application.interviewScheduledAt ? (
                        <span className="text-xs text-(--color-text-secondary)">
                          {new Date(application.interviewScheduledAt).toLocaleString()} ·{" "}
                          {interviewModeLabel(application.interviewMode!)}
                        </span>
                      ) : (
                        <span className="text-xs text-(--color-text-secondary)">Not scheduled</span>
                      )}
                      <Button
                        type="button"
                        variant="ghost"
                        className="ml-2 text-xs"
                        onClick={() => setInterviewTarget(application)}
                      >
                        {application.interviewScheduledAt ? "Reschedule" : "Schedule"}
                      </Button>
                    </TableCell>
                    {drive?.type === "INTERNSHIP" && (
                      <TableCell>
                        {application.currentStatus === "ACTIVE" || application.currentStatus === "COMPLETED" ? (
                          <Button type="button" variant="ghost" className="text-xs" onClick={() => setOutcomeTarget(application)}>
                            View / Edit Outcome
                          </Button>
                        ) : (
                          <span className="text-xs text-(--color-text-secondary)">—</span>
                        )}
                      </TableCell>
                    )}
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Select
                          aria-label={`Move ${application.studentName} to`}
                          value={pendingStatusFor[application.applicationId] ?? application.currentStatus}
                          onChange={(e) =>
                            setPendingStatusFor((current) => ({
                              ...current,
                              [application.applicationId]: e.target.value as ApplicationStatus,
                            }))
                          }
                          className="w-40"
                        >
                          {STATUS_ORDER.map((status) => (
                            <option key={status} value={status}>
                              {STATUS_LABELS[status]}
                            </option>
                          ))}
                        </Select>
                        <Button type="button" variant="secondary" onClick={() => handleStatusChange(application)}>
                          Update
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        ))}

      {interviewTarget && (
        <ScheduleInterviewModal
          isOpen={interviewTarget !== null}
          onClose={() => setInterviewTarget(null)}
          accessToken={accessToken}
          application={interviewTarget}
          onScheduled={() => void load()}
        />
      )}

      {outcomeTarget && (
        <InternshipOutcomeModal
          isOpen={outcomeTarget !== null}
          onClose={() => setOutcomeTarget(null)}
          accessToken={accessToken}
          application={outcomeTarget}
        />
      )}
    </div>
  );
}

interface ScheduleInterviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  accessToken: string | null;
  application: DriveApplicationDTO;
  onScheduled: () => void;
}

function toLocalDatetimeInputValue(date: Date | null): string {
  if (!date) return "";
  const d = new Date(date);
  const offsetMs = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - offsetMs).toISOString().slice(0, 16);
}

function ScheduleInterviewModal({ isOpen, onClose, accessToken, application, onScheduled }: ScheduleInterviewModalProps) {
  const [scheduledAt, setScheduledAt] = useState(toLocalDatetimeInputValue(application.interviewScheduledAt));
  const [mode, setMode] = useState<InterviewMode>(application.interviewMode ?? "ONLINE");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!accessToken) return;
    setError(null);
    setIsSubmitting(true);
    try {
      await apiClient.patch(
        `/api/placements/applications/${application.applicationId}/interview`,
        { scheduledAt: new Date(scheduledAt).toISOString(), mode },
        accessToken,
      );
      onScheduled();
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Unable to schedule this interview.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Schedule Interview — ${application.studentName}`}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="interview-datetime">Date &amp; time</Label>
          <Input
            id="interview-datetime"
            type="datetime-local"
            required
            value={scheduledAt}
            onChange={(e) => setScheduledAt(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="interview-mode">Mode</Label>
          <Select id="interview-mode" value={mode} onChange={(e) => setMode(e.target.value as InterviewMode)}>
            <option value="ONLINE">Online</option>
            <option value="IN_PERSON">In person</option>
            <option value="PHONE">Phone</option>
          </Select>
        </div>

        {error && <p className="text-sm text-(--color-danger)">{error}</p>}

        <div className="flex justify-end gap-3 border-t border-(--color-border) pt-4">
          <Button type="button" variant="ghost" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={isSubmitting || !scheduledAt}>
            {isSubmitting ? "Saving…" : "Save"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

interface InternshipOutcomeModalProps {
  isOpen: boolean;
  onClose: () => void;
  accessToken: string | null;
  application: DriveApplicationDTO;
}

/** V4.0 D4 (§5.1) — view/edit the internship-specific tail end of the lifecycle: company feedback (recorded from an offline channel) and the completion certificate. Student feedback is read-only here — only the student submits their own. */
function InternshipOutcomeModal({ isOpen, onClose, accessToken, application }: InternshipOutcomeModalProps) {
  const toast = useToast();
  const [outcome, setOutcome] = useState<InternshipOutcomeRecord | null>(null);
  const [companyFeedback, setCompanyFeedback] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingFeedback, setIsSavingFeedback] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!accessToken) return;
    let cancelled = false;
    (async () => {
      try {
        const record = await apiClient.get<InternshipOutcomeRecord>(
          `/api/placements/applications/${application.applicationId}/outcome`,
          accessToken,
        );
        if (cancelled) return;
        setOutcome(record);
        setCompanyFeedback(record.companyFeedback ?? "");
      } catch (err) {
        if (!cancelled) setError(err instanceof ApiError ? err.message : "Unable to load this outcome.");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [accessToken, application.applicationId]);

  async function handleSaveFeedback() {
    if (!accessToken) return;
    setIsSavingFeedback(true);
    try {
      const updated = await apiClient.patch<InternshipOutcomeRecord>(
        `/api/placements/applications/${application.applicationId}/outcome`,
        { companyFeedback },
        accessToken,
      );
      setOutcome(updated);
      toast.success("Company feedback saved.");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Unable to save feedback.");
    } finally {
      setIsSavingFeedback(false);
    }
  }

  async function handleFileSelected(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !accessToken) return;
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const updated = await apiClient.upload<InternshipOutcomeRecord>(
        `/api/placements/applications/${application.applicationId}/outcome/certificate`,
        formData,
        accessToken,
      );
      setOutcome(updated);
      toast.success("Certificate uploaded.");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Unable to upload the certificate.");
    } finally {
      setIsUploading(false);
    }
  }

  async function handleDownloadCertificate() {
    if (!accessToken) return;
    setIsDownloading(true);
    try {
      const { blob, filename } = await apiClient.download(
        `/api/placements/applications/${application.applicationId}/outcome/certificate`,
        accessToken,
        `certificate-${application.studentName}`,
      );
      triggerBrowserDownload(blob, filename);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Unable to download the certificate.");
    } finally {
      setIsDownloading(false);
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Internship Outcome — ${application.studentName}`}>
      <div className="space-y-4">
        {isLoading && <p className="text-sm text-(--color-text-secondary)">Loading…</p>}
        {error && <p className="text-sm text-(--color-danger)">{error}</p>}

        {!isLoading && outcome && (
          <>
            {outcome.completedAt && (
              <p className="text-xs text-(--color-text-secondary)">
                Completed {new Date(outcome.completedAt).toISOString().slice(0, 10)}
              </p>
            )}

            <div>
              <Label htmlFor="company-feedback">Company feedback</Label>
              <Textarea
                id="company-feedback"
                rows={4}
                value={companyFeedback}
                onChange={(e) => setCompanyFeedback(e.target.value)}
                placeholder="Record feedback received from the company (offline channel)…"
              />
              <div className="mt-2 flex justify-end">
                <Button type="button" variant="secondary" onClick={handleSaveFeedback} disabled={isSavingFeedback}>
                  {isSavingFeedback ? "Saving…" : "Save Feedback"}
                </Button>
              </div>
            </div>

            <div>
              <Label>Student feedback</Label>
              <p className="text-sm text-(--color-text-primary)">
                {outcome.studentFeedback ?? <span className="text-(--color-text-secondary)">Not submitted yet.</span>}
              </p>
            </div>

            <div className="border-t border-(--color-border) pt-4">
              <Label>Completion certificate</Label>
              <div className="flex flex-wrap items-center gap-3">
                {outcome.certificateFileId && (
                  <Button type="button" variant="secondary" onClick={handleDownloadCertificate} disabled={isDownloading}>
                    {isDownloading ? "Downloading…" : "Download Certificate"}
                  </Button>
                )}
                <label className="inline-flex cursor-pointer items-center">
                  <span className="rounded-md border border-(--color-border) px-4 py-2 text-sm font-medium text-(--color-text-primary) transition-colors duration-150 hover:bg-(--color-surface-muted)">
                    {isUploading ? "Uploading…" : outcome.certificateFileId ? "Replace Certificate" : "Upload Certificate"}
                  </span>
                  <input
                    type="file"
                    accept="application/pdf,image/jpeg,image/png"
                    className="sr-only"
                    disabled={isUploading}
                    onChange={handleFileSelected}
                  />
                </label>
              </div>
            </div>
          </>
        )}

        <div className="flex justify-end border-t border-(--color-border) pt-4">
          <Button type="button" variant="ghost" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
}
