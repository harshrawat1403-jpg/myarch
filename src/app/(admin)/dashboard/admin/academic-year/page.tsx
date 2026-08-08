"use client";

import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Layers } from "lucide-react";
import { useAuth } from "@/modules/auth/client";
import { apiClient, ApiError } from "@/lib/api-client";
import type { Batch } from "@/modules/batches";
import type { CoordinatorRecord } from "@/modules/coordinators";
import type { AcademicYearTransitionRunRecord, TransitionPlan } from "@/modules/academic-year";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Stepper, type StepperStep } from "@/components/ui/stepper";
import { EmptyState } from "@/components/empty-state";
import { useToast } from "@/components/ui/toast";

const STEPS: StepperStep[] = [
  { id: "batches", label: "Batch Transitions" },
  { id: "intake", label: "New Intake" },
  { id: "coordinators", label: "Assign Coordinators" },
  { id: "review", label: "Review & Confirm" },
  { id: "execute", label: "Execution" },
];

type StepId = (typeof STEPS)[number]["id"];

/**
 * V3.0 Administration Platform — Module 9, the largest and highest-risk of
 * the Administration Platform: batch status changes affect recruiter
 * visibility, and a new intake batch plus coordinator assignments are hard
 * to cleanly undo. A typed "CONFIRM" gate (not just a Confirm/Cancel
 * dialog) sits before execution. The wizard computes and reviews a plan
 * client-side across steps, but never persists or executes anything until
 * the Review & Confirm step's POST — every prior step is pure client state.
 * New intake student rosters are NOT uploaded inside this wizard (see the
 * Review step's note): that's the already-built Bulk Import feature on the
 * Students page, kept separate rather than duplicating file-upload/job
 * machinery inside this plan-then-execute flow.
 */
export default function AcademicYearWizardPage() {
  const { accessToken } = useAuth();
  const toast = useToast();

  const [stepId, setStepId] = useState<StepId>("batches");
  const [batches, setBatches] = useState<Batch[]>([]);
  const [coordinators, setCoordinators] = useState<CoordinatorRecord[]>([]);
  const [isLoadingReferenceData, setIsLoadingReferenceData] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [graduateBatchIds, setGraduateBatchIds] = useState<string[]>([]);
  const [archiveBatchIds, setArchiveBatchIds] = useState<string[]>([]);
  const [intakeName, setIntakeName] = useState("");
  const [intakeYear, setIntakeYear] = useState("");
  const [coordinatorIds, setCoordinatorIds] = useState<string[]>([]);

  const [plan, setPlan] = useState<TransitionPlan | null>(null);
  const [isComputingPlan, setIsComputingPlan] = useState(false);
  const [planError, setPlanError] = useState<string | null>(null);
  const [confirmationText, setConfirmationText] = useState("");
  const [isStarting, setIsStarting] = useState(false);

  const [runId, setRunId] = useState<string | null>(null);
  const [run, setRun] = useState<AcademicYearTransitionRunRecord | null>(null);
  const [pollError, setPollError] = useState<string | null>(null);

  useEffect(() => {
    if (!accessToken) return;
    Promise.all([
      apiClient.get<Batch[]>("/api/batches", accessToken),
      apiClient.get<CoordinatorRecord[]>("/api/coordinators", accessToken),
    ])
      .then(([batchResults, coordinatorResults]) => {
        setBatches(batchResults);
        setCoordinators(coordinatorResults);
      })
      .catch((err) => setLoadError(err instanceof ApiError ? err.message : "Unable to load batches/coordinators."))
      .finally(() => setIsLoadingReferenceData(false));
  }, [accessToken]);

  useEffect(() => {
    if (!runId || !accessToken) return;
    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout>;

    async function poll() {
      try {
        const result = await apiClient.get<AcademicYearTransitionRunRecord>(
          `/api/admin/academic-year/${runId}`,
          accessToken ?? undefined,
        );
        if (cancelled) return;
        setRun(result);
        if (result.status === "DRAFT" || result.status === "PENDING_CONFIRMATION" || result.status === "RUNNING") {
          timeoutId = setTimeout(poll, 1500);
        }
      } catch (err) {
        if (!cancelled) setPollError(err instanceof ApiError ? err.message : "Unable to check transition status.");
      }
    }

    void poll();
    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, [runId, accessToken]);

  const activeBatches = batches.filter((b) => b.status === "ACTIVE");
  const graduatedBatches = batches.filter((b) => b.status === "GRADUATED");

  function toggleId(list: string[], id: string, setList: (next: string[]) => void) {
    setList(list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);
  }

  const computePlan = useCallback(async () => {
    if (!accessToken) return;
    setIsComputingPlan(true);
    setPlanError(null);
    try {
      const result = await apiClient.post<TransitionPlan>(
        "/api/admin/academic-year/plan",
        {
          graduateBatchIds,
          archiveBatchIds,
          newIntake: { name: intakeName.trim(), year: Number(intakeYear) },
          coordinatorIds,
        },
        accessToken,
      );
      setPlan(result);
    } catch (err) {
      setPlanError(err instanceof ApiError ? err.message : "Unable to compute the transition plan.");
    } finally {
      setIsComputingPlan(false);
    }
  }, [accessToken, graduateBatchIds, archiveBatchIds, intakeName, intakeYear, coordinatorIds]);

  function goToStep(next: StepId) {
    if (next === "review") {
      setPlan(null);
      void computePlan();
    }
    setStepId(next);
  }

  async function handleStartTransition() {
    if (!accessToken || !plan) return;
    setIsStarting(true);
    try {
      const result = await apiClient.post<{ runId: string }>(
        "/api/admin/academic-year",
        { plan, confirmationText },
        accessToken,
      );
      setRunId(result.runId);
      setStepId("execute");
      toast.success("Academic year transition started.");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Unable to start the transition.");
    } finally {
      setIsStarting(false);
    }
  }

  const intakeYearNumber = Number(intakeYear);
  const isIntakeValid = intakeName.trim().length > 0 && Number.isInteger(intakeYearNumber) && intakeYearNumber >= 1950;

  const isFinished = run && (run.status === "COMPLETED" || run.status === "FAILED");

  return (
    <div className="max-w-3xl space-y-8">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold text-(--color-text-primary)">
          Academic Year Transition
        </h1>
        <p className="mt-1 text-sm text-(--color-text-secondary)">
          Graduate and archive batches, create the new intake batch, and assign coordinators — all in one reviewed,
          confirmed plan.
        </p>
      </div>

      <Stepper steps={STEPS} currentStepId={stepId} />

      {loadError && <p className="text-sm text-(--color-danger)">{loadError}</p>}
      {isLoadingReferenceData && <p className="text-sm text-(--color-text-secondary)">Loading…</p>}

      {!isLoadingReferenceData && stepId === "batches" && (
        <Card className="space-y-6">
          <div>
            <h2 className="font-semibold text-(--color-text-primary)">Graduate Active Batches</h2>
            <p className="mt-1 text-sm text-(--color-text-secondary)">Select any batches that have completed the program this cycle.</p>
            {activeBatches.length === 0 ? (
              <EmptyState icon={Layers} message="No active batches." />
            ) : (
              <div className="mt-3 space-y-2">
                {activeBatches.map((batch) => (
                  <Checkbox
                    key={batch.id}
                    label={`${batch.name} (${batch.year})`}
                    checked={graduateBatchIds.includes(batch.id)}
                    onChange={() => toggleId(graduateBatchIds, batch.id, setGraduateBatchIds)}
                  />
                ))}
              </div>
            )}
          </div>

          <div className="border-t border-(--color-border) pt-6">
            <h2 className="font-semibold text-(--color-text-primary)">Archive Graduated Batches</h2>
            <p className="mt-1 text-sm text-(--color-text-secondary)">Select any already-graduated batches ready for archival.</p>
            {graduatedBatches.length === 0 ? (
              <EmptyState icon={Layers} message="No graduated batches." />
            ) : (
              <div className="mt-3 space-y-2">
                {graduatedBatches.map((batch) => (
                  <Checkbox
                    key={batch.id}
                    label={`${batch.name} (${batch.year})`}
                    checked={archiveBatchIds.includes(batch.id)}
                    onChange={() => toggleId(archiveBatchIds, batch.id, setArchiveBatchIds)}
                  />
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end border-t border-(--color-border) pt-4">
            <Button type="button" variant="primary" className="gap-2" onClick={() => goToStep("intake")}>
              Next
              <ChevronRight aria-hidden="true" size={16} strokeWidth={1.75} />
            </Button>
          </div>
        </Card>
      )}

      {!isLoadingReferenceData && stepId === "intake" && (
        <Card className="space-y-4">
          <h2 className="font-semibold text-(--color-text-primary)">New Intake Batch</h2>
          <p className="text-sm text-(--color-text-secondary)">
            This creates the batch record only. To upload the incoming roster, use Bulk Import from the Students page
            once this transition completes.
          </p>
          <div>
            <Label htmlFor="intake-name">Batch Name</Label>
            <Input id="intake-name" value={intakeName} onChange={(e) => setIntakeName(e.target.value)} placeholder="e.g. B.Arch 2026" />
          </div>
          <div>
            <Label htmlFor="intake-year">Year</Label>
            <Input id="intake-year" type="number" value={intakeYear} onChange={(e) => setIntakeYear(e.target.value)} />
          </div>
          <div className="flex justify-between border-t border-(--color-border) pt-4">
            <Button type="button" variant="ghost" className="gap-2" onClick={() => goToStep("batches")}>
              <ChevronLeft aria-hidden="true" size={16} strokeWidth={1.75} />
              Back
            </Button>
            <Button type="button" variant="primary" className="gap-2" disabled={!isIntakeValid} onClick={() => goToStep("coordinators")}>
              Next
              <ChevronRight aria-hidden="true" size={16} strokeWidth={1.75} />
            </Button>
          </div>
        </Card>
      )}

      {!isLoadingReferenceData && stepId === "coordinators" && (
        <Card className="space-y-4">
          <h2 className="font-semibold text-(--color-text-primary)">Assign Coordinators</h2>
          <p className="text-sm text-(--color-text-secondary)">Select which coordinators will oversee the new intake batch.</p>
          {coordinators.length === 0 ? (
            <EmptyState icon={Layers} message="No coordinators yet." />
          ) : (
            <div className="space-y-2">
              {coordinators.map((coordinator) => (
                <Checkbox
                  key={coordinator.id}
                  label={coordinator.fullName}
                  checked={coordinatorIds.includes(coordinator.id)}
                  onChange={() => toggleId(coordinatorIds, coordinator.id, setCoordinatorIds)}
                />
              ))}
            </div>
          )}
          <div className="flex justify-between border-t border-(--color-border) pt-4">
            <Button type="button" variant="ghost" className="gap-2" onClick={() => goToStep("intake")}>
              <ChevronLeft aria-hidden="true" size={16} strokeWidth={1.75} />
              Back
            </Button>
            <Button type="button" variant="primary" className="gap-2" onClick={() => goToStep("review")}>
              Next
              <ChevronRight aria-hidden="true" size={16} strokeWidth={1.75} />
            </Button>
          </div>
        </Card>
      )}

      {stepId === "review" && (
        <Card className="space-y-5">
          <h2 className="font-semibold text-(--color-text-primary)">Review & Confirm</h2>

          {isComputingPlan && <p className="text-sm text-(--color-text-secondary)">Validating plan…</p>}
          {planError && <p className="text-sm text-(--color-danger)">{planError}</p>}

          {plan && !isComputingPlan && (
            <div className="space-y-4 text-sm">
              <div>
                <p className="font-medium text-(--color-text-primary)">Graduate ({plan.graduations.length})</p>
                {plan.graduations.length === 0 ? (
                  <p className="text-(--color-text-secondary)">None selected.</p>
                ) : (
                  <ul className="mt-1 flex flex-wrap gap-1.5">
                    {plan.graduations.map((g) => (
                      <Badge key={g.batchId} variant="pending">{g.batchName}</Badge>
                    ))}
                  </ul>
                )}
              </div>
              <div>
                <p className="font-medium text-(--color-text-primary)">Archive ({plan.archivals.length})</p>
                {plan.archivals.length === 0 ? (
                  <p className="text-(--color-text-secondary)">None selected.</p>
                ) : (
                  <ul className="mt-1 flex flex-wrap gap-1.5">
                    {plan.archivals.map((a) => (
                      <Badge key={a.batchId} variant="archived">{a.batchName}</Badge>
                    ))}
                  </ul>
                )}
              </div>
              <div>
                <p className="font-medium text-(--color-text-primary)">New Intake Batch</p>
                <p className="text-(--color-text-secondary)">
                  {plan.newIntake.name} ({plan.newIntake.year})
                </p>
              </div>
              <div>
                <p className="font-medium text-(--color-text-primary)">Coordinator Assignments ({plan.coordinatorAssignments.length})</p>
                {plan.coordinatorAssignments.length === 0 ? (
                  <p className="text-(--color-text-secondary)">None selected.</p>
                ) : (
                  <ul className="mt-1 flex flex-wrap gap-1.5">
                    {plan.coordinatorAssignments.map((c) => (
                      <Badge key={c.coordinatorId} variant="approved">{c.coordinatorName}</Badge>
                    ))}
                  </ul>
                )}
              </div>

              <div className="rounded-md border border-(--color-danger)/30 bg-(--color-danger-soft) p-4">
                <p className="text-sm font-medium text-(--color-danger)">
                  This changes batch statuses and creates records immediately once started, and cannot be automatically
                  undone. Type CONFIRM to proceed.
                </p>
                <Input
                  className="mt-3"
                  value={confirmationText}
                  onChange={(e) => setConfirmationText(e.target.value)}
                  placeholder="CONFIRM"
                  aria-label="Type CONFIRM to proceed"
                />
              </div>
            </div>
          )}

          <div className="flex justify-between border-t border-(--color-border) pt-4">
            <Button type="button" variant="ghost" className="gap-2" onClick={() => goToStep("coordinators")}>
              <ChevronLeft aria-hidden="true" size={16} strokeWidth={1.75} />
              Back
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={!plan || confirmationText !== "CONFIRM" || isStarting}
              onClick={handleStartTransition}
            >
              {isStarting ? "Starting…" : "Start Transition"}
            </Button>
          </div>
        </Card>
      )}

      {stepId === "execute" && (
        <Card className="space-y-4">
          <h2 className="font-semibold text-(--color-text-primary)">Execution</h2>
          {pollError && <p className="text-sm text-(--color-danger)">{pollError}</p>}
          {!run && <p className="text-sm text-(--color-text-secondary)">Starting…</p>}
          {run && (
            <div className="space-y-4">
              <Badge variant={run.status === "COMPLETED" ? "approved" : run.status === "FAILED" ? "rejected" : "pending"}>
                {run.status}
              </Badge>
              <ul className="space-y-2">
                {run.stepLog.map((entry, index) => (
                  <li key={index} className="flex items-start justify-between gap-3 text-sm">
                    <span className={entry.status === "FAILED" ? "text-(--color-danger)" : "text-(--color-text-primary)"}>
                      {entry.step}
                      {entry.detail && ` — ${entry.detail}`}
                    </span>
                    <Badge variant={entry.status === "COMPLETED" ? "approved" : "rejected"}>{entry.status}</Badge>
                  </li>
                ))}
              </ul>
              {!isFinished && <p className="text-sm text-(--color-text-secondary)">Running…</p>}
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
