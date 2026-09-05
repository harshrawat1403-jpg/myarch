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
    try {
      const [current, candidates] = await Promise.all([
        apiClient.get<ElectionRecord>(`/api/elections/${election.id}`, accessToken),
        apiClient.get<CandidateRecord[]>(`/api/elections/${election.id}/candidates`, accessToken),
      ]);
      setSelected(current);
      setMine(candidates);
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
  async function candidateAction(candidateId: string, path: string, payload: unknown, success: string) {
    if (!accessToken || !selected) return;
    setBusy(true); setMessage("");
    try { await apiClient.post(`/api/elections/${selected.id}/candidates/${candidateId}/${path}`, payload, accessToken); await open(selected); setMessage(success); }
    catch (error) { setMessage(error instanceof ApiError ? error.message : "Unable to update candidacy"); }
    finally { setBusy(false); }
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
          {mine.length ? (
            <section className="space-y-4">
              <h3 className="font-medium">My candidacy</h3>
              {mine.map((candidate) => (
                <div key={candidate.id} className="space-y-2">
                  <p>{candidate.status} · {candidate.positions.map((p) => p.title).join(", ")}</p>
                  {candidate.status === "CORRECTION_REQUIRED" && selected.status === "CORRECTIONS_OBJECTIONS" && <div className="space-y-2"><Textarea value={correctionStatement} onChange={(event) => setCorrectionStatement(event.target.value)} placeholder="Explain the correction and cite permitted evidence." /><Button disabled={busy || !correctionStatement.trim()} onClick={() => void candidateAction(candidate.id, "corrections", { statement: correctionStatement.trim() }, "Correction submitted for review")}>Submit correction</Button></div>}
                  {["SCRUTINY", "CORRECTIONS_OBJECTIONS", "SHORTLIST", "INTERVIEWS"].includes(selected.status) && candidate.status !== "WITHDRAWN" && <Button disabled={busy} variant="destructive" onClick={() => void candidateAction(candidate.id, "withdraw", {}, "Candidacy withdrawn")}>Withdraw candidacy</Button>}
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
