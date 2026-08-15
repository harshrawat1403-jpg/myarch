"use client";

import Link from "next/link";
import { useState, type ChangeEvent, type FormEvent } from "react";
import { CheckCircle2 } from "lucide-react";
import { useAuth } from "@/modules/auth/client";
import { apiClient, ApiError } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FieldError, Input, Label } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { DataLabel } from "@/components/ui/typography";

const CATEGORIES: { value: string; label: string }[] = [
  { value: "ELECTRICAL", label: "Electrical" },
  { value: "PLUMBING", label: "Plumbing" },
  { value: "FURNITURE", label: "Furniture" },
  { value: "HVAC", label: "HVAC" },
  { value: "NETWORK", label: "Network/Internet" },
  { value: "CLASSROOM_STUDIO", label: "Classroom/Studio" },
  { value: "LAB", label: "Lab" },
  { value: "EQUIPMENT", label: "Equipment" },
  { value: "CLEANING", label: "Cleaning" },
  { value: "SAFETY", label: "Safety" },
  { value: "CIVIL_BUILDING", label: "Civil/Building" },
  { value: "OTHER", label: "Other" },
];

// Mirrors AddMaintenanceAttachmentUseCase's own limits exactly (add-attachment.ts)
// — validated here only so a visitor sees the problem before uploading, not
// as a second source of truth; the server re-validates independently.
const ALLOWED_ATTACHMENT_TYPES = ["image/jpeg", "image/png", "application/pdf"];
const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024;

interface ReportedIssue {
  id: string;
}

/**
 * Two submission paths, both landing in the exact same MaintenanceIssue
 * lifecycle:
 *
 *  - Signed in as Secretary/Coordinator/Student: the existing authenticated
 *    flow, unchanged — POST /api/maintenance/issues
 *    (ReportMaintenanceIssueUseCase), photo attachment still available via
 *    the existing POST /api/maintenance/issues/[id]/attachments.
 *  - Not signed in: the new public flow — POST /api/maintenance/issues/public
 *    (ReportPublicMaintenanceIssueUseCase), collecting name/email instead of
 *    relying on a session. No photo upload here — see that use case's own
 *    doc comment for why this first implementation deliberately excludes it.
 *
 * A signed-in Recruiter/Alumni account (a role Maintenance doesn't cover at
 * all — canReportMaintenanceIssue) sees neither form, just an explanation;
 * this is a deliberate exclusion, not the same as being unauthenticated, so
 * it does not fall back to the public form.
 */
export function MaintenanceReportForm() {
  const { accessToken, role, isLoading } = useAuth();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [category, setCategory] = useState("ELECTRICAL");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("MEDIUM");
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [reported, setReported] = useState<ReportedIssue | null>(null);

  const canReportAuthenticated = role === "SECRETARY" || role === "COORDINATOR" || role === "STUDENT";
  const isIneligibleAuthenticated = role !== null && !canReportAuthenticated;

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files?.[0] ?? null;
    setFileError(null);
    if (!selected) {
      setFile(null);
      return;
    }
    if (!ALLOWED_ATTACHMENT_TYPES.includes(selected.type)) {
      setFileError("Only JPEG, PNG, or PDF files are allowed.");
      setFile(null);
      event.target.value = "";
      return;
    }
    if (selected.size > MAX_ATTACHMENT_BYTES) {
      setFileError("File must be 5MB or smaller.");
      setFile(null);
      event.target.value = "";
      return;
    }
    setFile(selected);
  }

  async function handleAuthenticatedSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      const issue = await apiClient.post<ReportedIssue>(
        "/api/maintenance/issues",
        { category, location, description, priority },
        accessToken ?? undefined,
      );

      if (file) {
        try {
          const formData = new FormData();
          formData.append("file", file);
          await apiClient.upload(`/api/maintenance/issues/${issue.id}/attachments`, formData, accessToken ?? undefined);
        } catch {
          // The report itself was already created successfully — a failed
          // photo upload must never make this look like a failed report.
          // The complainant can add a photo later from their own issue page.
        }
      }

      setReported(issue);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Unable to submit your report. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handlePublicSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      const issue = await apiClient.post<ReportedIssue>("/api/maintenance/issues/public", {
        name,
        email,
        category,
        location,
        description,
        priority,
      });
      setReported(issue);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Unable to submit your report. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading) {
    return (
      <Card className="p-8 text-center shadow-lg lg:p-12">
        <p className="text-sm text-(--color-text-secondary)">Loading…</p>
      </Card>
    );
  }

  if (reported) {
    return (
      <Card className="p-8 text-center shadow-lg lg:p-12">
        <CheckCircle2 aria-hidden="true" size={40} strokeWidth={1.5} className="mx-auto text-(--color-accent)" />
        <DataLabel className="mt-4 text-(--color-accent)">Report Submitted</DataLabel>
        <p className="mt-3 text-(--color-text-secondary)">
          Your maintenance issue has been reported. The department has been notified.
        </p>
        <p className="mt-4 text-sm text-(--color-text-secondary)">Reference ID</p>
        <p className="mt-1 break-all font-[family-name:var(--font-data)] text-sm text-(--color-text-primary)">
          {reported.id}
        </p>
        {canReportAuthenticated ? (
          <Link
            href={`/maintenance/${reported.id}`}
            className="mt-6 inline-block text-sm font-medium text-(--color-accent) hover:underline"
          >
            Track this report
          </Link>
        ) : (
          <p className="mt-6 text-xs text-(--color-text-secondary)">
            Save this reference ID — the department will contact you at {email} with updates.
          </p>
        )}
      </Card>
    );
  }

  if (isIneligibleAuthenticated) {
    return (
      <Card className="p-8 text-center shadow-lg lg:p-12">
        <DataLabel className="text-(--color-accent)">Not Available for This Account</DataLabel>
        <p className="mt-3 text-(--color-text-secondary)">
          Maintenance reporting is available to Students and department staff accounts.
        </p>
      </Card>
    );
  }

  return (
    <Card className="p-8 shadow-lg lg:p-12">
      <form onSubmit={canReportAuthenticated ? handleAuthenticatedSubmit : handlePublicSubmit} noValidate className="space-y-6">
        {!canReportAuthenticated && (
          <>
            <p className="text-sm text-(--color-text-secondary)">
              Reporting anonymously? Enter your name and email below — the department will use this to keep you
              updated and, if you have an account, you can also{" "}
              <Link href="/login" className="font-medium text-(--color-accent) hover:underline">
                sign in
              </Link>{" "}
              to track and manage reports from your own account.
            </p>
            <div>
              <Label htmlFor="report-name">Name</Label>
              <Input id="report-name" required value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="report-email">Email</Label>
              <Input
                id="report-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
              />
            </div>
          </>
        )}

        <div>
          <Label htmlFor="report-category">Category</Label>
          <Select id="report-category" value={category} onChange={(e) => setCategory(e.target.value)}>
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </Select>
        </div>

        <div>
          <Label htmlFor="report-location">Location</Label>
          <Input
            id="report-location"
            required
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="e.g. Studio 3, 2nd floor"
          />
        </div>

        <div>
          <Label htmlFor="report-description">Description</Label>
          <Textarea id="report-description" required rows={4} value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>

        <div>
          <Label htmlFor="report-priority">Priority</Label>
          <Select id="report-priority" value={priority} onChange={(e) => setPriority(e.target.value)}>
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
            <option value="URGENT">Urgent</option>
          </Select>
        </div>

        {canReportAuthenticated && (
          <div>
            <Label htmlFor="report-attachment">Photo (optional)</Label>
            <input
              id="report-attachment"
              type="file"
              accept="image/jpeg,image/png,application/pdf"
              onChange={handleFileChange}
              className="mt-1 block w-full text-sm text-(--color-text-secondary)"
            />
            <p className="mt-1 text-xs text-(--color-text-secondary)">JPEG, PNG, or PDF, up to 5MB.</p>
            <FieldError>{fileError ?? undefined}</FieldError>
          </div>
        )}

        <FieldError>{error ?? undefined}</FieldError>

        <Button type="submit" variant="primary" className="w-full py-3 text-base" disabled={isSubmitting}>
          {isSubmitting ? "Submitting…" : "Submit Report"}
        </Button>
      </form>
    </Card>
  );
}
