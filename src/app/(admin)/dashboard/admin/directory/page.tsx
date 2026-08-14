"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { UserCog, Users } from "lucide-react";
import { useAuth } from "@/modules/auth/client";
import { apiClient, ApiError } from "@/lib/api-client";
import type { DirectoryEntry, DirectoryRole } from "@/modules/administration";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge, type BadgeVariant } from "@/components/ui/badge";
import { StatPanel } from "@/components/ui/stat-panel";
import { CardTitle } from "@/components/ui/typography";
import { EmptyState } from "@/components/empty-state";
import { Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow } from "@/components/ui/table";

const ROLE_LABELS: Record<DirectoryRole, string> = {
  SECRETARY: "Technical Secretary",
  COORDINATOR: "Coordinator",
  STUDENT: "Student",
  RECRUITER: "Recruiter",
};

const ROLE_BADGE_VARIANTS: Record<DirectoryRole, BadgeVariant> = {
  SECRETARY: "neutral",
  COORDINATOR: "approved",
  STUDENT: "active",
  RECRUITER: "pending",
};

/** Deep-links to that role's own management page — the Directory's job is finding, not acting, per the approved plan. Secretary rows have no management page (no self-service admin UI exists) and render as plain text. */
function managementHref(entry: DirectoryEntry): string | null {
  switch (entry.role) {
    case "STUDENT":
      return `/dashboard/students/${entry.profileId}`;
    case "COORDINATOR":
      return `/dashboard/admin/coordinators/${entry.profileId}`;
    case "RECRUITER":
      return `/dashboard/admin/recruiters/${entry.profileId}`;
    case "SECRETARY":
      return null;
  }
}

/**
 * Module 7 of the V3.0 Administration Platform — User Directory, merged
 * with Role Management (see the approved plan's documented decision: both
 * spec bullets describe a near-identical read-only cross-role view). Never
 * a mutation surface: every row's action deep-links to that role's own
 * management page rather than duplicating create/edit/disable UI here.
 */
export default function DirectoryPage() {
  const { accessToken } = useAuth();

  const [entries, setEntries] = useState<DirectoryEntry[]>([]);
  const [query, setQuery] = useState("");
  const [role, setRole] = useState<DirectoryRole | "">("");
  const [includeInactive, setIncludeInactive] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!accessToken) return;
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (query) params.set("query", query);
      if (role) params.set("role", role);
      if (includeInactive) params.set("includeInactive", "true");
      const results = await apiClient.get<DirectoryEntry[]>(
        `/api/administration/directory?${params.toString()}`,
        accessToken,
      );
      setEntries(results);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Unable to load the directory.");
    } finally {
      setIsLoading(false);
    }
  }, [accessToken, query, role, includeInactive]);

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

  const activeCount = entries.filter((e) => e.isActive).length;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold text-(--color-text-primary)">
          User Directory
        </h1>
        <p className="mt-1 text-sm text-(--color-text-secondary)">
          Search across every account and role. To make changes, open that account&apos;s own management page.
        </p>
      </div>

      {!isLoading && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <StatPanel compact icon={Users} label="Total Accounts" value={entries.length} scope="Matching current filters" />
          <StatPanel compact icon={UserCog} label="Active" value={activeCount} scope="Currently enabled" />
        </div>
      )}

      <Card>
        <form onSubmit={handleSearchSubmit} className="flex flex-wrap items-end gap-4">
          <div className="min-w-48 flex-1">
            <Label htmlFor="search-query">Name, email, or roll number</Label>
            <Input id="search-query" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search" />
          </div>
          <div className="min-w-40">
            <Label htmlFor="search-role">Role</Label>
            <Select id="search-role" value={role} onChange={(e) => setRole(e.target.value as DirectoryRole | "")}>
              <option value="">All roles</option>
              {Object.entries(ROLE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
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
      {isLoading && <p className="text-sm text-(--color-text-secondary)">Loading directory…</p>}

      {!isLoading && entries.length === 0 && (
        <Card>
          <EmptyState icon={Users} message="No accounts match the current filters." />
        </Card>
      )}

      {!isLoading && entries.length > 0 && (
        <>
          {/* Desktop / tablet: data-dense table. */}
          <div className="hidden lg:block">
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeaderCell>Name</TableHeaderCell>
                  <TableHeaderCell>Email</TableHeaderCell>
                  <TableHeaderCell>Role</TableHeaderCell>
                  <TableHeaderCell>Batch / Company</TableHeaderCell>
                  <TableHeaderCell>Status</TableHeaderCell>
                  <TableHeaderCell>Last Login</TableHeaderCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {entries.map((entry) => {
                  const href = managementHref(entry);
                  return (
                    <TableRow key={entry.userId}>
                      <TableCell>
                        {href ? (
                          <Link href={href} className="text-(--color-accent) hover:underline">
                            {entry.fullName}
                          </Link>
                        ) : (
                          entry.fullName
                        )}
                      </TableCell>
                      <TableCell>{entry.email}</TableCell>
                      <TableCell>
                        <Badge variant={ROLE_BADGE_VARIANTS[entry.role]}>{ROLE_LABELS[entry.role]}</Badge>
                      </TableCell>
                      <TableCell>{entry.batchName ?? entry.companyName ?? "—"}</TableCell>
                      <TableCell>
                        <Badge variant={entry.isActive ? "active" : "archived"}>
                          {entry.isActive ? "Active" : "Disabled"}
                        </Badge>
                      </TableCell>
                      <TableCell>{entry.lastLoginAt ? new Date(entry.lastLoginAt).toLocaleString() : "Never"}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {/* Narrow viewports: one card per account, more scannable than a horizontally-scrolled table. */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:hidden">
            {entries.map((entry) => {
              const href = managementHref(entry);
              return (
                <Card key={entry.userId} className="transition-shadow duration-150 hover:shadow-md">
                  <div className="flex items-start justify-between gap-2">
                    {href ? (
                      <Link href={href}>
                        <CardTitle className="text-(--color-accent)">{entry.fullName}</CardTitle>
                      </Link>
                    ) : (
                      <CardTitle>{entry.fullName}</CardTitle>
                    )}
                    <Badge variant={entry.isActive ? "active" : "archived"}>
                      {entry.isActive ? "Active" : "Disabled"}
                    </Badge>
                  </div>
                  <p className="mt-2 text-xs text-(--color-text-secondary)">{entry.email}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    <Badge variant={ROLE_BADGE_VARIANTS[entry.role]}>{ROLE_LABELS[entry.role]}</Badge>
                    {(entry.batchName ?? entry.companyName) && (
                      <span className="text-xs text-(--color-text-secondary)">
                        {entry.batchName ?? entry.companyName}
                      </span>
                    )}
                  </div>
                  <p className="mt-2 text-xs text-(--color-text-secondary)">
                    Last login: {entry.lastLoginAt ? new Date(entry.lastLoginAt).toLocaleString() : "Never"}
                  </p>
                </Card>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
