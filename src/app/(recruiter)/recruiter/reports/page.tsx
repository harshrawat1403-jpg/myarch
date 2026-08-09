"use client";

import { useEffect, useState } from "react";
import { Mail } from "lucide-react";
import { useAuth } from "@/modules/auth/client";
import { apiClient, ApiError } from "@/lib/api-client";
import type { MyRecruitingActivityReport } from "@/modules/reports";
import { Card } from "@/components/ui/card";
import { Badge, type BadgeVariant } from "@/components/ui/badge";
import { Table, TableHead, TableRow, TableHeaderCell, TableCell, TableBody } from "@/components/ui/table";
import { DataLabel, PageTitle } from "@/components/ui/typography";
import { EmptyState } from "@/components/empty-state";
import { MetricGrid, MetricTile } from "@/components/reports/metric-tile";
import { ReportExportButtons } from "@/components/reports/report-export-buttons";

function statusBadgeVariant(status: string): BadgeVariant {
  if (status === "ACCEPTED" || status === "COMPLETED") return "approved";
  if (status === "DECLINED") return "rejected";
  return "pending";
}

/** V4.0 E7 (PRD §4 — Recruiter Reports: "Own data only") — the recruiter's own saved/shortlisted/interest activity, reusing the exact same data the /recruiter dashboard already shows, as a report with export. */
export default function MyRecruitingActivityReportPage() {
  const { accessToken } = useAuth();
  const [report, setReport] = useState<MyRecruitingActivityReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadReport(cancelledRef: { current: boolean }) {
    if (!accessToken) return;
    setIsLoading(true);
    setError(null);
    try {
      const result = await apiClient.get<MyRecruitingActivityReport>("/api/reports/my-recruiting-activity", accessToken);
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
          <PageTitle className="mt-1">My Recruiting Activity</PageTitle>
          <p className="mt-1 text-sm text-(--color-text-secondary)">Your own saved students, shortlist, and interest history — never another recruiter&apos;s activity.</p>
        </div>
        <ReportExportButtons path="/api/reports/my-recruiting-activity" formats={["csv", "xlsx"]} fallbackPrefix="my-recruiting-activity" />
      </div>

      {error && <p className="text-sm text-(--color-danger)">{error}</p>}
      {isLoading && <p className="text-sm text-(--color-text-secondary)">Loading report…</p>}

      {!isLoading && !error && report && (
        <>
          <Card className="space-y-4">
            <DataLabel>Summary</DataLabel>
            <MetricGrid>
              <MetricTile label="Saved" value={report.savedCount} />
              <MetricTile label="Shortlisted" value={report.shortlistedCount} />
              <MetricTile label="Interests Sent" value={report.interestsSentCount} />
              <MetricTile label="Accepted" value={report.interestsAcceptedCount} />
              <MetricTile label="Declined" value={report.interestsDeclinedCount} />
              <MetricTile label="Pending" value={report.interestsPendingCount} />
            </MetricGrid>
          </Card>

          <Card className="space-y-3">
            <DataLabel>Interests Sent</DataLabel>
            {report.interests.length === 0 ? (
              <EmptyState icon={Mail} message="You haven't expressed interest in any students yet." />
            ) : (
              <Table>
                <TableHead>
                  <TableRow>
                    <TableHeaderCell>Student</TableHeaderCell>
                    <TableHeaderCell>Status</TableHeaderCell>
                    <TableHeaderCell>Sent On</TableHeaderCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {report.interests.map((i, index) => (
                    // No stable id in this DTO (studentName/sentAt aren't guaranteed unique) — the list is read-only and never reordered client-side, so an index-suffixed key is safe here.
                    <TableRow key={`${i.studentName}-${i.sentAt.toString()}-${index}`}>
                      <TableCell>{i.studentName}</TableCell>
                      <TableCell>
                        <Badge variant={statusBadgeVariant(i.status)}>{i.status}</Badge>
                      </TableCell>
                      <TableCell>{new Date(i.sentAt).toLocaleDateString()}</TableCell>
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
