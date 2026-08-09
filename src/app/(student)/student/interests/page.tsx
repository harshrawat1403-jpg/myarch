"use client";

import { useEffect, useState } from "react";
import { Mail } from "lucide-react";
import { useAuth } from "@/modules/auth/client";
import { apiClient, ApiError } from "@/lib/api-client";
import { useToast } from "@/components/ui/toast";
import type { StudentInterestDTO } from "@/modules/recruiters";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge, type BadgeVariant } from "@/components/ui/badge";
import { DataLabel } from "@/components/ui/typography";
import { EmptyState } from "@/components/empty-state";

function statusBadgeVariant(status: StudentInterestDTO["status"]): BadgeVariant {
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

function statusLabel(status: StudentInterestDTO["status"]): string {
  switch (status) {
    case "SENT":
      return "Awaiting your response";
    case "ACCEPTED":
      return "Accepted";
    case "DECLINED":
      return "Declined";
    case "COMPLETED":
      return "Completed";
  }
}

/**
 * V4.0 C3 (§7 step 7) — the student's inbox of recruiter interest requests.
 * Accepting or declining never exchanges direct contact information; on
 * acceptance the Secretary is notified to facilitate the connection per
 * department policy, so this page never shows a recruiter's personal email
 * or phone — only their company name and optional message.
 */
export default function StudentInterestsPage() {
  const { accessToken } = useAuth();
  const toast = useToast();

  const [interests, setInterests] = useState<StudentInterestDTO[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [respondingId, setRespondingId] = useState<string | null>(null);

  useEffect(() => {
    if (!accessToken) return;
    let cancelled = false;

    (async () => {
      try {
        const results = await apiClient.get<StudentInterestDTO[]>("/api/student/interests", accessToken);
        if (!cancelled) setInterests(results);
      } catch (err) {
        if (!cancelled) setError(err instanceof ApiError ? err.message : "Unable to load your interest requests.");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [accessToken]);

  async function handleRespond(id: string, decision: "ACCEPT" | "DECLINE") {
    if (!accessToken) return;
    setRespondingId(id);
    try {
      const updated = await apiClient.patch<StudentInterestDTO>(
        `/api/student/interests/${id}`,
        { decision },
        accessToken,
      );
      setInterests((current) => current.map((interest) => (interest.id === id ? updated : interest)));
      toast.success(decision === "ACCEPT" ? "Interest accepted." : "Interest declined.");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Unable to respond to this interest request.");
    } finally {
      setRespondingId(null);
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <DataLabel>Recruiter Interest</DataLabel>
        <h1 className="mt-1 font-[family-name:var(--font-display)] text-2xl font-semibold text-(--color-text-primary)">
          My Interests
        </h1>
        <p className="mt-1 text-sm text-(--color-text-secondary)">
          Recruiters who have expressed interest in your profile. Accepting notifies the Placement office to
          facilitate the connection — the platform never shares direct contact details.
        </p>
      </div>

      {error && <p className="text-sm text-(--color-danger)">{error}</p>}
      {isLoading && <p className="text-sm text-(--color-text-secondary)">Loading…</p>}

      {!isLoading && interests.length === 0 && (
        <Card>
          <EmptyState icon={Mail} message="No recruiters have expressed interest yet." />
        </Card>
      )}

      {!isLoading && interests.length > 0 && (
        <div className="space-y-4">
          {interests.map((interest) => (
            <Card key={interest.id} className="space-y-3">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-medium text-(--color-text-primary)">{interest.companyName}</p>
                  <p className="text-xs text-(--color-text-secondary)">
                    {new Date(interest.sentAt).toISOString().slice(0, 10)}
                  </p>
                </div>
                <Badge variant={statusBadgeVariant(interest.status)}>{statusLabel(interest.status)}</Badge>
              </div>

              {interest.message && <p className="text-sm text-(--color-text-primary)">{interest.message}</p>}

              {interest.status === "SENT" && (
                <div className="flex gap-3 border-t border-(--color-border) pt-3">
                  <Button
                    variant="primary"
                    disabled={respondingId === interest.id}
                    onClick={() => handleRespond(interest.id, "ACCEPT")}
                  >
                    Accept
                  </Button>
                  <Button
                    variant="secondary"
                    disabled={respondingId === interest.id}
                    onClick={() => handleRespond(interest.id, "DECLINE")}
                  >
                    Decline
                  </Button>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
