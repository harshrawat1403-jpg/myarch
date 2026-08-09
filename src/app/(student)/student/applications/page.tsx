"use client";

import { useEffect, useState } from "react";
import { Briefcase, ClipboardList } from "lucide-react";
import { useAuth } from "@/modules/auth/client";
import { apiClient, ApiError } from "@/lib/api-client";
import { triggerBrowserDownload } from "@/lib/browser-download";
import { useToast } from "@/components/ui/toast";
import type { InternshipOutcomeRecord, StudentApplicationDTO, StudentDriveDTO } from "@/modules/placements";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/input";
import { Badge, type BadgeVariant } from "@/components/ui/badge";
import { DataLabel } from "@/components/ui/typography";
import { EmptyState } from "@/components/empty-state";
import { Modal } from "@/components/ui/modal";

type ApplicationStatus = StudentApplicationDTO["currentStatus"];

const TERMINAL_STATUSES: readonly ApplicationStatus[] = ["REJECTED", "COMPLETED", "WITHDRAWN"];

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

/**
 * V4.0 D2 (§7 step 8) — /student/applications: open drives to browse and
 * apply to, plus the student's own applications with their current status
 * and a withdraw action. `/student` itself is enriched with this data later
 * (D6); this page is the self-contained new surface D2 adds.
 */
export default function StudentApplicationsPage() {
  const { accessToken } = useAuth();
  const toast = useToast();

  const [openDrives, setOpenDrives] = useState<StudentDriveDTO[]>([]);
  const [applications, setApplications] = useState<StudentApplicationDTO[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingDriveId, setPendingDriveId] = useState<string | null>(null);
  const [pendingApplicationId, setPendingApplicationId] = useState<string | null>(null);
  const [outcomeTarget, setOutcomeTarget] = useState<StudentApplicationDTO | null>(null);

  async function load() {
    if (!accessToken) return;
    setIsLoading(true);
    setError(null);
    try {
      const [drives, myApplications] = await Promise.all([
        apiClient.get<StudentDriveDTO[]>("/api/student/drives", accessToken),
        apiClient.get<StudentApplicationDTO[]>("/api/student/applications", accessToken),
      ]);
      setOpenDrives(drives);
      setApplications(myApplications);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Unable to load placement drives.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    // load() only sets state after its own awaited fetch resolves, and is
    // also called from the apply/withdraw handlers below — the same
    // shared-reload pattern used by recruiter-directory-page.tsx.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken]);

  async function handleApply(driveId: string) {
    if (!accessToken) return;
    setPendingDriveId(driveId);
    try {
      await apiClient.post(`/api/student/drives/${driveId}/apply`, undefined, accessToken);
      toast.success("Application submitted.");
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Unable to submit your application.");
    } finally {
      setPendingDriveId(null);
    }
  }

  async function handleWithdraw(applicationId: string) {
    if (!accessToken) return;
    setPendingApplicationId(applicationId);
    try {
      await apiClient.post(`/api/placements/applications/${applicationId}/withdraw`, undefined, accessToken);
      toast.success("Application withdrawn.");
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Unable to withdraw this application.");
    } finally {
      setPendingApplicationId(null);
    }
  }

  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <DataLabel>Placement &amp; Internships</DataLabel>
        <h1 className="mt-1 font-[family-name:var(--font-display)] text-2xl font-semibold text-(--color-text-primary)">
          Applications
        </h1>
      </div>

      {error && <p className="text-sm text-(--color-danger)">{error}</p>}
      {isLoading && <p className="text-sm text-(--color-text-secondary)">Loading…</p>}

      {!isLoading && (
        <>
          <section className="space-y-4">
            <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold text-(--color-text-primary)">
              Open Drives
            </h2>
            {openDrives.length === 0 ? (
              <Card>
                <EmptyState icon={Briefcase} message="No open drives right now — check back soon." />
              </Card>
            ) : (
              <div className="space-y-4">
                {openDrives.map((drive) => (
                  <Card key={drive.driveId} className="space-y-2">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-medium text-(--color-text-primary)">{drive.companyName}</p>
                        <p className="text-sm text-(--color-text-secondary)">{drive.title}</p>
                      </div>
                      <Badge variant="neutral">{drive.type === "INTERNSHIP" ? "Internship" : "Placement"}</Badge>
                    </div>
                    {drive.packageOrStipend && <p className="text-sm text-(--color-text-primary)">{drive.packageOrStipend}</p>}
                    {drive.applicationDeadline && (
                      <p className="text-xs text-(--color-text-secondary)">
                        Apply by {new Date(drive.applicationDeadline).toISOString().slice(0, 10)}
                      </p>
                    )}
                    <div className="border-t border-(--color-border) pt-3">
                      {drive.hasApplied ? (
                        <Badge variant={statusBadgeVariant(drive.applicationStatus ?? "APPLIED")}>
                          Applied — {drive.applicationStatus}
                        </Badge>
                      ) : (
                        <Button
                          type="button"
                          variant="primary"
                          disabled={pendingDriveId === drive.driveId}
                          onClick={() => handleApply(drive.driveId)}
                        >
                          Apply
                        </Button>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </section>

          <section className="space-y-4">
            <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold text-(--color-text-primary)">
              My Applications
            </h2>
            {applications.length === 0 ? (
              <Card>
                <EmptyState icon={ClipboardList} message="You haven't applied to any drives yet." />
              </Card>
            ) : (
              <div className="space-y-4">
                {applications.map((application) => (
                  <Card key={application.applicationId} className="space-y-2">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-medium text-(--color-text-primary)">{application.companyName}</p>
                        <p className="text-sm text-(--color-text-secondary)">{application.title}</p>
                      </div>
                      <Badge variant={statusBadgeVariant(application.currentStatus)}>{application.currentStatus}</Badge>
                    </div>
                    {!TERMINAL_STATUSES.includes(application.currentStatus) && (
                      <div className="border-t border-(--color-border) pt-3">
                        <Button
                          type="button"
                          variant="secondary"
                          disabled={pendingApplicationId === application.applicationId}
                          onClick={() => handleWithdraw(application.applicationId)}
                        >
                          Withdraw
                        </Button>
                      </div>
                    )}
                    {application.type === "INTERNSHIP" &&
                      (application.currentStatus === "ACTIVE" || application.currentStatus === "COMPLETED") && (
                        <div className="border-t border-(--color-border) pt-3">
                          <Button type="button" variant="secondary" onClick={() => setOutcomeTarget(application)}>
                            Internship Outcome
                          </Button>
                        </div>
                      )}
                  </Card>
                ))}
              </div>
            )}
          </section>
        </>
      )}

      {outcomeTarget && (
        <StudentInternshipOutcomeModal
          isOpen={outcomeTarget !== null}
          onClose={() => setOutcomeTarget(null)}
          accessToken={accessToken}
          application={outcomeTarget}
        />
      )}
    </div>
  );
}

interface StudentInternshipOutcomeModalProps {
  isOpen: boolean;
  onClose: () => void;
  accessToken: string | null;
  application: StudentApplicationDTO;
}

/** V4.0 D4 — the student's own view: company feedback (read-only, recorded by admin), the completion certificate (download only), and their own feedback (editable, self-service). */
function StudentInternshipOutcomeModal({ isOpen, onClose, accessToken, application }: StudentInternshipOutcomeModalProps) {
  const toast = useToast();
  const [outcome, setOutcome] = useState<InternshipOutcomeRecord | null>(null);
  const [studentFeedback, setStudentFeedback] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
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
        setStudentFeedback(record.studentFeedback ?? "");
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

  async function handleSave() {
    if (!accessToken) return;
    setIsSaving(true);
    try {
      const updated = await apiClient.patch<InternshipOutcomeRecord>(
        `/api/placements/applications/${application.applicationId}/outcome/student-feedback`,
        { studentFeedback },
        accessToken,
      );
      setOutcome(updated);
      toast.success("Feedback saved.");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Unable to save your feedback.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDownload() {
    if (!accessToken) return;
    setIsDownloading(true);
    try {
      const { blob, filename } = await apiClient.download(
        `/api/placements/applications/${application.applicationId}/outcome/certificate`,
        accessToken,
        `certificate-${application.companyName}`,
      );
      triggerBrowserDownload(blob, filename);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Unable to download the certificate.");
    } finally {
      setIsDownloading(false);
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Internship Outcome — ${application.companyName}`}>
      <div className="space-y-4">
        {isLoading && <p className="text-sm text-(--color-text-secondary)">Loading…</p>}
        {error && <p className="text-sm text-(--color-danger)">{error}</p>}

        {!isLoading && outcome && (
          <>
            {outcome.certificateFileId && (
              <Button type="button" variant="secondary" onClick={handleDownload} disabled={isDownloading}>
                {isDownloading ? "Downloading…" : "Download Certificate"}
              </Button>
            )}

            {outcome.companyFeedback && (
              <div>
                <Label>Company feedback</Label>
                <p className="text-sm text-(--color-text-primary)">{outcome.companyFeedback}</p>
              </div>
            )}

            <div>
              <Label htmlFor="student-feedback">Your feedback</Label>
              <Textarea
                id="student-feedback"
                rows={4}
                value={studentFeedback}
                onChange={(e) => setStudentFeedback(e.target.value)}
                placeholder="Share your experience during this internship…"
              />
            </div>
          </>
        )}

        <div className="flex justify-end gap-3 border-t border-(--color-border) pt-4">
          <Button type="button" variant="ghost" onClick={onClose}>
            Close
          </Button>
          {!isLoading && outcome && (
            <Button type="button" variant="primary" onClick={handleSave} disabled={isSaving || !studentFeedback.trim()}>
              {isSaving ? "Saving…" : "Save Feedback"}
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
}
