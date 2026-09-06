"use client";
/* eslint-disable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps -- this follows the established admin API-load pattern. */
import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/modules/auth/client";
import type { CoreCommitteeSelectionRecord } from "@/modules/selections";
import type { FormRecord } from "@/modules/forms";
import { apiClient, ApiError } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
const nextStage: Partial<Record<CoreCommitteeSelectionRecord["status"], string>> = {
  APPLICATION_CLOSED: "SCRUTINY",
  SCRUTINY: "CORRECTIONS",
  CORRECTIONS: "SHORTLIST",
  SHORTLIST: "INTERVIEWS",
  INTERVIEWS: "COUNCIL_REVIEW",
  COUNCIL_REVIEW: "SELECTION_DECIDED",
};
function local(value?: Date | null) {
  return value
    ? new Date(new Date(value).getTime() - new Date(value).getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 16)
    : "";
}
function Config({
  selection,
  busy,
  save,
}: {
  selection?: CoreCommitteeSelectionRecord;
  busy: boolean;
  save: (value: unknown) => Promise<void>;
}) {
  return (
    <form
      className="grid gap-3 sm:grid-cols-2"
      onSubmit={(event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        void save({
          title: data.get("title"),
          academicYear: data.get("academicYear"),
          applicationOpenAt: new Date(String(data.get("applicationOpenAt"))).toISOString(),
          applicationCloseAt: new Date(String(data.get("applicationCloseAt"))).toISOString(),
          correctionOpenAt: data.get("correctionOpenAt")
            ? new Date(String(data.get("correctionOpenAt"))).toISOString()
            : null,
          correctionCloseAt: data.get("correctionCloseAt")
            ? new Date(String(data.get("correctionCloseAt"))).toISOString()
            : null,
          maxPositionsPerCandidate: Number(data.get("maxPositionsPerCandidate")),
        });
      }}
    >
      <div>
        <Label htmlFor="selection-title">Selection title</Label>
        <Input id="selection-title" name="title" required defaultValue={selection?.title} />
      </div>
      <div>
        <Label htmlFor="selection-year">Academic year</Label>
        <Input
          id="selection-year"
          name="academicYear"
          required
          pattern="[0-9]{4}-[0-9]{4}"
          defaultValue={selection?.academicYear}
          placeholder="2026-2027"
        />
      </div>
      <div>
        <Label htmlFor="selection-open">Applications open</Label>
        <Input
          id="selection-open"
          name="applicationOpenAt"
          required
          type="datetime-local"
          defaultValue={local(selection?.applicationOpenAt)}
        />
      </div>
      <div>
        <Label htmlFor="selection-close">Applications close</Label>
        <Input
          id="selection-close"
          name="applicationCloseAt"
          required
          type="datetime-local"
          defaultValue={local(selection?.applicationCloseAt)}
        />
      </div>
      <div>
        <Label htmlFor="selection-correction-open">Corrections open</Label>
        <Input
          id="selection-correction-open"
          name="correctionOpenAt"
          type="datetime-local"
          defaultValue={local(selection?.correctionOpenAt)}
        />
      </div>
      <div>
        <Label htmlFor="selection-correction-close">Corrections close</Label>
        <Input
          id="selection-correction-close"
          name="correctionCloseAt"
          type="datetime-local"
          defaultValue={local(selection?.correctionCloseAt)}
        />
      </div>
      <div>
        <Label htmlFor="selection-limit">Maximum positions per candidate</Label>
        <Input
          id="selection-limit"
          name="maxPositionsPerCandidate"
          type="number"
          min={1}
          max={100}
          defaultValue={selection?.maxPositionsPerCandidate ?? 1}
        />
      </div>
      {(!selection || selection.status === "DRAFT") && (
        <Button className="self-end" disabled={busy} type="submit">
          {selection ? "Save configuration" : "Create Core Committee selection"}
        </Button>
      )}
    </form>
  );
}
export function CoreCommitteeSelectionAdmin({ id }: { id?: string }) {
  const { accessToken, role } = useAuth();
  const router = useRouter();
  const [items, setItems] = useState<CoreCommitteeSelectionRecord[]>([]);
  const [selection, setSelection] = useState<CoreCommitteeSelectionRecord | null>(null);
  const [forms, setForms] = useState<FormRecord[]>([]);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [appointmentPreview, setAppointmentPreview] = useState<{ currentCoreCommittee: { memberships: unknown[] }; selected: { position: string }[] } | null>(null);
  const load = async () => {
    if (!accessToken || role !== "SECRETARY") return;
    if (id) {
      const [detail, formRows] = await Promise.all([
        apiClient.get<CoreCommitteeSelectionRecord>(
          `/api/core-committee-selections/${id}`,
          accessToken,
        ),
        apiClient.get<FormRecord[]>("/api/forms", accessToken),
      ]);
      setSelection(detail);
      setForms(formRows);
    } else
      setItems(
        await apiClient.get<CoreCommitteeSelectionRecord[]>(
          "/api/core-committee-selections",
          accessToken,
        ),
      );
  };
  useEffect(() => {
    void load().catch((error) =>
      setMessage(
        error instanceof ApiError ? error.message : "Unable to load Core Committee selections",
      ),
    );
  }, [accessToken, role, id]);
  const act = async (operation: () => Promise<unknown>, success = "Saved") => {
    setBusy(true);
    setMessage("");
    try {
      await operation();
      await load();
      setMessage(success);
    } catch (error) {
      setMessage(
        error instanceof ApiError ? error.message : "Unable to save Core Committee selection",
      );
    } finally {
      setBusy(false);
    }
  };
  if (role !== "SECRETARY")
    return <p>Only the Secretary may administer Core Committee selections.</p>;
  return (
    <div className="max-w-5xl space-y-6">
      <div>
        <p className="text-sm text-(--color-text-secondary)">Council-led selection workflow</p>
        <h1 className="text-2xl font-semibold">
          {id ? (selection?.title ?? "Core Committee selection") : "Core Committee selections"}
        </h1>
      </div>
      {message && (
        <p role="status" className="rounded border border-(--color-border) p-3 text-sm">
          {message}
        </p>
      )}
      {!id ? (
        <>
          <Card className="space-y-4">
            <h2 className="text-lg font-semibold">Create Core Committee selection</h2>
            <Config
              busy={busy}
              save={(data) =>
                act(async () => {
                  const created = await apiClient.post<CoreCommitteeSelectionRecord>(
                    "/api/core-committee-selections",
                    data,
                    accessToken!,
                  );
                  router.push(`/dashboard/core-committee-selections/${created.id}`);
                })
              }
            />
          </Card>
          <section className="space-y-3">
            <h2 className="text-lg font-semibold">All Core Committee selections</h2>
            {!items.length && <p>No Core Committee selections yet.</p>}
            {items.map((item) => (
              <Link
                className="block"
                key={item.id}
                href={`/dashboard/core-committee-selections/${item.id}`}
              >
                <Card className="flex justify-between">
                  <div>
                    {item.title}
                    <p className="text-sm">{item.academicYear}</p>
                  </div>
                  <Badge variant="neutral">{item.status}</Badge>
                </Card>
              </Link>
            ))}
          </section>
        </>
      ) : (
        selection && (
          <>
            <Link href="/dashboard/core-committee-selections" className="text-sm underline">
              All Core Committee selections
            </Link>
            <Card className="space-y-4">
              <div className="flex flex-wrap justify-between gap-3">
                <Badge variant="neutral">{selection.status}</Badge>
                {selection.status === "DRAFT" ? (
                  <Button
                    disabled={busy}
                    onClick={() =>
                      void act(
                        () =>
                          apiClient.post(
                            `/api/core-committee-selections/${id}/status`,
                            { status: "APPLICATION_OPEN" },
                            accessToken!,
                          ),
                        "Applications opened and configuration locked",
                      )
                    }
                  >
                    Open applications
                  </Button>
                ) : selection.status === "APPLICATION_OPEN" ? (
                  <Button
                    disabled={busy}
                    onClick={() =>
                      void act(
                        () =>
                          apiClient.post(
                            `/api/core-committee-selections/${id}/status`,
                            { status: "APPLICATION_CLOSED" },
                            accessToken!,
                          ),
                        "Applications closed",
                      )
                    }
                  >
                    Close applications
                  </Button>
                ) : nextStage[selection.status] ? (
                  <Button
                    disabled={busy}
                    onClick={() =>
                      void act(
                        () =>
                          apiClient.post(
                            `/api/core-committee-selections/${id}/status`,
                            { status: nextStage[selection.status] },
                            accessToken!,
                          ),
                        `Moved to ${nextStage[selection.status]!.replaceAll("_", " ")}`,
                      )
                    }
                  >
                    Advance to {nextStage[selection.status]!.replaceAll("_", " ")}
                  </Button>
                ) : null}
                {selection.status === "SELECTION_DECIDED" && <Button disabled={busy} onClick={() => void act(() => apiClient.post(`/api/core-committee-selections/${id}/publish`, {}, accessToken!), "Core Committee result published")}>Publish selected members</Button>}
                {selection.status === "PUBLISHED" && <Button disabled={busy} onClick={() => void act(async () => setAppointmentPreview(await apiClient.get(`/api/core-committee-selections/${id}/appointment-preview`, accessToken!)), "Appointment preview loaded")}>Preview Core Committee memberships</Button>}
                {selection.status === "PUBLISHED" && appointmentPreview && <div className="text-sm">Outgoing memberships: {appointmentPreview.currentCoreCommittee.memberships.length}. New memberships: {appointmentPreview.selected.length}. <Button disabled={busy} onClick={() => void act(() => apiClient.post(`/api/core-committee-selections/${id}/appointments`, {}, accessToken!), "Core Committee memberships confirmed")}>Confirm memberships</Button></div>}
                {selection.status === "MEMBERSHIP_CONFIRMED" && <Button disabled={busy} onClick={() => void act(() => apiClient.post(`/api/core-committee-selections/${id}/archive`, {}, accessToken!), "Core Committee selection archived")}>Archive selection</Button>}
              </div>
              <p className="text-sm text-(--color-text-secondary)">
                This workflow records Council-led selection. It has no voter groups, ballots,
                quorum, or vote counting.
              </p>
              <Config
                selection={selection}
                busy={busy}
                save={(data) =>
                  act(() =>
                    apiClient.put(`/api/core-committee-selections/${id}`, data, accessToken!),
                  )
                }
              />
            </Card>
            <Card className="space-y-3">
              <h2 className="text-lg font-semibold">Application form</h2>
              <p>
                {selection.applicationForm
                  ? `${selection.applicationForm.title} (${selection.applicationForm.status})`
                  : "No form associated"}
              </p>
              {selection.status === "DRAFT" && (
                <select
                  className="w-full rounded border border-(--color-border) bg-(--color-background) p-2"
                  defaultValue={selection.applicationForm?.formId ?? ""}
                  onChange={(event) =>
                    event.target.value &&
                    void act(
                      () =>
                        apiClient.put(
                          `/api/core-committee-selections/${id}/application-form`,
                          { formId: event.target.value },
                          accessToken!,
                        ),
                      "Application form associated",
                    )
                  }
                >
                  <option value="">Choose a generic form</option>
                  {forms
                    .filter((form) => ["DRAFT", "PUBLISHED"].includes(form.status))
                    .map((form) => (
                      <option key={form.id} value={form.id}>
                        {form.title}
                      </option>
                    ))}
                </select>
              )}
            </Card>
            <Card className="space-y-3">
              <h2 className="text-lg font-semibold">Positions</h2>
              {selection.positions.map((position) => (
                <p key={position.id}>
                  {position.title} Â· {position.seats} seat{position.seats === 1 ? "" : "s"}
                </p>
              ))}
              {selection.status === "DRAFT" && (
                <form
                  className="flex gap-2"
                  onSubmit={(event) => {
                    event.preventDefault();
                    const data = new FormData(event.currentTarget);
                    void act(
                      () =>
                        apiClient.post(
                          `/api/core-committee-selections/${id}/positions`,
                          {
                            title: data.get("title"),
                            description: "",
                            seats: Number(data.get("seats")),
                            displayOrder: selection.positions.length,
                          },
                          accessToken!,
                        ),
                      "Position added",
                    );
                  }}
                >
                  <Input name="title" required placeholder="Position title" />
                  <Input name="seats" required type="number" min={1} defaultValue={1} />
                  <Button disabled={busy}>Add position</Button>
                </form>
              )}
            </Card>
          </>
        )
      )}
    </div>
  );
}
