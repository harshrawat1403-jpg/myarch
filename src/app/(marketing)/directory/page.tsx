"use client";

import Link from "next/link";
import Image from "next/image";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { Users } from "lucide-react";
import type { PublicDirectoryProfile } from "@/modules/public-directory";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { CardTitle, DataLabel, PageTitle } from "@/components/ui/typography";
import { PageContainer } from "@/components/public/page-container";
import { Section } from "@/components/public/section";
import { EmptyState } from "@/components/empty-state";

interface Filters {
  query: string;
  batchId: string;
  skills: string;
  software: string;
}

const EMPTY_FILTERS: Filters = { query: "", batchId: "", skills: "", software: "" };

function buildQuery(filters: Filters): string {
  const params = new URLSearchParams();
  if (filters.query) params.set("query", filters.query);
  if (filters.batchId) params.set("batchId", filters.batchId);
  if (filters.skills) params.set("skills", filters.skills);
  if (filters.software) params.set("software", filters.software);
  return params.toString();
}

/**
 * V4.0 B5 — `/directory`, the public, unauthenticated student directory
 * (§7 step 1). Structurally the same card-grid pattern the authenticated
 * recruiter directory (`/recruiter`) already uses, reduced to what a public
 * visitor is allowed to see: no internship/certification keyword filters
 * (those read StudentPublicProfile JSON fields the public DTO doesn't
 * expose search filters for), and every result is already guaranteed
 * public-safe by the repository (see PrismaPublicDirectoryRepository's doc
 * comment) — this page never applies its own visibility filtering.
 */
export default function PublicDirectoryPage() {
  const [students, setStudents] = useState<PublicDirectoryProfile[]>([]);
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const runSearch = useCallback(async (nextFilters: Filters) => {
    setIsLoading(true);
    setError(null);
    try {
      const q = buildQuery(nextFilters);
      const res = await fetch(`/api/public/directory${q ? `?${q}` : ""}`);
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error?.message ?? "Unable to load the directory.");
      setStudents(body.data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load the directory.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void runSearch(EMPTY_FILTERS);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const batchOptions = useMemo(() => {
    const byId = new Map<string, string>();
    for (const student of students) byId.set(student.batchId, student.batchName);
    return [...byId.entries()];
  }, [students]);

  const hasActiveFilters = Object.values(filters).some(Boolean);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void runSearch(filters);
  }

  function handleReset() {
    setFilters(EMPTY_FILTERS);
    void runSearch(EMPTY_FILTERS);
  }

  return (
    <>
      <section className="bg-(--color-surface)">
        <PageContainer className="py-16 text-center lg:py-20">
          <DataLabel className="text-center text-(--color-accent)">Student Directory</DataLabel>
          <PageTitle className="mx-auto mt-5 max-w-2xl text-balance text-4xl leading-[1.05] lg:text-5xl">
            Meet our students
          </PageTitle>
          <p className="mx-auto mt-6 max-w-xl text-base text-(--color-text-secondary) lg:text-lg">
            Browse approved student portfolios from the VNIT Nagpur Department of Architecture &amp; Planning.
          </p>
        </PageContainer>
      </section>

      <Section className="border-t border-(--color-border)">
        <div className="space-y-8">
          <Card>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="query">Search</Label>
                <Input
                  id="query"
                  placeholder="Search by name, skill, or software"
                  value={filters.query}
                  onChange={(e) => setFilters((f) => ({ ...f, query: e.target.value }))}
                />
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <Label htmlFor="batchId">Batch</Label>
                  <Select id="batchId" value={filters.batchId} onChange={(e) => setFilters((f) => ({ ...f, batchId: e.target.value }))}>
                    <option value="">All batches</option>
                    {batchOptions.map(([id, name]) => (
                      <option key={id} value={id}>
                        {name}
                      </option>
                    ))}
                  </Select>
                </div>
                <div>
                  <Label htmlFor="skills">Skills</Label>
                  <Input
                    id="skills"
                    placeholder="Rendering, Modeling"
                    value={filters.skills}
                    onChange={(e) => setFilters((f) => ({ ...f, skills: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="software">Software</Label>
                  <Input
                    id="software"
                    placeholder="Rhino, Revit"
                    value={filters.software}
                    onChange={(e) => setFilters((f) => ({ ...f, software: e.target.value }))}
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
          {isLoading && <p className="text-sm text-(--color-text-secondary)">Loading directory…</p>}

          {!isLoading && students.length === 0 && (
            <Card>
              <EmptyState
                icon={Users}
                message={hasActiveFilters ? "No students match the current filters." : "No students are available yet."}
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
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {students.map((student) => (
                <Link key={student.studentId} href={`/directory/${student.studentId}`} className="block">
                  <Card className="h-full transition-[border-color,box-shadow] duration-150 hover:border-(--color-accent) hover:shadow-md">
                    <div className="flex items-center gap-3">
                      <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-(--color-accent-soft) text-lg font-semibold text-(--color-accent)">
                        {student.profilePhotoUrl ? (
                          <Image src={student.profilePhotoUrl} alt="" width={48} height={48} className="h-full w-full object-cover" unoptimized />
                        ) : (
                          student.fullName.charAt(0).toUpperCase()
                        )}
                      </span>
                      <div>
                        <CardTitle>{student.fullName}</CardTitle>
                        <p className="text-sm text-(--color-text-secondary)">{student.batchName}</p>
                      </div>
                    </div>
                    {student.bio && <p className="mt-3 line-clamp-2 text-sm text-(--color-text-primary)">{student.bio}</p>}
                    <div className="mt-3 flex flex-wrap gap-1">
                      {student.skills.slice(0, 4).map((skill) => (
                        <Badge key={skill} variant="neutral">
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      </Section>
    </>
  );
}
