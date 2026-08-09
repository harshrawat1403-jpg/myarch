"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Plus, BookOpen } from "lucide-react";
import { useAuth } from "@/modules/auth/client";
import { apiClient, ApiError } from "@/lib/api-client";
import { useToast } from "@/components/ui/toast";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import type { PublicationSummaryDTO, PublicationStatus } from "@/modules/publications";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge, type BadgeVariant } from "@/components/ui/badge";
import { DataLabel } from "@/components/ui/typography";
import { EmptyState } from "@/components/empty-state";

function statusBadgeVariant(status: PublicationStatus): BadgeVariant {
  if (status === "PUBLISHED") return "approved";
  if (status === "ARCHIVED") return "archived";
  return "neutral";
}

/**
 * V4.0 E4 (§13) — Publication Studio's own list/dashboard. Full access for
 * Secretary and both Coordinator positions, identical (§9, §13's own
 * opening line) — no role-gated actions anywhere on this page.
 */
export default function PublicationsListPage() {
  const { accessToken } = useAuth();
  const toast = useToast();

  const [publications, setPublications] = useState<PublicationSummaryDTO[]>([]);
  const [statusFilter, setStatusFilter] = useState<PublicationStatus | "">("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PublicationSummaryDTO | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  async function load() {
    if (!accessToken) return;
    setIsLoading(true);
    setError(null);
    try {
      const query = statusFilter ? `?status=${statusFilter}` : "";
      const result = await apiClient.get<PublicationSummaryDTO[]>(`/api/publications${query}`, accessToken);
      setPublications(result);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Unable to load publications.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken, statusFilter]);

  async function handleDelete() {
    if (!accessToken || !deleteTarget) return;
    setIsDeleting(true);
    try {
      await apiClient.delete(`/api/publications/${deleteTarget.id}`, accessToken);
      toast.success("Publication deleted.");
      setDeleteTarget(null);
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Unable to delete this publication.");
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <DataLabel>Publication Studio</DataLabel>
          <h1 className="mt-1 font-[family-name:var(--font-display)] text-2xl font-semibold text-(--color-text-primary)">
            Publications
          </h1>
        </div>
        <Link href="/dashboard/publications/new">
          <Button type="button" variant="primary">
            <Plus aria-hidden="true" size={16} strokeWidth={2} />
            New Publication
          </Button>
        </Link>
      </div>

      <div className="flex flex-wrap gap-2">
        {(["", "DRAFT", "PUBLISHED", "ARCHIVED"] as const).map((status) => (
          <button
            key={status || "all"}
            type="button"
            onClick={() => setStatusFilter(status)}
            className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors duration-150 ${
              statusFilter === status
                ? "border-(--color-accent) bg-(--color-accent-soft) text-(--color-accent)"
                : "border-(--color-border) text-(--color-text-secondary) hover:border-(--color-accent)"
            }`}
          >
            {status || "All"}
          </button>
        ))}
      </div>

      {error && <p className="text-sm text-(--color-danger)">{error}</p>}
      {isLoading && <p className="text-sm text-(--color-text-secondary)">Loading…</p>}

      {!isLoading && publications.length === 0 && (
        <Card>
          <EmptyState icon={BookOpen} message="No publications yet — create one from a template to get started." />
        </Card>
      )}

      {!isLoading && publications.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {publications.map((pub) => (
            <Card key={pub.id} className="space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <Link href={`/dashboard/publications/${pub.id}`} className="font-medium text-(--color-text-primary) hover:text-(--color-accent)">
                    {pub.title}
                  </Link>
                  <p className="mt-0.5 text-xs text-(--color-text-secondary)">{pub.templateName ?? pub.type}</p>
                </div>
                <Badge variant={statusBadgeVariant(pub.status)}>{pub.status}</Badge>
              </div>
              <p className="text-xs text-(--color-text-secondary)">
                Last edited {new Date(pub.lastEditedAt).toISOString().slice(0, 10)}
              </p>
              <div className="flex gap-2 border-t border-(--color-border) pt-3">
                <Link href={`/dashboard/publications/${pub.id}`} className="flex-1">
                  <Button type="button" variant="secondary" className="w-full">
                    Open
                  </Button>
                </Link>
                <Button type="button" variant="ghost" onClick={() => setDeleteTarget(pub)}>
                  Delete
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {deleteTarget && (
        <ConfirmDialog
          isOpen={deleteTarget !== null}
          onClose={() => setDeleteTarget(null)}
          onConfirm={handleDelete}
          title="Delete this publication?"
          description={`"${deleteTarget.title}" and its version history will be permanently deleted. This cannot be undone.`}
          confirmLabel="Delete"
          isConfirming={isDeleting}
          variant="destructive"
        />
      )}
    </div>
  );
}
