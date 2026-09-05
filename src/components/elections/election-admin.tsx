"use client";
import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/modules/auth/client";
import type { CandidateRecord, ElectionRecord } from "@/modules/elections";
import type { FormRecord } from "@/modules/forms";
import type { FormApplicationDetail } from "@/modules/applications";
import { apiClient, ApiError } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { FormRenderer } from "@/components/forms/form-renderer";
import { ElectionConfigForm } from "./election-config-form";
import { ElectionProcessingAdmin } from "./election-processing-admin";

type ElectionResultReview = {
  version: number;
  status: string;
  countedAt: string;
  positions: {
    id: string;
    positionTitle: string;
    status: string;
    notaFinalScore: string | number;
    groups: {
      voterGroup: string;
      eligibleCount: number;
      participationCount: number;
      abstentionCount: number;
      notaVoteCount: number;
      scoringDenominator: number;
      quorumPercent: string | number;
      quorumMet: boolean;
      configuredWeight: string | number;
    }[];
    candidates: {
      id: string;
      candidateName: string;
      rawRank: number;
      isProvisionalWinner: boolean;
      finalScore: string | number;
      groups: { rawVoteCount: number; normalizedScore: string | number }[];
    }[];
  }[];
};

export function ElectionAdmin({ id }: { id?: string }) {
  const { accessToken, role } = useAuth();
  const router = useRouter();
  const [items, setItems] = useState<ElectionRecord[]>([]);
  const [election, setElection] = useState<ElectionRecord | null>(null);
  const [forms, setForms] = useState<FormRecord[]>([]);
  const [candidates, setCandidates] = useState<CandidateRecord[]>([]);
  const [application, setApplication] = useState<FormApplicationDetail | null>(null);
  const [results, setResults] = useState<ElectionResultReview | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  async function load() {
    if (!accessToken || role !== "SECRETARY") return;
    if (id) {
      const [detail, candidateRows, formRows] = await Promise.all([
        apiClient.get<ElectionRecord>(`/api/elections/${id}`, accessToken),
        apiClient.get<CandidateRecord[]>(`/api/elections/${id}/candidates`, accessToken),
        apiClient.get<FormRecord[]>("/api/forms", accessToken),
      ]);
      setElection(detail);
      setCandidates(candidateRows);
      setForms(formRows);
      if (detail.status === "RESULT_REVIEW")
        setResults(await apiClient.get<ElectionResultReview>(`/api/elections/${id}/results`, accessToken));
      else setResults(null);
    } else setItems(await apiClient.get<ElectionRecord[]>("/api/elections", accessToken));
  }
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- load updates state after API responses, matching the existing Forms page.
    void load().catch((error) =>
      setMessage(error instanceof ApiError ? error.message : "Unable to load elections"),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken, role, id]);
  async function act(operation: () => Promise<unknown>, success = "Saved") {
    setBusy(true);
    setMessage("");
    try {
      await operation();
      await load();
      setMessage(success);
    } catch (error) {
      setMessage(error instanceof ApiError ? error.message : "Unable to save election");
    } finally {
      setBusy(false);
    }
  }
  if (role !== "SECRETARY") return <p>Only the Secretary may administer elections.</p>;
  return (
    <div className="max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">
          {id ? (election?.title ?? "Election") : "Elections"}
        </h1>
        <p className="text-sm text-(--color-text-secondary)">
          Council and Core Committee application intake
        </p>
      </div>
      {message && (
        <p role="status" className="rounded border border-(--color-border) p-3 text-sm">
          {message}
        </p>
      )}
      {!id ? (
        <>
          <Card className="space-y-4">
            <h2 className="text-lg font-semibold">Create election</h2>
            <ElectionConfigForm
              busy={busy}
              onSave={(data) =>
                act(async () => {
                  const created = await apiClient.post<ElectionRecord>(
                    "/api/elections",
                    data,
                    accessToken!,
                  );
                  router.push(`/dashboard/elections/${created.id}`);
                })
              }
            />
          </Card>
          <section className="space-y-3">
            <h2 className="text-lg font-semibold">All elections</h2>
            {!items.length && <p>No elections yet.</p>}
            {items.map((item) => (
              <Link key={item.id} href={`/dashboard/elections/${item.id}`} className="block">
                <Card className="flex justify-between">
                  <div>
                    {item.title}
                    <p className="text-sm">
                      {item.academicYear} · {item.type}
                    </p>
                  </div>
                  <Badge variant="neutral">{item.status}</Badge>
                </Card>
              </Link>
            ))}
          </section>
        </>
      ) : (
        election && (
          <>
            <Link href="/dashboard/elections" className="text-sm underline">
              All elections
            </Link>
            <Card className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <Badge variant="neutral">{election.status}</Badge>
                {election.status === "DRAFT" ? (
                  <Button
                    disabled={busy}
                    variant="primary"
                    onClick={() =>
                      act(
                        () =>
                          apiClient.post(
                            `/api/elections/${id}/status`,
                            { status: "APPLICATION_OPEN" },
                            accessToken!,
                          ),
                        "Applications opened and configuration locked",
                      )
                    }
                  >
                    Open applications and lock configuration
                  </Button>
                ) : (
                  election.status === "APPLICATION_OPEN" && (
                    <Button
                      disabled={busy}
                      onClick={() =>
                        act(
                          () =>
                            apiClient.post(
                              `/api/elections/${id}/status`,
                              { status: "APPLICATION_CLOSED" },
                              accessToken!,
                            ),
                          "Applications closed",
                        )
                      }
                    >
                      Close applications
                    </Button>
                  )
                )}
                {election.status === "VOTING" && (
                  <Button
                    disabled={busy}
                    onClick={() =>
                      act(
                        () => apiClient.post(`/api/elections/${id}/voting/close`, {}, accessToken!),
                        "Voting closed; the authoritative count can now begin",
                      )
                    }
                  >
                    Close voting
                  </Button>
                )}
                {election.status === "COUNTING" && (
                  <Button
                    disabled={busy}
                    onClick={() =>
                      act(
                        () => apiClient.post(`/api/elections/${id}/results/count`, {}, accessToken!),
                        "Result snapshot created for administrative review",
                      )
                    }
                  >
                    Count Council election
                  </Button>
                )}
              </div>
              <p className="text-sm text-(--color-text-secondary)">
                Opening requires a published form, valid positions, and Council weights totaling
                100% per position. Configuration becomes read-only when applications open. The
                deadline is enforced even before you mark the election closed.
              </p>
              <ElectionConfigForm
                key={election.id + JSON.stringify(election)}
                election={election}
                busy={busy}
                onSave={(data) =>
                  act(() => apiClient.put(`/api/elections/${id}`, data, accessToken!))
                }
              />
            </Card>
            <Card className="space-y-4">
              <h2 className="text-lg font-semibold">Application form</h2>
              <p>
                {election.applicationForm
                  ? `${election.applicationForm.title} (${election.applicationForm.status})`
                  : "No form associated"}
              </p>
              <p className="text-sm">
                Use a form with no submissions. A form belongs to one election.
              </p>
              <Link href="/dashboard/forms" className="text-sm underline">
                Create or publish a form
              </Link>
              {election.status === "DRAFT" && (
                <form
                  className="flex gap-3"
                  onSubmit={(event) => {
                    event.preventDefault();
                    const data = new FormData(event.currentTarget);
                    void act(() =>
                      apiClient.put(
                        `/api/elections/${id}/application-form`,
                        { formId: data.get("formId") },
                        accessToken!,
                      ),
                    );
                  }}
                >
                  <select
                    aria-label="Application form"
                    name="formId"
                    required
                    defaultValue={election.applicationForm?.formId ?? ""}
                    className="min-w-0 flex-1 rounded border border-(--color-border) bg-(--color-background) p-2"
                  >
                    <option value="" disabled>
                      Select existing form
                    </option>
                    {forms
                      .filter(
                        (form) =>
                          (!form.electionId || form.electionId === id) &&
                          ["DRAFT", "PUBLISHED"].includes(form.status),
                      )
                      .map((form) => (
                        <option key={form.id} value={form.id}>
                          {form.title} ({form.status})
                        </option>
                      ))}
                  </select>
                  <Button disabled={busy}>Associate form</Button>
                </form>
              )}
            </Card>
            <section className="space-y-4">
              <h2 className="text-lg font-semibold">Positions and voter-group weights</h2>
              {election.positions.map((position) => (
                <PositionEditor
                  key={JSON.stringify(position)}
                  position={position}
                  disabled={busy || election.status !== "DRAFT"}
                  council={election.type === "COUNCIL"}
                  onSave={(data) =>
                    act(() =>
                      apiClient.put(
                        `/api/elections/${id}/positions/${position.id}`,
                        data,
                        accessToken!,
                      ),
                    )
                  }
                  onDelete={() =>
                    act(() =>
                      apiClient.delete(
                        `/api/elections/${id}/positions/${position.id}`,
                        accessToken!,
                      ),
                    )
                  }
                />
              ))}
              {election.status === "DRAFT" && (
                <PositionEditor
                  key={`new-${election.positions.length}`}
                  disabled={busy}
                  council={election.type === "COUNCIL"}
                  onSave={(data) =>
                    act(() => apiClient.post(`/api/elections/${id}/positions`, data, accessToken!))
                  }
                />
              )}
            </section>
            <Card className="space-y-4">
              <h2 className="text-lg font-semibold">
                Candidate applications ({candidates.length})
              </h2>
              {!candidates.length && <p className="text-sm">No candidate applications received.</p>}
              {candidates.map((candidate) => (
                <div
                  key={candidate.id}
                  className="flex flex-wrap items-center justify-between gap-3 border-b border-(--color-border) pb-3"
                >
                  <div>
                    <p className="font-medium">{candidate.applicantName}</p>
                    <p className="text-sm">
                      {candidate.positions.map((p) => p.title).join(", ")} · {candidate.status}
                    </p>
                  </div>
                  <Button
                    disabled={busy}
                    onClick={() =>
                      act(
                        async () =>
                          setApplication(
                            await apiClient.get<FormApplicationDetail>(
                              `/api/applications/${candidate.applicationId}`,
                              accessToken!,
                            ),
                          ),
                        "Application loaded",
                      )
                    }
                  >
                    View application
                  </Button>
                </div>
              ))}
            </Card>
            <ElectionProcessingAdmin election={election} accessToken={accessToken!} reload={load} />
            {results && <ResultReview result={results} />}
            {application && (
              <Card className="space-y-4">
                <div className="flex justify-between">
                  <h2 className="text-lg font-semibold">
                    {application.applicantName} — submitted application
                  </h2>
                  <Button onClick={() => setApplication(null)}>Close view</Button>
                </div>
                <FormRenderer fields={application.fields} answers={application.answers} readOnly />
              </Card>
            )}
          </>
        )
      )}
    </div>
  );
}

function PositionEditor({
  position,
  disabled,
  council,
  onSave,
  onDelete,
}: {
  position?: ElectionRecord["positions"][number];
  disabled: boolean;
  council: boolean;
  onSave: (data: unknown) => Promise<void>;
  onDelete?: () => Promise<void>;
}) {
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    void onSave({
      title: data.get("title"),
      description: data.get("description"),
      seats: council ? 1 : Number(data.get("seats")),
      displayOrder: Number(data.get("displayOrder")),
      weights: council
        ? ["STUDENT", "FACULTY", "EX_COUNCIL"].map((voterGroup) => ({
            voterGroup,
            percentage: Number(data.get(voterGroup)),
          }))
        : [],
    });
  }
  return (
    <Card>
      <form onSubmit={submit}>
        <fieldset disabled={disabled} className="space-y-3">
          <h3 className="font-medium">{position ? position.title : "Add position"}</h3>
          <label className="block text-sm">
            Position title
            <Input name="title" required maxLength={150} defaultValue={position?.title} />
          </label>
          <label className="block text-sm">
            Responsibilities
            <Textarea name="description" maxLength={5000} defaultValue={position?.description} />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            {council ? (
              <label className="text-sm">
                Seats
                <Input name="seats" value={1} readOnly aria-label="Seats" />
              </label>
            ) : (
              <label className="text-sm">
                Seats
                <Input
                  name="seats"
                  type="number"
                  min={1}
                  max={1000}
                  required
                  defaultValue={position?.seats ?? 1}
                />
              </label>
            )}
            <label className="text-sm">
              Display order
              <Input
                name="displayOrder"
                type="number"
                min={0}
                required
                defaultValue={position?.displayOrder ?? 0}
              />
            </label>
          </div>
          {council && (
            <div className="grid gap-3 sm:grid-cols-3">
              {["STUDENT", "FACULTY", "EX_COUNCIL"].map((group) => (
                <label key={group} className="text-sm">
                  {group.replace("_", " ")} (%)
                  <Input
                    name={group}
                    type="number"
                    min={0}
                    max={100}
                    step="0.01"
                    required
                    defaultValue={
                      position?.weights.find((w) => w.voterGroup === group)?.percentage ?? 0
                    }
                  />
                </label>
              ))}
            </div>
          )}
          {!disabled && (
            <div className="flex gap-2">
              <Button type="submit" variant="primary">
                {position ? "Save position" : "Add position"}
              </Button>
              {onDelete && (
                <Button type="button" variant="destructive" onClick={() => void onDelete()}>
                  Delete draft position
                </Button>
              )}
            </div>
          )}
        </fieldset>
      </form>
    </Card>
  );
}

function ResultReview({ result }: { result: ElectionResultReview }) {
  return (
    <Card className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Council result review</h2>
        <p className="text-sm text-(--color-text-secondary)">
          Version {result.version} · counted {new Date(result.countedAt).toLocaleString()} · UNVERIFIED / PENDING CERTIFICATION
        </p>
      </div>
      {result.positions.map((position) => (
        <section key={position.id} className="space-y-3 border-t border-(--color-border) pt-3">
          <div className="flex flex-wrap justify-between gap-2">
            <h3 className="font-medium">{position.positionTitle}</h3>
            <Badge variant="neutral">{position.status}</Badge>
          </div>
          <div className="grid gap-2 text-sm sm:grid-cols-3">
            {position.groups.map((group) => (
              <div key={group.voterGroup} className="rounded border border-(--color-border) p-2">
                <p className="font-medium">{group.voterGroup.replace("_", " ")}</p>
                <p>Eligible: {group.eligibleCount}; participated: {group.participationCount}</p>
                <p>Quorum: {group.quorumPercent}% ({group.quorumMet ? "met" : "failed"})</p>
                <p>NOTA: {group.notaVoteCount}; abstained: {group.abstentionCount}</p>
                <p>Scoring denominator: {group.scoringDenominator}; weight: {group.configuredWeight}%</p>
              </div>
            ))}
          </div>
          <p className="text-sm">NOTA weighted score: {String(position.notaFinalScore)}</p>
          {position.candidates.map((candidate) => (
            <div key={candidate.id} className="rounded border border-(--color-border) p-3 text-sm">
              <p className="font-medium">
                #{candidate.rawRank} {candidate.candidateName} {candidate.isProvisionalWinner ? "· provisional winner" : ""}
              </p>
              <p>Final weighted score: {String(candidate.finalScore)}</p>
              <p>
                {candidate.groups.map((group, index) => `Group ${index + 1}: ${group.rawVoteCount} raw / ${String(group.normalizedScore)}`).join(" · ")}
              </p>
            </div>
          ))}
        </section>
      ))}
    </Card>
  );
}
