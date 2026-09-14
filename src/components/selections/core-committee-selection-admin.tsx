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
function local(value?: Date | null) {
  return value
    ? new Date(new Date(value).getTime() - new Date(value).getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 16)
    : "";
}
function PositionQuestions({
  position,
  selectionId,
  accessToken,
  busy,
  onSaved,
}: {
  position: CoreCommitteeSelectionRecord["positions"][number];
  selectionId: string;
  accessToken: string;
  busy: boolean;
  onSaved: () => void;
}) {
  const [questions, setQuestions] = useState(
    position.questions.map((question) => ({
      key: question.key,
      label: question.label,
      type: question.type,
      required: question.required,
      options: question.options.join(", "),
    })),
  );
  return (
    <div className="mt-3 space-y-2 border-t border-(--color-border) pt-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">Questions for this domain</p>
        <Button
          type="button"
          variant="secondary"
          disabled={busy || questions.length >= 20}
          onClick={() =>
            setQuestions((items) => [
              ...items,
              {
                key: `question_${items.length + 1}`,
                label: "",
                type: "LONG_TEXT" as const,
                required: true,
                options: "",
              },
            ])
          }
        >
          Add question
        </Button>
      </div>
      {questions.map((question, index) => (
        <div key={`${question.key}-${index}`} className="grid gap-2 sm:grid-cols-[1fr_9rem_auto]">
          <Input
            aria-label={`Question ${index + 1} label`}
            placeholder="Question prompt"
            required
            value={question.label}
            onChange={(event) =>
              setQuestions((items) =>
                items.map((item, itemIndex) =>
                  itemIndex === index ? { ...item, label: event.target.value } : item,
                ),
              )
            }
          />
          <select
            aria-label={`Question ${index + 1} type`}
            value={question.type}
            className="rounded border border-(--color-border) p-2"
            onChange={(event) =>
              setQuestions((items) =>
                items.map((item, itemIndex) =>
                  itemIndex === index
                    ? { ...item, type: event.target.value as typeof item.type }
                    : item,
                ),
              )
            }
          >
            <option value="LONG_TEXT">Long text</option>
            <option value="TEXT">Short text</option>
            <option value="DROPDOWN">Dropdown</option>
            <option value="RADIO">Single choice</option>
            <option value="CHECKBOX">Checkbox</option>
            <option value="NUMBER">Number</option>
            <option value="DATE">Date</option>
          </select>
          <Button
            type="button"
            variant="ghost"
            onClick={() => setQuestions((items) => items.filter((_, i) => i !== index))}
          >
            Remove
          </Button>
          <Input
            aria-label={`Question ${index + 1} key`}
            pattern="[a-z][a-z0-9_]*"
            required
            value={question.key}
            placeholder="answer_key"
            onChange={(event) =>
              setQuestions((items) =>
                items.map((item, itemIndex) =>
                  itemIndex === index ? { ...item, key: event.target.value } : item,
                ),
              )
            }
          />
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={question.required}
              onChange={(event) =>
                setQuestions((items) =>
                  items.map((item, itemIndex) =>
                    itemIndex === index ? { ...item, required: event.target.checked } : item,
                  ),
                )
              }
            />
            Required
          </label>
          {(question.type === "DROPDOWN" || question.type === "RADIO") && (
            <Input
              className="sm:col-span-2"
              placeholder="Option one, Option two"
              value={question.options}
              onChange={(event) =>
                setQuestions((items) =>
                  items.map((item, itemIndex) =>
                    itemIndex === index ? { ...item, options: event.target.value } : item,
                  ),
                )
              }
            />
          )}
        </div>
      ))}
      {!questions.length && (
        <p className="text-sm text-(--color-text-secondary)">No questions configured.</p>
      )}
      <Button
        type="button"
        disabled={busy}
        onClick={async () => {
          await apiClient.put(
            `/api/core-committee-selections/${selectionId}/positions/${position.id}`,
            {
              title: position.title,
              description: position.description,
              seats: position.seats,
              displayOrder: position.displayOrder,
              questions: questions.map((question, displayOrder) => ({
                ...question,
                displayOrder,
                options: question.options
                  .split(",")
                  .map((item) => item.trim())
                  .filter(Boolean),
              })),
            },
            accessToken,
          );
          onSaved();
        }}
      >
        Save domain questions
      </Button>
    </div>
  );
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
        <p className="text-sm text-(--color-text-secondary)">Secretary-managed selection</p>
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
                ) : null}
              </div>
              <div className="flex flex-wrap gap-3 text-sm">
                <Link
                  className="underline"
                  href={`/dashboard/core-committee-selections/${id}/dashboard`}
                >
                  Core dashboard
                </Link>
                <Link
                  className="underline"
                  href={`/dashboard/core-committee-selections/${id}/applications`}
                >
                  Applications
                </Link>
                <Link
                  className="underline"
                  href={`/dashboard/core-committee-selections/${id}/shortlist`}
                >
                  Shortlist
                </Link>
                <Link
                  className="underline"
                  href={`/dashboard/core-committee-selections/${id}/interviews`}
                >
                  Interviews
                </Link>
                <Link
                  className="underline"
                  href={`/dashboard/core-committee-selections/${id}/results`}
                >
                  Results
                </Link>
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
                      () =>
                        apiClient.post(
                          `/api/core-committee-selections/${id}/deadline-extension`,
                          { newClosingDate: new Date(String(value)).toISOString() },
                          accessToken!,
                        ),
                      "Closing date extended",
                    );
                  }}
                >
                  <div>
                    <Label htmlFor="new-close">Extend closing date</Label>
                    <Input
                      id="new-close"
                      name="newClosingDate"
                      required
                      type="datetime-local"
                      min={local(selection.applicationCloseAt)}
                    />
                  </div>
                  <Button disabled={busy}>Extend closing date</Button>
                </form>
              )}
            </Card>
            <Card className="space-y-3">
              <h2 className="text-lg font-semibold">Domains / positions</h2>
              {selection.positions.map((position) => (
                <div key={position.id} className="rounded border border-(--color-border) p-3">
                  <p className="font-medium">
                    {position.title} · {position.seats} position{position.seats === 1 ? "" : "s"}
                  </p>
                  <p className="mt-2 whitespace-pre-wrap text-sm text-(--color-text-secondary)">
                    {position.description}
                  </p>
                  {selection.status === "DRAFT" && accessToken && (
                    <PositionQuestions
                      position={position}
                      selectionId={id}
                      accessToken={accessToken}
                      busy={busy}
                      onSaved={() => void load()}
                    />
                  )}
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
                  <textarea
                    name="description"
                    required
                    placeholder="Long domain brief"
                    className="min-h-32 w-full rounded border border-(--color-border) bg-(--color-background) p-3"
                  />
                  <Button disabled={busy}>+ Add domain</Button>
                </form>
              )}
            </Card>
            <Card className="space-y-3 border-(--color-danger)">
              <div>
                <h2 className="text-lg font-semibold">Danger zone</h2>
                <p className="text-sm text-(--color-text-secondary)">
                  Permanently remove this Core Committee recruitment and its selection-owned data.
                </p>
              </div>
              <Button
                disabled={busy || ["MEMBERSHIP_CONFIRMED", "ARCHIVED"].includes(selection.status)}
                variant="destructive"
                onClick={() => {
                  const confirmation =
                    selection.status === "DRAFT"
                      ? window.confirm("Delete this Core Committee application form?")
                        ? "DELETE CORE SELECTION"
                        : ""
                      : (window.prompt(
                          "Type DELETE CORE SELECTION to permanently delete this application and its responses.",
                        ) ?? "");
                  if (!confirmation) return;
                  void act(async () => {
                    await apiClient.post(
                      `/api/core-committee-selections/${id}/delete`,
                      { confirmation },
                      accessToken!,
                    );
                    router.push("/dashboard/core-committee-selections");
                  }, "Core Committee application deleted");
                }}
              >
                Delete application form
              </Button>
              {["MEMBERSHIP_CONFIRMED", "ARCHIVED"].includes(selection.status) && (
                <p className="text-sm text-(--color-text-secondary)">
                  Membership-confirmed selections remain preserved as governance history.
                </p>
              )}
            </Card>
          </>
        )
      )}
    </div>
  );
}
