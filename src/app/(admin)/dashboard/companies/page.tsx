"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Briefcase, Globe, Plus } from "lucide-react";
import { useAuth } from "@/modules/auth/client";
import { apiClient, ApiError } from "@/lib/api-client";
import type { CompanyRecord } from "@/modules/companies";
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
 * V4.0 A4 — Company directory. Secretary-managed, Coordinator-viewable
 * (docs/planning/V4_0_PRD.md §4/§17): the search/list is visible to both
 * roles (matches the route handler's own `{ roles: ["SECRETARY",
 * "COORDINATOR"] }` gate); create/edit/disable/enable are gated on
 * `isSecretary` here, backed by the same restriction server-side
 * (`canManageCompanies`) — this is UX parity, not the actual authorization
 * boundary. Follows batches/page.tsx's simpler single-page card-grid
 * pattern (no separate detail route) since Company has none of
 * Coordinator's batch-assignment/password-reset complexity.
 */
export default function CompaniesPage() {
  const { accessToken, role } = useAuth();
  const isSecretary = role === "SECRETARY";
  const toast = useToast();

  const [companies, setCompanies] = useState<CompanyRecord[]>([]);
  const [name, setName] = useState("");
  const [includeInactive, setIncludeInactive] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<CompanyRecord | null>(null);
  const [confirmToggle, setConfirmToggle] = useState<CompanyRecord | null>(null);
  const [isTogglingActive, setIsTogglingActive] = useState(false);

  const load = useCallback(async () => {
    if (!accessToken) return;
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (name) params.set("name", name);
      if (includeInactive) params.set("includeInactive", "true");
      const results = await apiClient.get<CompanyRecord[]>(`/api/companies?${params.toString()}`, accessToken);
      setCompanies(results);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Unable to load companies.");
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

  async function handleToggleActive() {
    if (!confirmToggle || !accessToken) return;
    setIsTogglingActive(true);
    try {
      const action = confirmToggle.isActive ? "disable" : "enable";
      await apiClient.post(`/api/companies/${confirmToggle.id}/${action}`, undefined, accessToken);
      toast.success(`${confirmToggle.name} ${action}d.`);
      setConfirmToggle(null);
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Unable to update company status.");
    } finally {
      setIsTogglingActive(false);
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold text-(--color-text-primary)">
            Companies
          </h1>
          <p className="mt-1 text-sm text-(--color-text-secondary)">
            The recruiter/placement-drive company directory.
          </p>
        </div>
        {isSecretary && (
          <Button type="button" variant="primary" onClick={() => setIsCreateOpen(true)} className="gap-2">
            <Plus aria-hidden="true" size={16} strokeWidth={1.75} />
            New Company
          </Button>
        )}
      </div>

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
      {isLoading && <p className="text-sm text-(--color-text-secondary)">Loading companies…</p>}

      {!isLoading && companies.length === 0 && (
        <Card>
          <EmptyState icon={Briefcase} message="No companies yet." />
        </Card>
      )}

      {!isLoading && companies.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {companies.map((company) => (
            <Card key={company.id} className="border-t-2 border-t-(--color-accent)">
              <div className="flex items-center justify-between">
                <CardTitle>{company.name}</CardTitle>
                <Badge variant={company.isActive ? "active" : "archived"}>
                  {company.isActive ? "Active" : "Disabled"}
                </Badge>
              </div>
              <p className="mt-0.5 text-xs text-(--color-text-secondary)">{company.sector ?? "Sector not set"}</p>
              {company.website && (
                <a
                  href={company.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-(--color-accent) hover:underline"
                >
                  <Globe aria-hidden="true" size={12} strokeWidth={2} />
                  {company.website}
                </a>
              )}

              {isSecretary && (
                <div className="mt-4 flex gap-2 border-t border-(--color-border) pt-3">
                  <Button type="button" variant="secondary" onClick={() => setEditingCompany(company)}>
                    Edit
                  </Button>
                  <Button
                    type="button"
                    variant={company.isActive ? "destructive" : "secondary"}
                    onClick={() => setConfirmToggle(company)}
                  >
                    {company.isActive ? "Disable" : "Enable"}
                  </Button>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      <ConfirmDialog
        isOpen={confirmToggle !== null}
        onClose={() => setConfirmToggle(null)}
        onConfirm={handleToggleActive}
        title={confirmToggle?.isActive ? "Disable this company?" : "Enable this company?"}
        description={
          confirmToggle?.isActive
            ? `${confirmToggle.name} will be hidden from the directory until re-enabled.`
            : `${confirmToggle?.name} will reappear in the directory.`
        }
        confirmLabel={confirmToggle?.isActive ? "Disable" : "Enable"}
        variant={confirmToggle?.isActive ? "destructive" : "default"}
        isConfirming={isTogglingActive}
      />

      <CompanyFormModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        accessToken={accessToken}
        onSaved={() => void load()}
      />
      <CompanyFormModal
        isOpen={editingCompany !== null}
        onClose={() => setEditingCompany(null)}
        accessToken={accessToken}
        company={editingCompany}
        onSaved={() => void load()}
      />
    </div>
  );
}

interface CompanyFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  accessToken: string | null;
  company?: CompanyRecord | null;
  onSaved: () => void;
}

function CompanyFormModal({ isOpen, onClose, accessToken, company, onSaved }: CompanyFormModalProps) {
  const isEditing = company != null;
  const [name, setName] = useState(company?.name ?? "");
  const [sector, setSector] = useState(company?.sector ?? "");
  const [website, setWebsite] = useState(company?.website ?? "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Render-time reset when the target company changes (opening the modal
  // for a different card, or switching from edit to create) — the same
  // "adjust state when a prop changes" pattern Modal itself uses.
  const [lastCompanyId, setLastCompanyId] = useState(company?.id);
  if (company?.id !== lastCompanyId) {
    setLastCompanyId(company?.id);
    setName(company?.name ?? "");
    setSector(company?.sector ?? "");
    setWebsite(company?.website ?? "");
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
          `/api/companies/${company.id}`,
          { name, sector: sector || null, website: website || null },
          accessToken ?? undefined,
        );
      } else {
        await apiClient.post(
          "/api/companies",
          { name, sector: sector || undefined, website: website || undefined },
          accessToken ?? undefined,
        );
      }
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Unable to save this company.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={isEditing ? "Edit Company" : "New Company"}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="company-name">Name</Label>
          <Input id="company-name" required value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="company-sector">Sector</Label>
          <Input id="company-sector" value={sector} onChange={(e) => setSector(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="company-website">Website</Label>
          <Input
            id="company-website"
            type="url"
            placeholder="https://…"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
          />
        </div>

        {error && <p className="text-sm text-(--color-danger)">{error}</p>}

        <div className="flex justify-end gap-3 border-t border-(--color-border) pt-4">
          <Button type="button" variant="ghost" onClick={handleClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={isSubmitting}>
            {isSubmitting ? "Saving…" : isEditing ? "Save changes" : "Create Company"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
