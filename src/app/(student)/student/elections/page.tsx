"use client";
import { useEffect, useState } from "react";
import { useAuth } from "@/modules/auth/client";
import type { CandidateRecord, ElectionRecord } from "@/modules/elections";
import type { FormRecord } from "@/modules/forms";
import type { StudentFormApplicationView } from "@/modules/applications";
import { apiClient, ApiError } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FormRenderer } from "@/components/forms/form-renderer";
import { Textarea } from "@/components/ui/textarea";

type PublishedResult = {
  title: string;
  academicYear: string;
  publishedAt: string;
  positions: { positionTitle: string; selectedCandidate: string | null }[];
};

type Ballot = {
  voterGroup: string;
  participation: { status: "CAST" | "ABSTAINED"; submittedAt: string } | null;
  notaEnabled: boolean;
  positions: {
    id: string;
    title: string;
    seats: number;
    candidates: { id: string; name: string }[];
  }[];
};

export default function StudentElectionsPage() {
  const { accessToken } = useAuth();
  const [elections, setElections] = useState<ElectionRecord[]>([]);
  const [selected, setSelected] = useState<ElectionRecord | null>(null);
  const [form, setForm] = useState<FormRecord | null>(null);
  const [mine, setMine] = useState<CandidateRecord[]>([]);
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [positionIds, setPositionIds] = useState<string[]>([]);
  const [submitted, setSubmitted] = useState<StudentFormApplicationView | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [correctionStatement, setCorrectionStatement] = useState("");
  const [ballot, setBallot] = useState<Ballot | null>(null);
  const [publishedResult, setPublishedResult] = useState<PublishedResult | null>(null);
  const [verificationWorkspace, setVerificationWorkspace] = useState<{
    snapshot: { version: number; positions: { positionTitle: string; status: string; candidates: { candidateName: string; finalScore: string | number }[] }[] };
  } | null>(null);
  const [verificationNote, setVerificationNote] = useState("");
  const [ballotChoices, setBallotChoices] = useState<Record<string, string>>({});
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    if (accessToken)
      void apiClient
        .get<ElectionRecord[]>("/api/elections", accessToken)
        .then(setElections)
        .catch((error) =>
          setMessage(error instanceof ApiError ? error.message : "Unable to load elections"),
        );
  }, [accessToken]);
  async function open(election: ElectionRecord) {
    if (!accessToken) return;
    setBusy(true);
    setMessage("");
    setSelected(null);
    setForm(null);
    setSubmitted(null);
    setAnswers({});
    setPositionIds([]);
    setBallot(null);
    setPublishedResult(null);
    setVerificationWorkspace(null);
    setVerificationNote("");
    setBallotChoices({});
    try {
      const [current, candidates] = await Promise.all([
        apiClient.get<ElectionRecord>(`/api/elections/${election.id}`, accessToken),
        apiClient.get<CandidateRecord[]>(`/api/elections/${election.id}/candidates`, accessToken),
      ]);
      setSelected(current);
      setMine(candidates);
      if (current.status === "VOTING")
        setBallot(await apiClient.get<Ballot>(`/api/elections/${current.id}/ballot`, accessToken));
      if (["PUBLISHED", "MEMBERSHIP_CONFIRMED", "ARCHIVED"].includes(current.status))
        setPublishedResult(
          await apiClient.get<PublishedResult>(`/api/elections/${current.id}/published-results`, accessToken),
        );
      if (candidates[0])
        setSubmitted(
          await apiClient.get<StudentFormApplicationView>(
            `/api/applications/${candidates[0].applicationId}`,
            accessToken,
          ),
        );
      else if (current.applicationForm && current.status === "APPLICATION_OPEN")
        setForm(
          await apiClient.get<FormRecord>(
            `/api/forms/${current.applicationForm.formId}`,
            accessToken,
          ),
        );
    } catch (error) {
      setMessage(error instanceof ApiError ? error.message : "Unable to load application");
    } finally {
      setBusy(false);
    }
  }
  async function loadVerificationWorkspace() {
    if (!accessToken || !selected) return;
    setBusy(true);
    setMessage("");
    try {
      setVerificationWorkspace(
        await apiClient.get(`/api/elections/${selected.id}/verification`, accessToken),
      );
    } catch (error) {
      setMessage(error instanceof ApiError ? error.message : "You are not assigned to verify this result");
    } finally {
      setBusy(false);
    }
  }
  async function submitVerification(outcome: "VERIFIED" | "FAILED_VERIFICATION") {
    if (!accessToken || !selected) return;
    setBusy(true);
    setMessage("");
    try {
      await apiClient.post(
        `/api/elections/${selected.id}/verification`,
        { outcome, ...(verificationNote.trim() ? { note: verificationNote.trim() } : {}) },
        accessToken,
      );
      await open(selected);
      setMessage(outcome === "VERIFIED" ? "Result verification submitted." : "Verification failure recorded.");
    } catch (error) {
      setMessage(error instanceof ApiError ? error.message : "Unable to submit verification");
    } finally {
      setBusy(false);
    }
  }
  async function submitBallot() {
    if (!accessToken || !selected || !ballot) return;
    setBusy(true);
    setMessage("");
    try {
      await apiClient.post(
        `/api/elections/${selected.id}/ballot`,
        {
          choices: ballot.positions.map((position) =>
            ballotChoices[position.id] === "NOTA"
              ? { positionId: position.id, isNota: true }
              : { positionId: position.id, candidateId: ballotChoices[position.id] },
          ),
        },
        accessToken,
      );
      await open(selected);
      setMessage("Your ballot has been submitted.");
    } catch (error) {
      setMessage(error instanceof ApiError ? error.message : "Unable to submit ballot");
    } finally {
      setBusy(false);
    }
  }
  async function abstain() {
    if (!accessToken || !selected) return;
    setBusy(true);
    setMessage("");
    try {
      await apiClient.post(`/api/elections/${selected.id}/abstain`, {}, accessToken);
      await open(selected);
      setMessage("Your abstention has been recorded.");
    } catch (error) {
      setMessage(error instanceof ApiError ? error.message : "Unable to record abstention");
    } finally {
      setBusy(false);
    }
  }
  async function submit() {
    if (!accessToken || !form || !selected) return;
    setBusy(true);
    setMessage("");
    try {
      await apiClient.post(
        `/api/forms/${form.id}/applications`,
        { answers, electionPositionIds: positionIds },
        accessToken,
      );
      await open(selected);
      setMessage("Application received. Your candidacy and selected positions have been recorded.");
    } catch (error) {
      setMessage(error instanceof ApiError ? error.message : "Unable to submit application");
    } finally {
      setBusy(false);
    }
  }
  async function candidateAction(
    candidateId: string,
    path: string,
    payload: unknown,
    success: string,
  ) {
    if (!accessToken || !selected) return;
    setBusy(true);
    setMessage("");
    try {
      await apiClient.post(
        `/api/elections/${selected.id}/candidates/${candidateId}/${path}`,
        payload,
        accessToken,
      );
      await open(selected);
      setMessage(success);
    } catch (error) {
      setMessage(error instanceof ApiError ? error.message : "Unable to update candidacy");
    } finally {
      setBusy(false);
    }
  }
  const withinWindow =
    selected &&
    selected.status === "APPLICATION_OPEN" &&
    new Date(selected.applicationOpenAt).getTime() <= now &&
    now < new Date(selected.applicationCloseAt).getTime();
  return (
    <div className="max-w-4xl space-y-6">
      <h1 className="text-2xl font-semibold">Elections</h1>
      <p className="text-sm text-(--color-text-secondary)">
        Active students may apply, including current Council members.
      </p>
      {message && (
        <p role="status" className="rounded border border-(--color-border) p-3">
          {message}
        </p>
      )}
      <div className="space-y-3">
        {!elections.length && <p>No elections available.</p>}
        {elections.map((election) => (
          <Card key={election.id} className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-medium">{election.title}</p>
              <p className="text-sm">
                {election.academicYear} · Applications due{" "}
                {new Date(election.applicationCloseAt).toLocaleString()}
              </p>
            </div>
            <Button disabled={busy} onClick={() => void open(election)}>
              View election and my application
            </Button>
          </Card>
        ))}
      </div>
      {selected && (
        <Card className="space-y-5">
          <div>
            <h2 className="text-xl font-semibold">{selected.title}</h2>
            <Badge variant="neutral">{selected.status}</Badge>
          </div>
          <p className="text-sm">
            Applications: {new Date(selected.applicationOpenAt).toLocaleString()} –{" "}
            {new Date(selected.applicationCloseAt).toLocaleString()}
          </p>
          <section className="space-y-3">
            <h3 className="font-medium">Positions</h3>
            {selected.positions.map((position) => (
              <div key={position.id}>
                <p className="font-medium">
                  {position.title} · {position.seats} seat(s)
                </p>
                <p className="text-sm whitespace-pre-wrap">{position.description}</p>
                {selected.type === "COUNCIL" && (
                  <p className="text-sm text-(--color-text-secondary)">
                    {position.weights
                      .map(
                        (weight) => `${weight.voterGroup.replace("_", " ")}: ${weight.percentage}%`,
                      )
                      .join(" · ")}
                  </p>
                )}
              </div>
            ))}
          </section>
          {ballot && (
            <section className="space-y-4 border-t border-(--color-border) pt-4">
              <div>
                <h3 className="font-medium">Council ballot</h3>
                <p className="text-sm">
                  Your voter group: {ballot.voterGroup.replace("_", " ")}. Ballot choices are secret
                  and cannot be retrieved after submission.
                </p>
              </div>
              {ballot.participation ? (
                <p>
                  You have{" "}
                  {ballot.participation.status === "CAST" ? "submitted a ballot" : "abstained"}.
                </p>
              ) : (
                <>
                  {ballot.positions.map((position) => (
                    <fieldset key={position.id} className="space-y-2">
                      <legend className="font-medium">{position.title}</legend>
                      {position.candidates.map((candidate) => (
                        <label key={candidate.id} className="flex gap-2">
                          <input
                            type="radio"
                            name={position.id}
                            checked={ballotChoices[position.id] === candidate.id}
                            onChange={() =>
                              setBallotChoices({ ...ballotChoices, [position.id]: candidate.id })
                            }
                          />
                          {candidate.name}
                        </label>
                      ))}
                      {ballot.notaEnabled && (
                        <label className="flex gap-2">
                          <input
                            type="radio"
                            name={position.id}
                            checked={ballotChoices[position.id] === "NOTA"}
                            onChange={() =>
                              setBallotChoices({ ...ballotChoices, [position.id]: "NOTA" })
                            }
                          />
                          None of the above
                        </label>
                      )}
                    </fieldset>
                  ))}
                  <div className="flex gap-2">
                    <Button
                      disabled={
                        busy || ballot.positions.some((position) => !ballotChoices[position.id])
                      }
                      onClick={() => void submitBallot()}
                    >
                      Submit secret ballot
                    </Button>
                    <Button disabled={busy} variant="secondary" onClick={() => void abstain()}>
                      Abstain
                    </Button>
                  </div>
                </>
              )}
            </section>
          )}
          {(["COUNTING", "RESULT_REVIEW", "VERIFICATION", "CERTIFIED"].includes(selected.status)) && (
            <p className="rounded border border-(--color-border) p-3 text-sm">
              Voting is closed. Results are pending verification and publication.
            </p>
          )}
          {selected.status === "VERIFICATION" && (
            <section className="space-y-3 rounded border border-(--color-border) p-4">
              <h3 className="font-medium">Assigned verifier workspace</h3>
              {!verificationWorkspace ? (
                <Button disabled={busy} onClick={() => void loadVerificationWorkspace()}>
                  Open assigned verification workspace
                </Button>
              ) : (
                <>
                  <p className="text-sm">Review the aggregate, immutable result snapshot. Individual ballots are never available here.</p>
                  {verificationWorkspace.snapshot.positions.map((position) => (
                    <div key={position.positionTitle} className="text-sm">
                      <p className="font-medium">{position.positionTitle} · {position.status}</p>
                      <p>{position.candidates.map((candidate) => `${candidate.candidateName}: ${candidate.finalScore}`).join(" · ")}</p>
                    </div>
                  ))}
                  <Textarea value={verificationNote} onChange={(event) => setVerificationNote(event.target.value)} placeholder="Verification summary or failure reason" maxLength={5000} />
                  <div className="flex gap-2">
                    <Button disabled={busy} onClick={() => void submitVerification("VERIFIED")}>Verify result</Button>
                    <Button disabled={busy} variant="destructive" onClick={() => void submitVerification("FAILED_VERIFICATION")}>Fail verification</Button>
                  </div>
                </>
              )}
            </section>
          )}
          {publishedResult && (
            <section className="space-y-3 rounded border border-(--color-border) p-4">
              <div>
                <h3 className="font-medium">Published Council result</h3>
                <p className="text-sm">Published {new Date(publishedResult.publishedAt).toLocaleString()}</p>
              </div>
              {publishedResult.positions.map((position) => (
                <p key={position.positionTitle} className="text-sm">
                  <strong>{position.positionTitle}:</strong> {position.selectedCandidate}
                </p>
              ))}
            </section>
          )}
          {mine.length ? (
            <section className="space-y-4">
              <h3 className="font-medium">My candidacy</h3>
              {mine.map((candidate) => (
                <div key={candidate.id} className="space-y-2">
                  <p>
                    {candidate.status} · {candidate.positions.map((p) => p.title).join(", ")}
                  </p>
                  {candidate.status === "CORRECTION_REQUIRED" &&
                    selected.status === "CORRECTIONS_OBJECTIONS" && (
                      <div className="space-y-2">
                        <Textarea
                          value={correctionStatement}
                          onChange={(event) => setCorrectionStatement(event.target.value)}
                          placeholder="Explain the correction and cite permitted evidence."
                        />
                        <Button
                          disabled={busy || !correctionStatement.trim()}
                          onClick={() =>
                            void candidateAction(
                              candidate.id,
                              "corrections",
                              { statement: correctionStatement.trim() },
                              "Correction submitted for review",
                            )
                          }
                        >
                          Submit correction
                        </Button>
                      </div>
                    )}
                  {["SCRUTINY", "CORRECTIONS_OBJECTIONS", "SHORTLIST", "INTERVIEWS"].includes(
                    selected.status,
                  ) &&
                    candidate.status !== "WITHDRAWN" && (
                      <Button
                        disabled={busy}
                        variant="destructive"
                        onClick={() =>
                          void candidateAction(candidate.id, "withdraw", {}, "Candidacy withdrawn")
                        }
                      >
                        Withdraw candidacy
                      </Button>
                    )}
                </div>
              ))}
              {submitted && (
                <FormRenderer fields={submitted.fields} answers={submitted.answers} readOnly />
              )}
            </section>
          ) : withinWindow && form ? (
            <form
              onSubmit={(event) => {
                event.preventDefault();
                void submit();
              }}
              className="space-y-5"
            >
              <fieldset disabled={busy} className="space-y-5">
                <legend className="font-medium">
                  Apply for up to {selected.maxPositionsPerCandidate} position(s)
                </legend>
                {selected.positions.map((position) => (
                  <label key={position.id} className="flex gap-2">
                    <input
                      type="checkbox"
                      checked={positionIds.includes(position.id)}
                      onChange={(event) =>
                        setPositionIds(
                          event.target.checked
                            ? [...positionIds, position.id]
                            : positionIds.filter((id) => id !== position.id),
                        )
                      }
                    />
                    {position.title}
                  </label>
                ))}
                <FormRenderer
                  fields={form.fields}
                  answers={answers}
                  onChange={(key, value) => setAnswers({ ...answers, [key]: value })}
                />
                <Button
                  type="submit"
                  variant="primary"
                  disabled={
                    !positionIds.length || positionIds.length > selected.maxPositionsPerCandidate
                  }
                >
                  Submit election application
                </Button>
              </fieldset>
            </form>
          ) : (
            <p>Applications are currently closed. Your existing candidacy remains visible here.</p>
          )}
        </Card>
      )}
    </div>
  );
}
