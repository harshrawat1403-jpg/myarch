"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { useAuth } from "@/modules/auth/client";
import { apiClient, ApiError } from "@/lib/api-client";
import type { RecruiterDashboardStats, RecruiterStudentProfileDTO } from "@/modules/recruiters";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { TitleBlock } from "@/components/title-block";

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

export default function RecruiterPortalPage() {
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

  const batchOptions = useMemo(() => {
    const byId = new Map<string, string>();
    for (const student of students) byId.set(student.batchId, student.batchName);
    return [...byId.entries()];
  }, [students]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void runSearch(filters);
  }

  return (
    <div className="space-y-8">
      <div>
        <p className="font-[family-name:var(--font-data)] text-xs uppercase tracking-wide text-[--color-text-secondary]">
          Welcome
        </p>
        <h1 className="font-[family-name:var(--font-display)] text-2xl text-[--color-text-primary]">
          Architecture &amp; Planning Talent Directory
        </h1>
        <p className="mt-1 text-sm text-[--color-text-secondary]">
          Browse approved student portfolios from the Department of Architecture &amp; Planning, VNIT Nagpur.
        </p>
      </div>

      {stats && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatTile project="Available Students" value={stats.totalAvailableStudents} />
          <StatTile project="Graduation Batches" value={stats.graduationBatchesAvailable} />
          <StatTile project="Skills Represented" value={stats.skillsRepresented} />
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="space-y-4 rounded-lg border border-[--color-text-secondary]/20 bg-[--color-surface] p-5"
      >
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
            <label className="flex items-center gap-2 text-sm text-[--color-text-secondary]">
              <input
                type="checkbox"
                checked={filters.hasInternshipExperience}
                onChange={(e) => setFilters((f) => ({ ...f, hasInternshipExperience: e.target.checked }))}
              />
              Has internship experience
            </label>
            <label className="flex items-center gap-2 text-sm text-[--color-text-secondary]">
              <input
                type="checkbox"
                checked={filters.hasCertification}
                onChange={(e) => setFilters((f) => ({ ...f, hasCertification: e.target.checked }))}
              />
              Has certification
            </label>
          </div>
        </div>

        <Button type="submit" variant="primary">
          Search
        </Button>
      </form>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {isLoading && <p className="text-sm text-[--color-text-secondary]">Loading…</p>}
        {!isLoading && students.length === 0 && (
          <p className="text-sm text-[--color-text-secondary]">No matching students found.</p>
        )}
        {!isLoading &&
          students.map((student) => (
            <Link
              key={student.studentId}
              href={`/recruiter/students/${student.studentId}`}
              className="rounded-lg border border-[--color-text-secondary]/20 bg-[--color-surface] p-5 transition-colors hover:border-[--color-accent]"
            >
              <h2 className="font-[family-name:var(--font-display)] text-lg text-[--color-text-primary]">
                {student.fullName}
              </h2>
              <p className="text-sm text-[--color-text-secondary]">{student.batchName}</p>
              {student.bio && <p className="mt-2 line-clamp-2 text-sm text-[--color-text-primary]">{student.bio}</p>}
              <div className="mt-3 flex flex-wrap gap-1">
                {student.skills.slice(0, 4).map((skill) => (
                  <Badge key={skill} variant="neutral">
                    {skill}
                  </Badge>
                ))}
              </div>
              <p className="mt-2 font-[family-name:var(--font-data)] text-xs text-[--color-text-secondary]">
                {student.software.join(", ") || "No software listed"}
              </p>
              <p className="mt-1 text-xs text-[--color-text-secondary]">
                {student.hasResume ? "Resume available" : "No resume available"}
                {student.portfolioLinks.length > 0 ? " · Portfolio linked" : ""}
              </p>
              <TitleBlock
                project={student.fullName}
                scale={student.batchName}
                date={new Date()}
                drawnBy="Approved Profile"
              />
            </Link>
          ))}
      </div>
    </div>
  );
}

function StatTile({ project, value }: { project: string; value: number }) {
  return (
    <div className="rounded-lg border border-[--color-text-secondary]/20 bg-[--color-surface] p-5">
      <p className="font-[family-name:var(--font-data)] text-3xl text-[--color-text-primary]">{value}</p>
      <TitleBlock project={project} scale="All available students" date={new Date()} drawnBy="System" />
    </div>
  );
}
