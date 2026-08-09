"use client";

import { useEffect, useState } from "react";
import { GraduationCap } from "lucide-react";
import { useAuth } from "@/modules/auth/client";
import { apiClient, ApiError } from "@/lib/api-client";
import type { AlumniReport } from "@/modules/reports";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableHead, TableRow, TableHeaderCell, TableCell, TableBody } from "@/components/ui/table";
import { DataLabel, PageTitle } from "@/components/ui/typography";
import { EmptyState } from "@/components/empty-state";
import { MetricGrid, MetricTile } from "@/components/reports/metric-tile";
import { ReportExportButtons } from "@/components/reports/report-export-buttons";

/** V4.0 E7 (PRD §16 — "New report types: ... Alumni"). Secretary/Coordinator, full/unscoped. */
export default function AlumniReportPage() {
  const { accessToken } = useAuth();
  const [mentorshipOnly, setMentorshipOnly] = useState(false);
  const [report, setReport] = useState<AlumniReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadReport(cancelledRef: { current: boolean }) {
    if (!accessToken) return;
    setIsLoading(true);
    setError(null);
    const params = new URLSearchParams();
    if (mentorshipOnly) params.set("mentorshipAvailableOnly", "true");

    try {
      const result = await apiClient.get<AlumniReport>(`/api/reports/alumni?${params.toString()}`, accessToken);
      if (!cancelledRef.current) setReport(result);
    } catch (err) {
      if (!cancelledRef.current) setError(err instanceof ApiError ? err.message : "Unable to load this report.");
    } finally {
      if (!cancelledRef.current) setIsLoading(false);
    }
  }

  useEffect(() => {
    const cancelledRef = { current: false };
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadReport(cancelledRef);
    return () => {
      cancelledRef.current = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken, mentorshipOnly]);

  const exportPath = `/api/reports/alumni${mentorshipOnly ? "?mentorshipAvailableOnly=true" : ""}`;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <DataLabel>Reports</DataLabel>
          <PageTitle className="mt-1">Alumni Report</PageTitle>
        </div>
        <ReportExportButtons path={exportPath} formats={["csv", "xlsx", "pptx"]} fallbackPrefix="alumni-report" />
      </div>

      <Card>
        <Checkbox label="Available for mentorship only" checked={mentorshipOnly} onChange={(e) => setMentorshipOnly(e.target.checked)} />
      </Card>

      {error && <p className="text-sm text-(--color-danger)">{error}</p>}
      {isLoading && <p className="text-sm text-(--color-text-secondary)">Loading report…</p>}

      {!isLoading && !error && report && (
        <>
          <Card className="space-y-4">
            <DataLabel>Summary</DataLabel>
            <MetricGrid>
              <MetricTile label="Total Alumni" value={report.totalAlumni} />
              <MetricTile label="Available for Mentorship" value={report.mentorshipAvailableCount} />
            </MetricGrid>
          </Card>

          <Card className="space-y-3">
            <DataLabel>By Graduation Year</DataLabel>
            {report.byGraduationYear.length === 0 ? (
              <EmptyState icon={GraduationCap} message="No alumni records match this filter." />
            ) : (
              <Table>
                <TableHead>
                  <TableRow>
                    <TableHeaderCell>Graduation Year</TableHeaderCell>
                    <TableHeaderCell>Alumni Count</TableHeaderCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {report.byGraduationYear.map((r) => (
                    <TableRow key={r.graduationYear}>
                      <TableCell>{r.graduationYear}</TableCell>
                      <TableCell>{r.count}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
