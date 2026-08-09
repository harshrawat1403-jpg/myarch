"use client";

import { useEffect, useState } from "react";
import { Briefcase } from "lucide-react";
import { useAuth } from "@/modules/auth/client";
import { apiClient, ApiError } from "@/lib/api-client";
import type { MyPlacementActivityReport } from "@/modules/reports";
import { Card } from "@/components/ui/card";
import { Badge, type BadgeVariant } from "@/components/ui/badge";
import { Table, TableHead, TableRow, TableHeaderCell, TableCell, TableBody } from "@/components/ui/table";
import { DataLabel, PageTitle } from "@/components/ui/typography";
import { EmptyState } from "@/components/empty-state";
import { MetricGrid, MetricTile } from "@/components/reports/metric-tile";
import { ReportExportButtons } from "@/components/reports/report-export-buttons";

function statusBadgeVariant(status: string): BadgeVariant {
  if (status === "ACCEPTED" || status === "ACTIVE" || status === "COMPLETED") return "approved";
  if (status === "REJECTED" || status === "WITHDRAWN") return "rejected";
  if (status === "OFFER") return "approved";
  return "pending";
}

/** V4.0 E7 (PRD §4 — Student Reports: "Own data only") — the student's own application/interview/offer summary, reusing the same real Application rows /student/applications shows, presented as a report with export. */
export default function MyPlacementActivityReportPage() {
  const { accessToken } = useAuth();
  const [report, setReport] = useState<MyPlacementActivityReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadReport(cancelledRef: { current: boolean }) {
    if (!accessToken) return;
    setIsLoading(true);
    setError(null);
    try {
      const result = await apiClient.get<MyPlacementActivityReport>("/api/reports/my-placement-activity", accessToken);
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
          <DataLabel>My Reports</DataLabel>
          <PageTitle className="mt-1">My Placement Activity</PageTitle>
          <p className="mt-1 text-sm text-(--color-text-secondary)">Your own applications, interviews, and offers — never another student&apos;s data.</p>
        </div>
        <ReportExportButtons path="/api/reports/my-placement-activity" formats={["csv", "xlsx"]} fallbackPrefix="my-placement-activity" />
      </div>

      {error && <p className="text-sm text-(--color-danger)">{error}</p>}
      {isLoading && <p className="text-sm text-(--color-text-secondary)">Loading report…</p>}

      {!isLoading && !error && report && (
        <>
          <Card className="space-y-4">
            <DataLabel>Summary</DataLabel>
            <MetricGrid>
              <MetricTile label="Total Applications" value={report.totalApplications} />
              <MetricTile label="Interviews Scheduled" value={report.interviewsScheduled} />
              <MetricTile label="Offers Received" value={report.offersReceived} />
              <MetricTile label="Placed" value={report.placed ? "Yes" : "No"} />
            </MetricGrid>
          </Card>

          <Card className="space-y-3">
            <DataLabel>My Applications</DataLabel>
            {report.applications.length === 0 ? (
              <EmptyState icon={Briefcase} message="You haven't applied to any drives yet." />
            ) : (
              <Table>
                <TableHead>
                  <TableRow>
                    <TableHeaderCell>Company</TableHeaderCell>
                    <TableHeaderCell>Drive</TableHeaderCell>
                    <TableHeaderCell>Type</TableHeaderCell>
                    <TableHeaderCell>Status</TableHeaderCell>
                    <TableHeaderCell>Applied On</TableHeaderCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {report.applications.map((a) => (
                    <TableRow key={a.applicationId}>
                      <TableCell>{a.companyName}</TableCell>
                      <TableCell>{a.title}</TableCell>
                      <TableCell>{a.type}</TableCell>
                      <TableCell>
                        <Badge variant={statusBadgeVariant(a.currentStatus)}>{a.currentStatus}</Badge>
                      </TableCell>
                      <TableCell>{new Date(a.appliedAt).toLocaleDateString()}</TableCell>
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
