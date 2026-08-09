"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { Layers, Sparkles, Users } from "lucide-react";
import { useAuth } from "@/modules/auth/client";
import { apiClient, ApiError } from "@/lib/api-client";
import type { RecruiterDashboardStats, RecruiterStudentProfileDTO } from "@/modules/recruiters";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { CardTitle, DataLabel } from "@/components/ui/typography";
import { StatPanel } from "@/components/ui/stat-panel";
import { EmptyState } from "@/components/empty-state";
import { ExpressInterestControl, SaveShortlistButtons } from "@/components/recruiter/save-shortlist-buttons";

interface Filters {
  query: string;
  batchId: string;
  skills: string;
  software: string;
  internshipKeyword: string;
  certificationKeyword: string;
  hasInternshipExperience: boolean;
  hasCertification: boolean;
}

const EMPTY_FILTERS: Filters = {
  query: "",
  batchId: "",
  skills: "",
  software: "",
  internshipKeyword: "",
  certificationKeyword: "",
  hasInternshipExperience: false,
  hasCertification: false,
};

function buildQuery(filters: Filters): string {
  const params = new URLSearchParams();
  if (filters.query) params.set("query", filters.query);
  if (filters.batchId) params.set("batchId", filters.batchId);
  if (filters.skills) params.set("skills", filters.skills);
  if (filters.software) params.set("software", filters.software);
  if (filters.internshipKeyword) params.set("internshipKeyword", filters.internshipKeyword);
  if (filters.certificationKeyword) params.set("certificationKeyword", filters.certificationKeyword);
  if (filters.hasInternshipExperience) params.set("hasInternshipExperience", "true");
  if (filters.hasCertification) params.set("hasCertification", "true");
  return params.toString();
}

/**
 * V4.0 C4 — moved here from /recruiter (Q2, PRD §2/§3/§17): /recruiter is
 * now the dashboard, and this search/filter card grid is the dedicated
 * directory page. Every fetch call, the exact query-string built from
 * filters, and the directory endpoint itself are unchanged from before
 * (confirmed by the pre-existing test suite, renamed to
 * recruiter-directory-page.test.tsx and importing from this new path,
 * passing unmodified).
 */
export default function RecruiterDirectoryPage() {
  const { accessToken } = useAuth();
  const [stats, setStats] = useState<RecruiterDashboardStats | null>(null);
  const [students, setStudents] = useState<RecruiterStudentProfileDTO[]>([]);
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const runSearch = useCallback(
    async (nextFilters: Filters) => {
      if (!accessToken) return;
      setIsLoading(true);
      setError(null);
      try {
        const q = buildQuery(nextFilters);
        const results = await apiClient.get<RecruiterStudentProfileDTO[]>(
          `/api/recruiters/students${q ? `?${q}` : ""}`,
          accessToken,
        );
        setStudents(results);
      } catch (err) {
        setError(err instanceof ApiError ? err.message : "Unable to load the student directory.");
      } finally {
        setIsLoading(false);
      }
    },
    [accessToken],
  );

  useEffect(() => {
    if (!accessToken) return;
    apiClient
      .get<RecruiterDashboardStats>("/api/recruiters/dashboard", accessToken)
      .then(setStats)
      .catch(() => {});
    // load() equivalent — runSearch only sets state after its own awaited
    // fetch resolves (see docs/planning's Day 7 CHANGELOG entry for the
    // same justified pattern).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    runSearch(EMPTY_FILTERS).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken]);

  function handleInteractionChange(studentId: string, next: { isSaved: boolean; isShortlisted: boolean }) {
    setStudents((current) => current.map((s) => (s.studentId === studentId ? { ...s, ...next } : s)));
  }

  function handleInterestChange(studentId: string, interestStatus: RecruiterStudentProfileDTO["interestStatus"]) {
    setStudents((current) => current.map((s) => (s.studentId === studentId ? { ...s, interestStatus } : s)));
  }

  const batchOptions = useMemo(() => {
    const byId = new Map<string, string>();
    for (const student of students) byId.set(student.batchId, student.batchName);
    return [...byId.entries()];
  }, [students]);

  const hasActiveFilters = Object.entries(filters).some(([key, value]) =>
    key === "hasInternshipExperience" || key === "hasCertification" ? value === true : Boolean(value),
  );

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void runSearch(filters);
  }

  function handleReset() {
    setFilters(EMPTY_FILTERS);
    void runSearch(EMPTY_FILTERS);
  }

  return (
    <div className="space-y-8">
      <div>
        <DataLabel>Student Directory</DataLabel>
        <h1 className="mt-1 font-[family-name:var(--font-display)] text-2xl font-semibold text-(--color-text-primary)">
          Architecture &amp; Planning Talent Directory
        </h1>
        <p className="mt-1 text-sm text-(--color-text-secondary)">Approved student portfolios, VNIT Nagpur.</p>
      </div>

      {stats && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatPanel compact icon={Users} label="Available Students" value={stats.totalAvailableStudents} scope="All available students" />
          <StatPanel compact icon={Layers} label="Graduation Batches" value={stats.graduationBatchesAvailable} scope="All available students" />
          <StatPanel compact icon={Sparkles} label="Skills Represented" value={stats.skillsRepresented} scope="All available students" />
        </div>
      )}

      <Card>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="query">Search</Label>
            <Input
              id="query"
              placeholder="Search by name, skill, software, certification, or internship"
              value={filters.query}
              onChange={(e) => setFilters((f) => ({ ...f, query: e.target.value }))}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <Label htmlFor="batchId">Graduation Batch</Label>
              <Select
                id="batchId"
                value={filters.batchId}
                onChange={(e) => setFilters((f) => ({ ...f, batchId: e.target.value }))}
              >
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
            <div>
              <Label htmlFor="internshipKeyword">Internship keyword</Label>
              <Input
                id="internshipKeyword"
                value={filters.internshipKeyword}
                onChange={(e) => setFilters((f) => ({ ...f, internshipKeyword: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="certificationKeyword">Certification keyword</Label>
              <Input
                id="certificationKeyword"
                value={filters.certificationKeyword}
                onChange={(e) => setFilters((f) => ({ ...f, certificationKeyword: e.target.value }))}
              />
            </div>
            <div className="flex items-end gap-4">
              <Checkbox
                id="hasInternshipExperience"
                checked={filters.hasInternshipExperience}
                onChange={(e) => setFilters((f) => ({ ...f, hasInternshipExperience: e.target.checked }))}
                label="Has internship experience"
              />
              <Checkbox
                id="hasCertification"
                checked={filters.hasCertification}
                onChange={(e) => setFilters((f) => ({ ...f, hasCertification: e.target.checked }))}
                label="Has certification"
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
          <EmptyState icon={Users} message={hasActiveFilters ? "No students match the current filters." : "No matching students found."} />
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
            <Link key={student.studentId} href={`/recruiter/students/${student.studentId}`} className="block">
              <Card className="h-full transition-[border-color,box-shadow] duration-150 hover:border-(--color-accent) hover:shadow-md">
                <CardTitle>{student.fullName}</CardTitle>
                <p className="text-sm text-(--color-text-secondary)">{student.batchName}</p>
                {student.bio && <p className="mt-2 line-clamp-2 text-sm text-(--color-text-primary)">{student.bio}</p>}
                <div className="mt-3 flex flex-wrap gap-1">
                  {student.skills.slice(0, 4).map((skill) => (
                    <Badge key={skill} variant="neutral">
                      {skill}
                    </Badge>
                  ))}
                </div>
                <p className="mt-2 text-xs text-(--color-text-secondary)">{student.software.join(", ") || "No software listed"}</p>
                <div className="mt-3 flex flex-wrap gap-1 border-t border-(--color-border) pt-3">
                  <Badge variant={student.hasResume ? "active" : "neutral"}>
                    {student.hasResume ? "Resume available" : "No resume"}
                  </Badge>
                  {student.portfolioLinks.length > 0 && <Badge variant="active">Portfolio linked</Badge>}
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-(--color-border) pt-3">
                  <SaveShortlistButtons
                    studentId={student.studentId}
                    state={{ isSaved: student.isSaved, isShortlisted: student.isShortlisted }}
                    accessToken={accessToken}
                    onChange={(next) => handleInteractionChange(student.studentId, next)}
                    stopPropagation
                  />
                  <ExpressInterestControl
                    studentId={student.studentId}
                    interestStatus={student.interestStatus}
                    accessToken={accessToken}
                    onChange={(status) => handleInterestChange(student.studentId, status)}
                    stopPropagation
                  />
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
