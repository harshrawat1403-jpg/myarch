"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Mail } from "lucide-react";
import { useAuth } from "@/modules/auth/client";
import { apiClient, ApiError } from "@/lib/api-client";
import type { RecruiterSentInterestDTO } from "@/modules/recruiters";
import { Card } from "@/components/ui/card";
import { Badge, type BadgeVariant } from "@/components/ui/badge";
import { DataLabel } from "@/components/ui/typography";
import { EmptyState } from "@/components/empty-state";

function statusBadgeVariant(status: RecruiterSentInterestDTO["status"]): BadgeVariant {
  switch (status) {
    case "SENT":
      return "pending";
    case "ACCEPTED":
    case "COMPLETED":
      return "approved";
    case "DECLINED":
      return "rejected";
  }
}

function statusLabel(status: RecruiterSentInterestDTO["status"]): string {
  switch (status) {
    case "SENT":
      return "Sent";
    case "ACCEPTED":
      return "Accepted";
    case "DECLINED":
      return "Declined";
    case "COMPLETED":
      return "Completed";
  }
}

/** V4.0 C4 (§17) — /recruiter/interests, active/accepted/completed. */
export default function RecruiterInterestsPage() {
  const { accessToken } = useAuth();
  const [interests, setInterests] = useState<RecruiterSentInterestDTO[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!accessToken) return;
    let cancelled = false;

    (async () => {
      try {
        const results = await apiClient.get<RecruiterSentInterestDTO[]>("/api/recruiters/interests", accessToken);
        if (!cancelled) setInterests(results);
      } catch (err) {
        if (!cancelled) setError(err instanceof ApiError ? err.message : "Unable to load your sent interests.");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [accessToken]);

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <DataLabel>Sent Interests</DataLabel>
        <h1 className="mt-1 font-[family-name:var(--font-display)] text-2xl font-semibold text-(--color-text-primary)">
          Interests
        </h1>
        <p className="mt-1 text-sm text-(--color-text-secondary)">
          Students you&apos;ve expressed interest in. The platform never shares a student&apos;s direct contact
          details — once accepted, Admin facilitates the connection.
        </p>
      </div>

      {error && <p className="text-sm text-(--color-danger)">{error}</p>}
      {isLoading && <p className="text-sm text-(--color-text-secondary)">Loading…</p>}

      {!isLoading && interests.length === 0 && (
        <Card>
          <EmptyState icon={Mail} message="You haven't expressed interest in any students yet." />
        </Card>
      )}

      {!isLoading && interests.length > 0 && (
        <div className="space-y-4">
          {interests.map((interest) => (
            <Link key={interest.id} href={`/recruiter/students/${interest.studentId}`} className="block">
              <Card className="space-y-3 transition-[border-color,box-shadow] duration-150 hover:border-(--color-accent) hover:shadow-md">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-medium text-(--color-text-primary)">{interest.studentName}</p>
                    <p className="text-xs text-(--color-text-secondary)">{interest.batchName}</p>
                  </div>
                  <Badge variant={statusBadgeVariant(interest.status)}>{statusLabel(interest.status)}</Badge>
                </div>

                {interest.message && <p className="text-sm text-(--color-text-primary)">{interest.message}</p>}

                {interest.status === "ACCEPTED" && (
                  <p className="text-xs text-(--color-text-secondary)">
                    Accepted — Admin will facilitate the connection.
                  </p>
                )}
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
