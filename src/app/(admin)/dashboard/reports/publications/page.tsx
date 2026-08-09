"use client";

import { useEffect, useState } from "react";
import { BookOpen } from "lucide-react";
import { useAuth } from "@/modules/auth/client";
import { apiClient, ApiError } from "@/lib/api-client";
import type { PublicationsUsageReport } from "@/modules/reports";
import { Card } from "@/components/ui/card";
import { Table, TableHead, TableRow, TableHeaderCell, TableCell, TableBody } from "@/components/ui/table";
import { DataLabel, PageTitle } from "@/components/ui/typography";
import { EmptyState } from "@/components/empty-state";
import { MetricGrid, MetricTile } from "@/components/reports/metric-tile";
import { ReportExportButtons } from "@/components/reports/report-export-buttons";

/** V4.0 E7 (PRD §16 — "New report types: ... Publications usage"). Secretary/Coordinator, full/unscoped. */
export default function PublicationsUsageReportPage() {
  const { accessToken } = useAuth();
  const [report, setReport] = useState<PublicationsUsageReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadReport(cancelledRef: { current: boolean }) {
    if (!accessToken) return;
    setIsLoading(true);
    setError(null);
    try {
      const result = await apiClient.get<PublicationsUsageReport>("/api/reports/publications-usage", accessToken);
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
  }, [accessToken]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <DataLabel>Reports</DataLabel>
          <PageTitle className="mt-1">Publications Usage Report</PageTitle>
        </div>
        <ReportExportButtons path="/api/reports/publications-usage" formats={["csv", "xlsx", "pptx"]} fallbackPrefix="publications-usage-report" />
      </div>

      {error && <p className="text-sm text-(--color-danger)">{error}</p>}
      {isLoading && <p className="text-sm text-(--color-text-secondary)">Loading report…</p>}

      {!isLoading && !error && report && (
        <>
          <Card className="space-y-4">
            <DataLabel>Summary</DataLabel>
            <MetricGrid>
              <MetricTile label="Total Publications" value={report.totalPublications} />
            </MetricGrid>
          </Card>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card className="space-y-3">
              <DataLabel>By Status</DataLabel>
              {report.byStatus.length === 0 ? (
                <EmptyState icon={BookOpen} message="No publications yet." />
              ) : (
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableHeaderCell>Status</TableHeaderCell>
                      <TableHeaderCell>Count</TableHeaderCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {report.byStatus.map((s) => (
                      <TableRow key={s.status}>
                        <TableCell>{s.status}</TableCell>
                        <TableCell>{s.count}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </Card>

            <Card className="space-y-3">
              <DataLabel>By Type</DataLabel>
              {report.byType.length === 0 ? (
                <EmptyState icon={BookOpen} message="No publications yet." />
              ) : (
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableHeaderCell>Type</TableHeaderCell>
                      <TableHeaderCell>Count</TableHeaderCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {report.byType.map((t) => (
                      <TableRow key={t.type}>
                        <TableCell>{t.type}</TableCell>
                        <TableCell>{t.count}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </Card>
          </div>

          <Card className="space-y-3">
            <DataLabel>Exports Generated (by format)</DataLabel>
            {report.exportsByFormat.length === 0 ? (
              <EmptyState icon={BookOpen} message="No exports have been generated yet." />
            ) : (
              <Table>
                <TableHead>
                  <TableRow>
                    <TableHeaderCell>Format</TableHeaderCell>
                    <TableHeaderCell>Count</TableHeaderCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {report.exportsByFormat.map((e) => (
                    <TableRow key={e.format}>
                      <TableCell>{e.format}</TableCell>
                      <TableCell>{e.count}</TableCell>
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
