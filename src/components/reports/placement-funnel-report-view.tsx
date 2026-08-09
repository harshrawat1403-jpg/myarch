"use client";

import { useEffect, useState } from "react";
import { BarChart3 } from "lucide-react";
import { useAuth } from "@/modules/auth/client";
import { apiClient, ApiError } from "@/lib/api-client";
import type { PlacementFunnelReport } from "@/modules/reports";
import type { Batch } from "@/modules/batches";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Table, TableHead, TableRow, TableHeaderCell, TableCell, TableBody } from "@/components/ui/table";
import { DataLabel, PageTitle } from "@/components/ui/typography";
import { EmptyState } from "@/components/empty-state";
import { MetricGrid, MetricTile } from "./metric-tile";
import { ReportExportButtons } from "./report-export-buttons";

export interface PlacementFunnelReportViewProps {
  readonly type: "PLACEMENT" | "INTERNSHIP";
  readonly title: string;
}

/**
 * V4.0 E7 (PRD §16) — shared by /dashboard/reports/placements and
 * /dashboard/reports/internships (one aggregation, one view, `type`
 * selects which — PlacementDrive.type is a variant of one entity, per D1,
 * so the report follows the same shape rather than duplicating a nearly
 * identical page).
 */
export function PlacementFunnelReportView({ type, title }: PlacementFunnelReportViewProps) {
  const { accessToken, role } = useAuth();
  const [batches, setBatches] = useState<Batch[]>([]);
  const [batchId, setBatchId] = useState<string>("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [report, setReport] = useState<PlacementFunnelReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!accessToken) return;
    apiClient
      .get<Batch[]>("/api/batches", accessToken)
      .then(setBatches)
      .catch(() => undefined);
  }, [accessToken]);

  async function loadReport(cancelledRef: { current: boolean }) {
    if (!accessToken) return;
    setIsLoading(true);
    setError(null);
    const params = new URLSearchParams({ type });
    if (batchId) params.set("batchIds", batchId);
    if (dateFrom) params.set("dateFrom", new Date(dateFrom).toISOString());
    if (dateTo) params.set("dateTo", new Date(dateTo).toISOString());

    try {
      const result = await apiClient.get<PlacementFunnelReport>(`/api/reports/placements?${params.toString()}`, accessToken);
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
  }, [accessToken, type, batchId, dateFrom, dateTo]);

  const exportPath = `/api/reports/placements?type=${type}${batchId ? `&batchIds=${batchId}` : ""}${dateFrom ? `&dateFrom=${new Date(dateFrom).toISOString()}` : ""}${dateTo ? `&dateTo=${new Date(dateTo).toISOString()}` : ""}`;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <DataLabel>Reports</DataLabel>
          <PageTitle className="mt-1">{title}</PageTitle>
        </div>
        <ReportExportButtons path={exportPath} formats={["csv", "xlsx", "pptx"]} fallbackPrefix={type === "PLACEMENT" ? "placements-report" : "internships-report"} />
      </div>

      <Card className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <Label htmlFor="batch-filter">Batch</Label>
            <Select id="batch-filter" value={batchId} onChange={(e) => setBatchId(e.target.value)}>
              <option value="">All {role === "COORDINATOR" ? "my " : ""}batches</option>
              {batches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="date-from">Applied from</Label>
            <input
              id="date-from"
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full rounded-md border border-(--color-border) bg-(--color-background) px-3 py-2 text-sm text-(--color-text-primary)"
            />
          </div>
          <div>
            <Label htmlFor="date-to">Applied to</Label>
            <input
              id="date-to"
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full rounded-md border border-(--color-border) bg-(--color-background) px-3 py-2 text-sm text-(--color-text-primary)"
            />
          </div>
        </div>
      </Card>

      {error && <p className="text-sm text-(--color-danger)">{error}</p>}
      {isLoading && <p className="text-sm text-(--color-text-secondary)">Loading report…</p>}

      {!isLoading && !error && report && (
        <>
          <Card className="space-y-4">
            <DataLabel>Application Funnel</DataLabel>
            <MetricGrid>
              <MetricTile label="Applied" value={report.applied} definition="Every application submitted." />
              <MetricTile label="Reached Shortlisted" value={report.reachedShortlisted} definition="Ever shortlisted, regardless of later outcome." />
              <MetricTile label="Reached Interview" value={report.reachedInterview} definition="Ever reached the interview stage." />
              <MetricTile label="Reached Offer" value={report.reachedOffer} definition="Ever received an offer." />
              <MetricTile label="Placed" value={report.placed} definition="Accepted an offer (or further, for internships)." />
              <MetricTile label="Interviews Scheduled" value={report.interviewsScheduled} definition="Applications with a calendared interview." />
            </MetricGrid>
          </Card>

          <Card className="space-y-3">
            <DataLabel>Companies Recruited</DataLabel>
            {report.companiesRecruited.length === 0 ? (
              <EmptyState icon={BarChart3} message="No companies have extended an offer in this scope yet." />
            ) : (
              <Table>
                <TableHead>
                  <TableRow>
                    <TableHeaderCell>Company</TableHeaderCell>
                    <TableHeaderCell>Offers Extended</TableHeaderCell>
                    <TableHeaderCell>Accepted / Placed</TableHeaderCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {report.companiesRecruited.map((c) => (
                    <TableRow key={c.companyName}>
                      <TableCell>{c.companyName}</TableCell>
                      <TableCell>{c.offersCount}</TableCell>
                      <TableCell>{c.acceptedCount}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Card>

          <Card className="space-y-3">
            <DataLabel>Current Status Breakdown</DataLabel>
            <p className="text-xs text-(--color-text-secondary)">
              A snapshot of every in-scope application&apos;s status right now — not a funnel; an application rejected after its interview appears here as
              &ldquo;Rejected,&rdquo; not &ldquo;Interview.&rdquo;
            </p>
            {report.currentStatusBreakdown.length === 0 ? (
              <EmptyState icon={BarChart3} message="No applications in this scope yet." />
            ) : (
              <Table>
                <TableHead>
                  <TableRow>
                    <TableHeaderCell>Status</TableHeaderCell>
                    <TableHeaderCell>Count</TableHeaderCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {report.currentStatusBreakdown.map((s) => (
                    <TableRow key={s.status}>
                      <TableCell>{s.status}</TableCell>
                      <TableCell>{s.count}</TableCell>
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
