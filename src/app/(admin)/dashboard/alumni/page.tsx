"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { GraduationCap, Plus } from "lucide-react";
import { useAuth } from "@/modules/auth/client";
import { apiClient, ApiError } from "@/lib/api-client";
import type { AlumniRecord } from "@/modules/alumni";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { CardTitle } from "@/components/ui/typography";
import { Modal } from "@/components/ui/modal";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/empty-state";
import { useToast } from "@/components/ui/toast";

/**
 * V4.0 D5 (§4/§17) — Alumni records. The one entity in this PRD where
 * Secretary and Coordinator (either position) have byte-for-byte identical
 * Full/operational authority — unlike Companies (A4), there is no
 * role-gated write UI here at all; every authenticated viewer of this page
 * can create/edit/delete, matching `canManageAlumni`'s single-function
 * permission surface exactly.
 */
export default function AlumniPage() {
  const { accessToken } = useAuth();
  const toast = useToast();

  const [alumni, setAlumni] = useState<AlumniRecord[]>([]);
  const [name, setName] = useState("");
  const [graduationYear, setGraduationYear] = useState("");
  const [mentorshipOnly, setMentorshipOnly] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingAlumni, setEditingAlumni] = useState<AlumniRecord | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<AlumniRecord | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const load = useCallback(async () => {
    if (!accessToken) return;
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (name) params.set("name", name);
      if (graduationYear) params.set("graduationYear", graduationYear);
      if (mentorshipOnly) params.set("mentorshipAvailable", "true");
      const results = await apiClient.get<AlumniRecord[]>(`/api/alumni?${params.toString()}`, accessToken);
      setAlumni(results);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Unable to load alumni records.");
    } finally {
      setIsLoading(false);
    }
  }, [accessToken, name, graduationYear, mentorshipOnly]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  function handleSearchSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void load();
  }

  async function handleDelete() {
    if (!confirmDelete || !accessToken) return;
    setIsDeleting(true);
    try {
      await apiClient.delete(`/api/alumni/${confirmDelete.id}`, accessToken);
      toast.success(`${confirmDelete.fullName} removed.`);
      setConfirmDelete(null);
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Unable to remove this alumni record.");
    } finally {
      setIsDeleting(false);
    }
  }

  // MYARCH Phase 1 (§2.4) — approves/rejects a self-signed-up (PENDING)
  // alumni account. Dormant for admin-created rows, which default to
  // APPROVED — mirrors RecruitersPage's handleApprove/handleReject exactly.
  async function handleApprove(alumniId: string) {
    if (!accessToken) return;
    try {
      await apiClient.post(`/api/alumni/${alumniId}/approve`, undefined, accessToken);
      toast.success("Alumni account approved.");
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Unable to approve this account.");
    }
  }

  async function handleReject(alumniId: string) {
    if (!accessToken) return;
    try {
      await apiClient.post(`/api/alumni/${alumniId}/reject`, undefined, accessToken);
      toast.success("Alumni account rejected.");
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Unable to reject this account.");
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold text-(--color-text-primary)">
            Alumni
          </h1>
          <p className="mt-1 text-sm text-(--color-text-secondary)">Department alumni records.</p>
        </div>
        <Button type="button" variant="primary" onClick={() => setIsCreateOpen(true)} className="gap-2">
          <Plus aria-hidden="true" size={16} strokeWidth={1.75} />
          New Alumni Record
        </Button>
      </div>

      <Card>
        <form onSubmit={handleSearchSubmit} className="flex flex-wrap items-end gap-4">
          <div className="min-w-48 flex-1">
            <Label htmlFor="search-name">Name</Label>
            <Input id="search-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Search by name" />
          </div>
          <div className="w-32">
            <Label htmlFor="search-year">Graduation year</Label>
            <Input
              id="search-year"
              type="number"
              value={graduationYear}
              onChange={(e) => setGraduationYear(e.target.value)}
            />
          </div>
          <Checkbox
            id="mentorship-only"
            label="Mentorship available"
            checked={mentorshipOnly}
            onChange={(e) => setMentorshipOnly(e.target.checked)}
          />
          <Button type="submit" variant="secondary">
            Search
          </Button>
        </form>
      </Card>

      {error && <p className="text-sm text-(--color-danger)">{error}</p>}
      {isLoading && <p className="text-sm text-(--color-text-secondary)">Loading alumni…</p>}

      {!isLoading && alumni.length === 0 && (
        <Card>
          <EmptyState icon={GraduationCap} message="No alumni records yet." />
        </Card>
      )}

      {!isLoading && alumni.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {alumni.map((record) => (
            <Card key={record.id} className="border-t-2 border-t-(--color-accent)">
              <div className="flex items-center justify-between gap-2">
                <CardTitle>{record.fullName}</CardTitle>
                <div className="flex flex-wrap items-center gap-1.5">
                  {record.mentorshipAvailable && <Badge variant="active">Mentorship</Badge>}
                  {record.approvalStatus !== "APPROVED" && (
                    <Badge variant={record.approvalStatus === "PENDING" ? "pending" : "rejected"}>
                      {record.approvalStatus === "PENDING" ? "Pending" : "Rejected"}
                    </Badge>
                  )}
                </div>
              </div>
              <p className="mt-0.5 text-xs text-(--color-text-secondary)">Class of {record.graduationYear}</p>
              {record.currentCompany && (
                <p className="mt-2 text-sm text-(--color-text-primary)">
                  {record.designation ? `${record.designation} at ${record.currentCompany}` : record.currentCompany}
                </p>
              )}
              {record.location && <p className="text-xs text-(--color-text-secondary)">{record.location}</p>}

              <div className="mt-4 flex flex-wrap gap-2 border-t border-(--color-border) pt-3">
                {record.approvalStatus === "PENDING" && (
                  <>
                    <button
                      type="button"
                      onClick={() => handleApprove(record.id)}
                      className="text-sm font-medium text-(--color-accent) hover:underline"
                    >
                      Approve
                    </button>
                    <button
                      type="button"
                      onClick={() => handleReject(record.id)}
                      className="text-sm font-medium text-(--color-danger) hover:underline"
                    >
                      Reject
                    </button>
                  </>
                )}
                <Button type="button" variant="secondary" onClick={() => setEditingAlumni(record)}>
                  Edit
                </Button>
                <Button type="button" variant="destructive" onClick={() => setConfirmDelete(record)}>
                  Delete
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <ConfirmDialog
        isOpen={confirmDelete !== null}
        onClose={() => setConfirmDelete(null)}
        onConfirm={handleDelete}
        title="Remove this alumni record?"
        description={confirmDelete ? `${confirmDelete.fullName}'s record will be permanently removed.` : ""}
        confirmLabel="Delete"
        variant="destructive"
        isConfirming={isDeleting}
      />

      <AlumniFormModal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} accessToken={accessToken} onSaved={() => void load()} />
      <AlumniFormModal
        isOpen={editingAlumni !== null}
        onClose={() => setEditingAlumni(null)}
        accessToken={accessToken}
        alumni={editingAlumni}
        onSaved={() => void load()}
      />
    </div>
  );
}

interface AlumniFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  accessToken: string | null;
  alumni?: AlumniRecord | null;
  onSaved: () => void;
}

function AlumniFormModal({ isOpen, onClose, accessToken, alumni, onSaved }: AlumniFormModalProps) {
  const isEditing = alumni != null;
  const [fullName, setFullName] = useState(alumni?.fullName ?? "");
  const [graduationYear, setGraduationYear] = useState(alumni?.graduationYear.toString() ?? "");
  const [currentCompany, setCurrentCompany] = useState(alumni?.currentCompany ?? "");
  const [designation, setDesignation] = useState(alumni?.designation ?? "");
  const [location, setLocation] = useState(alumni?.location ?? "");
  const [portfolioUrl, setPortfolioUrl] = useState(alumni?.portfolioUrl ?? "");
  const [linkedInUrl, setLinkedInUrl] = useState(alumni?.linkedInUrl ?? "");
  const [mentorshipAvailable, setMentorshipAvailable] = useState(alumni?.mentorshipAvailable ?? false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [lastAlumniId, setLastAlumniId] = useState(alumni?.id);
  if (alumni?.id !== lastAlumniId) {
    setLastAlumniId(alumni?.id);
    setFullName(alumni?.fullName ?? "");
    setGraduationYear(alumni?.graduationYear.toString() ?? "");
    setCurrentCompany(alumni?.currentCompany ?? "");
    setDesignation(alumni?.designation ?? "");
    setLocation(alumni?.location ?? "");
    setPortfolioUrl(alumni?.portfolioUrl ?? "");
    setLinkedInUrl(alumni?.linkedInUrl ?? "");
    setMentorshipAvailable(alumni?.mentorshipAvailable ?? false);
    setError(null);
  }

  function handleClose() {
    setError(null);
    onClose();
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      if (isEditing) {
        await apiClient.patch(
          `/api/alumni/${alumni.id}`,
          {
            fullName,
            graduationYear: Number(graduationYear),
            currentCompany: currentCompany || null,
            designation: designation || null,
            location: location || null,
            portfolioUrl: portfolioUrl || null,
            linkedInUrl: linkedInUrl || null,
            mentorshipAvailable,
          },
          accessToken ?? undefined,
        );
      } else {
        await apiClient.post(
          "/api/alumni",
          {
            fullName,
            graduationYear: Number(graduationYear),
            currentCompany: currentCompany || undefined,
            designation: designation || undefined,
            location: location || undefined,
            portfolioUrl: portfolioUrl || undefined,
            linkedInUrl: linkedInUrl || undefined,
            mentorshipAvailable,
          },
          accessToken ?? undefined,
        );
      }
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Unable to save this alumni record.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={isEditing ? "Edit Alumni Record" : "New Alumni Record"}>
      <form onSubmit={handleSubmit} className="max-h-[70vh] space-y-4 overflow-y-auto">
        <div>
          <Label htmlFor="alumni-name">Full name</Label>
          <Input id="alumni-name" required value={fullName} onChange={(e) => setFullName(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="alumni-year">Graduation year</Label>
          <Input
            id="alumni-year"
            type="number"
            required
            min={1950}
            max={2100}
            value={graduationYear}
            onChange={(e) => setGraduationYear(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="alumni-company">Current company</Label>
          <Input id="alumni-company" value={currentCompany} onChange={(e) => setCurrentCompany(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="alumni-designation">Designation</Label>
          <Input id="alumni-designation" value={designation} onChange={(e) => setDesignation(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="alumni-location">Location</Label>
          <Input id="alumni-location" value={location} onChange={(e) => setLocation(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="alumni-portfolio">Portfolio URL</Label>
          <Input
            id="alumni-portfolio"
            type="url"
            placeholder="https://…"
            value={portfolioUrl}
            onChange={(e) => setPortfolioUrl(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="alumni-linkedin">LinkedIn URL</Label>
          <Input
            id="alumni-linkedin"
            type="url"
            placeholder="https://…"
            value={linkedInUrl}
            onChange={(e) => setLinkedInUrl(e.target.value)}
          />
        </div>
        <Checkbox
          id="alumni-mentorship"
          label="Available for mentorship"
          checked={mentorshipAvailable}
          onChange={(e) => setMentorshipAvailable(e.target.checked)}
        />

        {error && <p className="text-sm text-(--color-danger)">{error}</p>}

        <div className="flex justify-end gap-3 border-t border-(--color-border) pt-4">
          <Button type="button" variant="ghost" onClick={handleClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={isSubmitting}>
            {isSubmitting ? "Saving…" : isEditing ? "Save changes" : "Create Record"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
