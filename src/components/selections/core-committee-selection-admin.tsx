"use client";
/* eslint-disable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps -- this follows the established admin API-load pattern. */
import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/modules/auth/client";
import type { CoreCommitteeSelectionRecord } from "@/modules/selections";
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
      className="grid gap-4 sm:grid-cols-2"
      onSubmit={(event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        void save({
          title: data.get("title"),
          brief: data.get("brief"),
          academicYear: data.get("academicYear"),
          applicationOpenAt: new Date(String(data.get("applicationOpenAt"))).toISOString(),
          applicationCloseAt: new Date(String(data.get("applicationCloseAt"))).toISOString(),
        });
      }}
    >
      <div>
        <Label htmlFor="selection-title">Application form title</Label>
        <Input id="selection-title" name="title" required defaultValue={selection?.title} />
      </div>
      <div className="sm:col-span-2">
        <Label htmlFor="selection-brief">Application brief</Label>
        <textarea
          id="selection-brief"
          name="brief"
          required
          defaultValue={selection?.brief}
          className="min-h-32 w-full rounded border border-(--color-border) bg-(--color-background) p-3"
        />
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
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [appointmentPreview, setAppointmentPreview] = useState<{ currentCoreCommittee: { memberships: unknown[] }; selected: { position: string }[] } | null>(null);
  const load = async () => {
    if (!accessToken || role !== "SECRETARY") return;
    if (id) {
      const detail = await apiClient.get<CoreCommitteeSelectionRecord>(
          `/api/core-committee-selections/${id}`,
          accessToken,
        );
      setSelection(detail);
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
              <div className="flex flex-wrap gap-3 text-sm">
                <Link className="underline" href={`/dashboard/core-committee-selections/${id}/dashboard`}>Core dashboard</Link>
                <Link className="underline" href={`/dashboard/core-committee-selections/${id}/applications`}>Applications</Link>
                <Link className="underline" href={`/dashboard/core-committee-selections/${id}/shortlist`}>Shortlist</Link>
                <Link className="underline" href={`/dashboard/core-committee-selections/${id}/interviews`}>Interviews</Link>
                <Link className="underline" href={`/dashboard/core-committee-selections/${id}/results`}>Results</Link>
              </div>
              <Config
                selection={selection}
                busy={busy}
                save={(data) =>
                  act(() =>
                    apiClient.put(`/api/core-committee-selections/${id}`, data, accessToken!),
                  )
                }
              />
              {selection.status === "APPLICATION_OPEN" && (
                <form
                  className="flex flex-wrap items-end gap-3 border-t border-(--color-border) pt-4"
                  onSubmit={(event) => {
                    event.preventDefault();
                    const value = new FormData(event.currentTarget).get("newClosingDate");
                    if (!value) return;
                    void act(
                      () => apiClient.post(`/api/core-committee-selections/${id}/deadline-extension`, { newClosingDate: new Date(String(value)).toISOString() }, accessToken!),
                      "Closing date extended",
                    );
                  }}
                >
                  <div>
                    <Label htmlFor="new-close">Extend closing date</Label>
                    <Input id="new-close" name="newClosingDate" required type="datetime-local" min={local(selection.applicationCloseAt)} />
                  </div>
                  <Button disabled={busy}>Extend closing date</Button>
                </form>
              )}
            </Card>
            <Card className="space-y-3">
              <h2 className="text-lg font-semibold">Domains / positions</h2>
              {selection.positions.map((position) => (
                <div key={position.id} className="rounded border border-(--color-border) p-3">
                  <p className="font-medium">{position.title} · {position.seats} position{position.seats === 1 ? "" : "s"}</p>
                  <p className="mt-2 whitespace-pre-wrap text-sm text-(--color-text-secondary)">{position.description}</p>
                </div>
              ))}
              {selection.status === "DRAFT" && (
                <form
                  className="space-y-3 rounded border border-(--color-border) p-4"
                  onSubmit={(event) => {
                    event.preventDefault();
                    const data = new FormData(event.currentTarget);
                    void act(
                      () =>
                        apiClient.post(
                          `/api/core-committee-selections/${id}/positions`,
                          {
                            title: data.get("title"),
                            description: data.get("description"),
                            seats: Number(data.get("seats")),
                            displayOrder: selection.positions.length,
                          },
                          accessToken!,
                        ),
                      "Position added",
                    );
                  }}
                >
                  <div className="grid gap-3 sm:grid-cols-[1fr_10rem]">
                    <Input name="title" required placeholder="Domain title" />
                    <Input name="seats" required type="number" min={1} defaultValue={1} />
                  </div>
                  <textarea name="description" required placeholder="Long domain brief" className="min-h-32 w-full rounded border border-(--color-border) bg-(--color-background) p-3" />
                  <Button disabled={busy}>+ Add domain</Button>
                </form>
              )}
            </Card>
            <Card className="space-y-3 border-(--color-danger)">
              <div>
                <h2 className="text-lg font-semibold">Danger zone</h2>
                <p className="text-sm text-(--color-text-secondary)">Permanently remove this Core Committee recruitment and its selection-owned data.</p>
              </div>
              <Button
                disabled={busy || ["MEMBERSHIP_CONFIRMED", "ARCHIVED"].includes(selection.status)}
                variant="destructive"
                onClick={() => {
                  const confirmation = selection.status === "DRAFT"
                    ? window.confirm("Delete this Core Committee application form?") ? "DELETE CORE SELECTION" : ""
                    : window.prompt("Type DELETE CORE SELECTION to permanently delete this application and its responses.") ?? "";
                  if (!confirmation) return;
                  void act(async () => {
                    await apiClient.post(`/api/core-committee-selections/${id}/delete`, { confirmation }, accessToken!);
                    router.push("/dashboard/core-committee-selections");
                  }, "Core Committee application deleted");
                }}
              >
                Delete application form
              </Button>
              {["MEMBERSHIP_CONFIRMED", "ARCHIVED"].includes(selection.status) && (
                <p className="text-sm text-(--color-text-secondary)">Membership-confirmed selections remain preserved as governance history.</p>
              )}
            </Card>
          </>
        )
      )}
    </div>
  );
}
