"use client";
/* eslint-disable react-hooks/set-state-in-effect -- follows the established authenticated API-load pattern. */

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CalendarClock, CheckCircle2, ClipboardList, Users } from "lucide-react";
import { useAuth } from "@/modules/auth/client";
import { apiClient, ApiError } from "@/lib/api-client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { StatPanel } from "@/components/ui/stat-panel";
import { FormRenderer } from "@/components/forms/form-renderer";

type Candidate = {
  id: string;
  applicantUserId: string;
  candidateName: string;
  rollNumber: string | null;
  applicationId: string;
  submittedAt: string;
  answers: Record<string, unknown>;
  applicationStatus: string;
  status: string;
  positions: Array<{ positionId: string; title: string }>;
  questions: readonly Question[];
  shortlist: Array<{ positionId: string; createdAt: string }>;
  interviews: Array<{
    id: string;
    positionId: string;
    scheduledAt: string | null;
    durationMinutes: number | null;
    mode: string | null;
    location: string | null;
    candidateAttended: boolean | null;
      candidateInstructions: string | null;
    completedAt: string | null;
    status: string;
  }>;
  decisions: Array<{
    positionId: string;
    outcome: "SELECTED" | "NOT_SELECTED";
    state: "RECORDED" | "FINALIZED";
    decidedAt: string;
    finalizedAt: string | null;
  }>;
};
type Question = {
  key: string;
  label: string;
  type: "TEXT" | "LONG_TEXT" | "NUMBER" | "EMAIL" | "DROPDOWN" | "RADIO" | "CHECKBOX" | "DATE";
  description: string | null;
  required: boolean;
  options: readonly string[];
  validation: { min?: number; max?: number } | null;
  displayOrder: number;
};
type Processing = {
  candidates: Candidate[];
  positions: Array<{ id: string; title: string; seats: number; displayOrder: number }>;
};
type Selection = {
  id: string;
  title: string;
  status: string;
  applicationOpenAt: string;
  applicationCloseAt: string;
  shortlistPublishedAt: string | null;
};
type WorkspaceView = "dashboard" | "applications" | "shortlist" | "interviews" | "results";

const dateTime = (value: string | null) => (value ? new Date(value).toLocaleString() : "—");
const domainOf = (candidate: Candidate) =>
  candidate.positions.map((position) => position.title).join(", ");
export const shortlistDecision = (candidate: Candidate) =>
  candidate.shortlist.length > 0
    ? "SHORTLISTED"
    : candidate.status === "INELIGIBLE"
      ? "NOT_SHORTLISTED"
      : "PENDING";
export const interviewCandidates = (candidates: Candidate[]) =>
  candidates.filter(
    (candidate) =>
      shortlistDecision(candidate) === "SHORTLISTED" &&
      !candidate.interviews.some((interview) => ["PLANNED", "SCHEDULED"].includes(interview.status)),
  );
export const resultsCandidates = (candidates: Candidate[], positionId: string) =>
  candidates.filter((candidate) =>
    candidate.shortlist.some((entry) => entry.positionId === positionId),
  );

export function CoreCommitteeSelectionWorkspace({ id, view }: { id: string; view: WorkspaceView }) {
  const { accessToken } = useAuth();
  const [selection, setSelection] = useState<Selection | null>(null);
  const [processing, setProcessing] = useState<Processing | null>(null);
  const [message, setMessage] = useState("");
  const [domain, setDomain] = useState("ALL");
  const [status, setStatus] = useState("ALL");
  const [detail, setDetail] = useState<Candidate | null>(null);
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    if (!accessToken) return;
    const [selectionResult, processingResult] = await Promise.all([
      apiClient.get<Selection>(`/api/core-committee-selections/${id}`, accessToken),
      apiClient.get<Processing>(`/api/core-committee-selections/${id}/processing`, accessToken),
    ]);
    setSelection(selectionResult);
    setProcessing(processingResult);
    return processingResult;
  }, [accessToken, id]);
  useEffect(() => {
    void load().catch((error) =>
      setMessage(
        error instanceof ApiError ? error.message : "Unable to load Core Committee workflow",
      ),
    );
  }, [load]);
  const candidates = useMemo(
    () =>
      (processing?.candidates ?? []).filter(
        (candidate) =>
          (domain === "ALL" ||
            candidate.positions.some((position) => position.positionId === domain)) &&
          (status === "ALL" || candidate.status === status),
      ),
    [processing, domain, status],
  );
  const act = async (operation: () => Promise<unknown>, success: string) => {
    setBusy(true);
    setMessage("");
    try {
      await operation();
      const refreshed = await load();
      if (refreshed && detail) {
        setDetail(refreshed.candidates.find((candidate) => candidate.id === detail.id) ?? null);
      }
      setMessage(success);
    } catch (error) {
      setMessage(
        error instanceof ApiError ? error.message : "Unable to update Core Committee workflow",
      );
    } finally {
      setBusy(false);
    }
  };
  const urls = (name: WorkspaceView) => `/dashboard/core-committee-selections/${id}/${name}`;
  if (!processing || !selection) return <p>{message || "Loading Core Committee workflow…"}</p>;
  const scheduled = processing.candidates.flatMap((candidate) =>
    candidate.interviews
      .filter((entry) => entry.status === "SCHEDULED")
      .map((entry) => ({ candidate, entry })),
  );
  const completed = processing.candidates.flatMap((candidate) =>
    candidate.interviews.filter((entry) => entry.status === "COMPLETED"),
  );
  const cancelled = processing.candidates.flatMap((candidate) =>
    candidate.interviews.filter((entry) => entry.status === "CANCELLED"),
  );
  return (
    <div className="max-w-6xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm text-(--color-text-secondary)">
            Core Committee · Council-led selection
          </p>
          <h1 className="text-2xl font-semibold">{selection.title}</h1>
        </div>
        <Badge variant="neutral">{selection.status}</Badge>
      </div>
      <nav className="flex flex-wrap gap-2 text-sm" aria-label="Core Committee workflow">
        {(
          ["dashboard", "applications", "shortlist", "interviews", "results"] as WorkspaceView[]
        ).map((item) => (
          <Link
            key={item}
            href={urls(item)}
            className={`rounded px-3 py-2 ${view === item ? "bg-(--color-primary) text-white" : "border border-(--color-border)"}`}
          >
            {item.charAt(0).toUpperCase() + item.slice(1)}
          </Link>
        ))}
      </nav>
      {message && (
        <p role="status" className="rounded border border-(--color-border) p-3 text-sm">
          {message}
        </p>
      )}
      {view === "dashboard" && (
        <>
          <Card className="space-y-2">
            <p className="text-sm text-(--color-text-secondary)">Lifecycle</p>
            <p className="font-medium">{selection.status.replaceAll("_", " ")}</p>
            <p className="text-sm text-(--color-text-secondary)">
              Applications: {dateTime(selection.applicationOpenAt)} –{" "}
              {dateTime(selection.applicationCloseAt)}
            </p>
          </Card>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
            <StatPanel
              compact
              icon={ClipboardList}
              label="Applications"
              value={processing.candidates.length}
              scope="Submitted"
            />
            <StatPanel
              compact
              icon={Users}
              label="Shortlisted"
              value={
                processing.candidates.filter((candidate) => candidate.shortlist.length > 0).length
              }
              scope="Candidates"
            />
            <StatPanel
              compact
              icon={CalendarClock}
              label="Scheduled"
              value={scheduled.length}
              scope="Interviews"
            />
            <StatPanel
              compact
              icon={CheckCircle2}
              label="Completed"
              value={completed.length}
              scope="Interviews"
            />
            <StatPanel
              compact
              icon={CalendarClock}
              label="Cancelled"
              value={cancelled.length}
              scope="Interviews"
            />
            <StatPanel
              compact
              icon={Users}
              label="Selected"
              value={
                processing.candidates.filter((candidate) =>
                  candidate.decisions.some((decision) => decision.outcome === "SELECTED"),
                ).length
              }
              scope="Finalized"
            />
          </div>
          <Card className="space-y-2">
            <p className="font-medium">Applications by domain</p>
            {processing.positions.map((position) => (
              <p key={position.id} className="text-sm">
                {position.title}:{" "}
                {
                  processing.candidates.filter((candidate) =>
                    candidate.positions.some((entry) => entry.positionId === position.id),
                  ).length
                }{" "}
                applications · {position.seats} capacity
              </p>
            ))}
            {!processing.positions.length && (
              <p className="text-sm text-(--color-text-secondary)">No domains configured.</p>
            )}
          </Card>
          <Card className="flex flex-wrap gap-3">
            <Link className="underline" href={urls("applications")}>
              View applications
            </Link>
            <Link className="underline" href={urls("shortlist")}>
              View shortlist
            </Link>
            <Link className="underline" href={urls("interviews")}>
              Manage interviews
            </Link>
            <Link className="underline" href={urls("results")}>
              View results
            </Link>
          </Card>
        </>
      )}
      {view === "applications" && (
        <ApplicationPanel
          candidates={candidates}
          positions={processing.positions}
          domain={domain}
          status={status}
          setDomain={setDomain}
          setStatus={setStatus}
          onDetail={setDetail}
          onShortlist={(candidate) =>
            act(
              () =>
                apiClient.post(
                  `/api/core-committee-selections/${id}/shortlist`,
                  {
                    candidateId: candidate.id,
                    positionIds: candidate.positions.map((position) => position.positionId),
                  },
                  accessToken!,
                ),
              "Candidate shortlisted",
            )
          }
          onReject={(candidate) =>
            act(
              () =>
                apiClient.post(
                  `/api/core-committee-selections/${id}/shortlist`,
                  {
                    candidateId: candidate.id,
                    positionIds: candidate.positions.map((position) => position.positionId),
                    shortlisted: false,
                  },
                  accessToken!,
                ),
              "Candidate marked not shortlisted",
            )
          }
          busy={busy}
        />
      )}
      {view === "shortlist" && (
        <ShortlistPanel
          candidates={processing.candidates}
          positions={processing.positions}
          onDetail={setDetail}
          published={Boolean(selection.shortlistPublishedAt)}
          canPublish={selection.status === "SHORTLIST"}
          publish={() => {
            if (!window.confirm("Publish the shortlist to all applicants?")) return;
            void act(
              () =>
                apiClient.post(
                  `/api/core-committee-selections/${id}/shortlist/publish`,
                  {},
                  accessToken!,
                ),
              "Shortlist published",
            );
          }}
          busy={busy}
        />
      )}
      {view === "interviews" && (
        <InterviewPanel
          candidates={processing.candidates}
          selectionId={id}
          token={accessToken!}
          act={act}
          busy={busy}
        />
      )}
      {view === "results" && (
        <ResultsPanel
          candidates={processing.candidates}
          positions={processing.positions}
          published={selection.status === "PUBLISHED" || selection.status === "MEMBERSHIP_CONFIRMED" || selection.status === "ARCHIVED"}
          busy={busy}
          onDecision={(candidate, positionId, outcome) =>
            act(
              () =>
                apiClient.post(
                  `/api/core-committee-selections/${id}/decisions/secretary`,
                  { candidateId: candidate.id, positionId, outcome },
                  accessToken!,
                ),
              outcome === "SELECTED" ? "Candidate selected" : "Candidate marked not selected",
            )
          }
          onPublish={() => {
            if (!window.confirm("Publish final results to all applicants?")) return;
            void act(
              () =>
                apiClient.post(
                  `/api/core-committee-selections/${id}/publish`,
                  {},
                  accessToken!,
                ),
              "Results published",
            );
          }}
        />
      )}
      {detail && (
        <ApplicationDetail
          candidate={detail}
          close={() => setDetail(null)}
          onShortlist={() =>
            act(
              () =>
                apiClient.post(
                  `/api/core-committee-selections/${id}/shortlist`,
                  {
                    candidateId: detail.id,
                    positionIds: detail.positions.map((position) => position.positionId),
                  },
                  accessToken!,
                ),
              "Candidate shortlisted",
            )
          }
          onReject={() =>
            act(
              () =>
                apiClient.post(
                  `/api/core-committee-selections/${id}/shortlist`,
                  {
                    candidateId: detail.id,
                    positionIds: detail.positions.map((position) => position.positionId),
                    shortlisted: false,
                  },
                  accessToken!,
                ),
              "Candidate marked not shortlisted",
            )
          }
          busy={busy}
        />
      )}
    </div>
  );
}

function ApplicationPanel({
  candidates,
  positions,
  domain,
  status,
  setDomain,
  setStatus,
  onDetail,
  onShortlist,
  onReject,
  busy,
}: {
  candidates: Candidate[];
  positions: Processing["positions"];
  domain: string;
  status: string;
  setDomain: (value: string) => void;
  setStatus: (value: string) => void;
  onDetail: (candidate: Candidate) => void;
  onShortlist: (candidate: Candidate) => void;
  onReject: (candidate: Candidate) => void;
  busy: boolean;
}) {
  return (
    <Card className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <select
          value={domain}
          onChange={(event) => setDomain(event.target.value)}
          className="rounded border border-(--color-border) p-2"
        >
          <option value="ALL">All domains</option>
          {positions.map((position) => (
            <option key={position.id} value={position.id}>
              {position.title}
            </option>
          ))}
        </select>
        <select
          value={status}
          onChange={(event) => setStatus(event.target.value)}
          className="rounded border border-(--color-border) p-2"
        >
          <option value="ALL">All statuses</option>
          {[...new Set(candidates.map((candidate) => candidate.status))].map((value) => (
            <option key={value}>{value}</option>
          ))}
        </select>
      </div>
      <div className="space-y-3">
        {candidates.map((candidate) => (
          <div
            key={candidate.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded border border-(--color-border) p-3"
          >
            <div>
              <p className="font-medium">{candidate.candidateName}</p>
              <p className="text-sm text-(--color-text-secondary)">
                {candidate.rollNumber ?? "No roll recorded"} · {domainOf(candidate)} · Submitted{" "}
                {dateTime(candidate.submittedAt)}
              </p>
            </div>
            <div className="flex gap-2">
              <Badge variant="neutral">{candidate.status}</Badge>
              <Button onClick={() => onDetail(candidate)}>View application</Button>
              <Button
                disabled={busy}
                variant={shortlistDecision(candidate) === "SHORTLISTED" ? "secondary" : "primary"}
                onClick={() =>
                  shortlistDecision(candidate) === "SHORTLISTED"
                    ? onReject(candidate)
                    : onShortlist(candidate)
                }
              >
                {shortlistDecision(candidate) === "SHORTLISTED"
                  ? "Shortlisted"
                  : "Shortlist candidate"}
              </Button>
            </div>
          </div>
        ))}
        {!candidates.length && <p>No applications match these filters.</p>}
      </div>
    </Card>
  );
}
function ShortlistPanel({
  candidates,
  positions,
  onDetail,
  published,
  canPublish,
  publish,
  busy,
}: {
  candidates: Candidate[];
  positions: Processing["positions"];
  onDetail: (candidate: Candidate) => void;
  published: boolean;
  canPublish: boolean;
  publish: () => void;
  busy: boolean;
}) {
  return (
    <div className="space-y-4">
      <Card className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-medium">Shortlist publication</p>
          <p className="text-sm text-(--color-text-secondary)">
            {published
              ? "Applicants can now see their shortlist outcome."
              : "Shortlist decisions remain internal until published."}
          </p>
        </div>
        {!published && (
          <Button disabled={busy || !canPublish} onClick={publish}>
            Publish shortlist
          </Button>
        )}
      </Card>
      {!canPublish && !published && (
        <Card>
          <p className="text-sm text-(--color-text-secondary)">
            Close applications and finalize scrutiny before publishing the shortlist.
          </p>
        </Card>
      )}
      {positions.map((position) => {
        const entries = candidates.filter((candidate) =>
          candidate.shortlist.some((entry) => entry.positionId === position.id),
        );
        return (
          <Card key={position.id} className="space-y-3">
            <div>
              <h2 className="font-semibold">{position.title}</h2>
              <p className="text-sm text-(--color-text-secondary)">
                {position.seats} positions ·{" "}
                {
                  candidates.filter((candidate) =>
                    candidate.positions.some((entry) => entry.positionId === position.id),
                  ).length
                }{" "}
                applications · {entries.length} shortlisted
              </p>
            </div>
            {entries.map((candidate) => (
              <div
                key={candidate.id}
                className="flex justify-between gap-3 border-t border-(--color-border) pt-3"
              >
                <span>
                  {candidate.candidateName} · {candidate.rollNumber ?? "—"} ·{" "}
                  {dateTime(candidate.submittedAt)}
                </span>
                <Button onClick={() => onDetail(candidate)}>View application</Button>
              </div>
            ))}
            {!entries.length && (
              <p className="text-sm">
                No shortlisted candidates available yet. Mark candidates as shortlisted from
                Applications first.
              </p>
            )}
          </Card>
        );
      })}
      {!positions.length && (
        <Card>
          <p>No shortlist data yet.</p>
        </Card>
      )}
    </div>
  );
}
function InterviewPanel({
  candidates,
  selectionId,
  token,
  act,
  busy,
}: {
  candidates: Candidate[];
  selectionId: string;
  token: string;
  act: (op: () => Promise<unknown>, success: string) => Promise<void>;
  busy: boolean;
}) {
  const [candidateId, setCandidateId] = useState("");
  const [positionId, setPositionId] = useState("");
  const [when, setWhen] = useState("");
  const [duration, setDuration] = useState("30");
  const [mode, setMode] = useState("IN_PERSON");
  const [location, setLocation] = useState("");
  const selected = candidates.find((candidate) => candidate.id === candidateId);
  const shortlistedPositions =
    selected?.shortlist
      .map((entry) =>
        selected.positions.find((position) => position.positionId === entry.positionId),
      )
      .filter((position): position is Candidate["positions"][number] => Boolean(position)) ?? [];
  const availableInterviewCandidates = interviewCandidates(candidates);
  return (
    <div className="space-y-4">
      {!availableInterviewCandidates.length ? (
        <Card>
          <p className="text-sm text-(--color-text-secondary)">
            No shortlisted candidates yet. Mark candidates as shortlisted from Applications.
          </p>
        </Card>
      ) : null}
      <Card>
        <form
          className="grid gap-3 sm:grid-cols-2"
          onSubmit={(event) => {
            event.preventDefault();
            if (!selected || !positionId || !when) return;
            void act(
              () =>
                apiClient.post(
                  `/api/core-committee-selections/${selectionId}/interviews`,
                  {
                    candidateId: selected.id,
                    positionId,
                    scheduledAt: new Date(when).toISOString(),
                    durationMinutes: Number(duration),
                    mode,
                    location,
                  },
                  token,
                ),
              "Interview scheduled",
            );
          }}
        >
          <div>
            <Label>Shortlisted candidate</Label>
            <select
              required
              value={candidateId}
              onChange={(event) => {
                const value = event.target.value;
                const candidate = candidates.find((item) => item.id === value);
                setCandidateId(value);
                setPositionId(candidate?.shortlist[0]?.positionId ?? "");
              }}
              className="w-full rounded border border-(--color-border) p-2"
            >
              <option value="">Select candidate</option>
              {availableInterviewCandidates
                .map((candidate) => (
                  <option key={candidate.id} value={candidate.id}>
                    {candidate.candidateName} — {domainOf(candidate)}
                  </option>
                ))}
            </select>
          </div>
          <div>
            <Label>Shortlisted position</Label>
            <select
              required
              disabled={!selected}
              value={positionId}
              onChange={(event) => setPositionId(event.target.value)}
              className="w-full rounded border border-(--color-border) p-2"
            >
              <option value="">Select position</option>
              {shortlistedPositions.map((position) => (
                <option key={position.positionId} value={position.positionId}>
                  {position.title}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label>Date and start time</Label>
            <Input
              required
              type="datetime-local"
              value={when}
              onChange={(event) => setWhen(event.target.value)}
            />
          </div>
          <div>
            <Label>Duration (minutes)</Label>
            <Input
              required
              type="number"
              min="1"
              value={duration}
              onChange={(event) => setDuration(event.target.value)}
            />
          </div>
          <div>
            <Label>Mode</Label>
            <select
              value={mode}
              onChange={(event) => setMode(event.target.value)}
              className="w-full rounded border border-(--color-border) p-2"
            >
              <option>IN_PERSON</option>
              <option>ONLINE</option>
            </select>
          </div>
          <div className="sm:col-span-2">
            <Label>Venue or meeting link</Label>
            <Input value={location} onChange={(event) => setLocation(event.target.value)} />
          </div>
          <Button disabled={busy}>Schedule interview</Button>
        </form>
      </Card>
      <Card className="space-y-3">
        <h2 className="font-semibold">Interviews</h2>
        {candidates.flatMap((candidate) =>
          candidate.interviews.map((interview, index) => (
            <div
              key={`${candidate.id}-${index}`}
              className="flex flex-wrap justify-between gap-3 border-t border-(--color-border) pt-3"
            >
              <span>
                {candidate.candidateName} · {domainOf(candidate)} ·{" "}
                {dateTime(interview.scheduledAt)} · {interview.durationMinutes ?? "—"} minutes ·{" "}
                {interview.mode ?? "—"} · {interview.location ?? "Venue pending"}
              </span>
              {interview.candidateInstructions && (
                <p className="w-full text-sm text-(--color-text-secondary)">
                  Instructions: {interview.candidateInstructions}
                </p>
              )}
              <div className="flex gap-2">
                <Badge variant="neutral">{interview.status}</Badge>
                {interview.status === "SCHEDULED" && (
                  <>
                    <Button
                      disabled={busy}
                      onClick={() => {
                        const value = window.prompt("New date and time (YYYY-MM-DDTHH:mm)");
                        if (value)
                          void act(
                            () =>
                              apiClient.patch(
                                `/api/core-committee-selections/${selectionId}/interviews/${interview.id}`,
                                {
                                  scheduledAt: new Date(value).toISOString(),
                                  durationMinutes: interview.durationMinutes ?? 30,
                                  mode: interview.mode ?? "IN_PERSON",
                                  location: interview.location ?? "To be confirmed",
                                },
                                token,
                              ),
                            "Interview rescheduled",
                          );
                      }}
                    >
                      Reschedule
                    </Button>
                    <Button
                      disabled={busy}
                      onClick={() =>
                        void act(
                          () =>
                            apiClient.post(
                              `/api/core-committee-selections/${selectionId}/interviews/${interview.id}/complete`,
                              { candidateAttended: true },
                              token,
                            ),
                          "Interview completed",
                        )
                      }
                    >
                      Complete
                    </Button>
                    <Button
                      disabled={busy}
                      onClick={() =>
                        void act(
                          () =>
                            apiClient.delete(
                              `/api/core-committee-selections/${selectionId}/interviews/${interview.id}`,
                              token,
                            ),
                          "Interview cancelled",
                        )
                      }
                    >
                      Cancel
                    </Button>
                  </>
                )}
              </div>
            </div>
          )),
        )}
        {!candidates.some((candidate) => candidate.interviews.length) && (
          <p>No interviews scheduled.</p>
        )}
      </Card>
    </div>
  );
}
function ResultsPanel({
  candidates,
  positions,
  published,
  busy,
  onDecision,
  onPublish,
}: {
  candidates: Candidate[];
  positions: Processing["positions"];
  published: boolean;
  busy: boolean;
  onDecision: (candidate: Candidate, positionId: string, outcome: "SELECTED" | "NOT_SELECTED") => void;
  onPublish: () => void;
}) {
  return (
    <div className="space-y-4">
      <Card className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-medium">Final results</p>
          <p className="text-sm text-(--color-text-secondary)">
            {published ? "Results are published and final decisions are frozen." : "Final decisions remain internal until published."}
          </p>
        </div>
        {!published && <Button disabled={busy} onClick={onPublish}>Publish results</Button>}
      </Card>
      {positions.map((position) => {
        const underReview = resultsCandidates(candidates, position.id);
        const selected = underReview.filter((candidate) =>
          candidate.decisions.some(
            (decision) => decision.positionId === position.id && decision.outcome === "SELECTED",
          ),
        );
        return (
          <Card key={position.id} className="space-y-3">
            <div>
              <h2 className="font-semibold">{position.title}</h2>
              <p className="text-sm text-(--color-text-secondary)">
                Capacity {position.seats} · Candidates under review {underReview.length} · Selected{" "}
                {selected.length} · Remaining {Math.max(0, position.seats - selected.length)}
              </p>
            </div>
            {underReview.map((candidate) => {
              const decision = candidate.decisions.find((item) => item.positionId === position.id);
              const outcome = decision?.outcome ?? "PENDING";
              const interview = candidate.interviews.find((item) => item.positionId === position.id);
              return (
              <div
                key={candidate.id}
                className="flex flex-wrap justify-between gap-3 border-t border-(--color-border) pt-3"
              >
                <div>
                  <p className="font-medium">{candidate.candidateName}</p>
                  <p className="text-sm text-(--color-text-secondary)">
                    {candidate.rollNumber ?? "No roll recorded"} · {position.title}
                    {interview ? ` · Interview ${interview.status}` : ""}
                  </p>
                  <p className="text-sm">Decision: {outcome}</p>
                </div>
                {!published && (
                  <div className="flex gap-2">
                    {outcome === "SELECTED" ? (
                      <Button disabled={busy} onClick={() => onDecision(candidate, position.id, "NOT_SELECTED")}>
                        Mark not selected
                      </Button>
                    ) : (
                      <Button disabled={busy} onClick={() => onDecision(candidate, position.id, "SELECTED")}>
                        Select
                      </Button>
                    )}
                    {outcome !== "NOT_SELECTED" && (
                      <Button disabled={busy} onClick={() => onDecision(candidate, position.id, "NOT_SELECTED")}>
                        Not selected
                      </Button>
                    )}
                  </div>
                )}
              </div>
              );
            })}
            {!underReview.length && <p className="text-sm">No decisions yet.</p>}
          </Card>
        );
      })}
      {!positions.length && (
        <Card>
          <p>No decisions yet.</p>
        </Card>
      )}
    </div>
  );
}
function ApplicationDetail({
  candidate,
  close,
  onShortlist,
  onReject,
  busy,
}: {
  candidate: Candidate;
  close: () => void;
  onShortlist: () => void;
  onReject: () => void;
  busy: boolean;
}) {
  const questions = candidate.questions;
  const fields = questions.map((question) => ({
    ...question,
    id: question.key,
    formId: "core-committee",
  }));
  return (
    <Card className="space-y-3">
      <div className="flex justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">{candidate.candidateName}</h2>
          <p className="text-sm text-(--color-text-secondary)">
            {candidate.rollNumber ?? "No roll recorded"} · {domainOf(candidate)} ·{" "}
            {dateTime(candidate.submittedAt)}
          </p>
        </div>
        <Button onClick={close}>Close</Button>
      </div>
      <p>
        Workflow status: <Badge variant="neutral">{candidate.status}</Badge>
      </p>
      <section className="space-y-2">
        <h3 className="font-medium">Application responses</h3>
        {fields.length ? (
          <FormRenderer fields={fields} answers={candidate.answers} readOnly />
        ) : (
          <p className="text-sm text-(--color-text-secondary)">
            No questions were configured for this intake.
          </p>
        )}
      </section>
      <section className="space-y-2 border-t border-(--color-border) pt-3">
        <h3 className="font-medium">Shortlist decision</h3>
        <Badge variant="neutral">
          {shortlistDecision(candidate)}
        </Badge>
        {!candidate.shortlist.length && candidate.status !== "INELIGIBLE" && (
          <div className="flex flex-wrap gap-2">
            <Button disabled={busy} onClick={onShortlist}>
              Shortlist candidate
            </Button>
            <Button disabled={busy} onClick={onReject}>
              Not shortlist
            </Button>
          </div>
        )}
        {candidate.shortlist.length > 0 && (
          <Button disabled={busy} onClick={onReject}>
            Mark not shortlisted
          </Button>
        )}
        {candidate.status === "INELIGIBLE" && !candidate.shortlist.length && (
          <Button disabled={busy} onClick={onShortlist}>
            Shortlist candidate
          </Button>
        )}
      </section>
    </Card>
  );
}
