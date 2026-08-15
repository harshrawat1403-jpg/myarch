"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { useAuth } from "@/modules/auth/client";
import { apiClient, ApiError } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge, type BadgeVariant } from "@/components/ui/badge";
import { CardTitle } from "@/components/ui/typography";
import { EmptyState } from "@/components/empty-state";

interface CalendarEntryDto {
  id: string;
  sourceModule: string;
  activityType: string;
  title: string;
  description: string | null;
  startAt: string;
  endAt: string | null;
  location: string | null;
  ownerId: string | null;
  status: string | null;
  relatedEntityType: string | null;
  relatedEntityId: string | null;
}

type ViewMode = "month" | "week" | "day" | "agenda";

const ACTIVITY_TYPE_OPTIONS = [
  { value: "", label: "All activity types" },
  { value: "TASK_DEADLINE", label: "Task deadlines" },
  { value: "EVENT", label: "Events" },
  { value: "MEETING", label: "Meetings" },
];

const ACTIVITY_BADGE: Record<string, BadgeVariant> = {
  TASK_DEADLINE: "pending",
  EVENT: "active",
  MEETING: "neutral",
};

function startOfDay(d: Date): Date {
  const r = new Date(d);
  r.setHours(0, 0, 0, 0);
  return r;
}
function endOfDay(d: Date): Date {
  const r = new Date(d);
  r.setHours(23, 59, 59, 999);
  return r;
}
function startOfWeek(d: Date): Date {
  const r = startOfDay(d);
  r.setDate(r.getDate() - r.getDay());
  return r;
}
function endOfWeek(d: Date): Date {
  const r = endOfDay(d);
  r.setDate(r.getDate() + (6 - r.getDay()));
  return r;
}
function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0);
}
function endOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
}
function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}
function addMonths(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth() + n, 1);
}
function sameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

/**
 * MYARCH Phase 3 (§4.1) — Central Activity Calendar. Aggregates every
 * registered CalendarSource (Task Engine deadlines today; Events/Meetings
 * once those modules register their own source) via GET /api/calendar. No
 * client-side business logic beyond computing the date range for the
 * selected view and grouping the flat, already-sorted entries it receives —
 * filtering/scoping/authorization all happen server-side.
 *
 * "Owner" and "status" filters are implemented (real fields on every
 * CalendarEntry). "Academic year" and "committee" from the roadmap's filter
 * list are deferred — no current source's backing data carries either
 * (Batch/Committee linkage doesn't exist on Task/Event/Meeting) — see
 * MYARCH_ROADMAP.md's Phase 3 report, KNOWN ISSUES.
 */
export default function CalendarPage() {
  const { accessToken, userId } = useAuth();

  const [view, setView] = useState<ViewMode>("month");
  const [anchor, setAnchor] = useState(() => new Date());
  const [activityType, setActivityType] = useState("");
  const [ownerId, setOwnerId] = useState("");
  const [status, setStatus] = useState("");
  const [myItemsOnly, setMyItemsOnly] = useState(false);

  const [entries, setEntries] = useState<CalendarEntryDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const range = useMemo(() => {
    if (view === "month") return { from: startOfMonth(anchor), to: endOfMonth(anchor) };
    if (view === "week") return { from: startOfWeek(anchor), to: endOfWeek(anchor) };
    if (view === "day") return { from: startOfDay(anchor), to: endOfDay(anchor) };
    return { from: startOfDay(anchor), to: endOfDay(addDays(anchor, 30)) }; // agenda: rolling 30-day window
  }, [view, anchor]);

  const load = useCallback(async () => {
    if (!accessToken) return;
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set("from", range.from.toISOString());
      params.set("to", range.to.toISOString());
      if (activityType) params.set("activityType", activityType);
      if (status) params.set("status", status);
      const effectiveOwnerId = myItemsOnly ? userId ?? "" : ownerId;
      if (effectiveOwnerId) params.set("ownerId", effectiveOwnerId);

      const res = await apiClient.get<CalendarEntryDto[]>(`/api/calendar?${params.toString()}`, accessToken);
      setEntries(res);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Unable to load the calendar.");
    } finally {
      setIsLoading(false);
    }
  }, [accessToken, range, activityType, status, ownerId, myItemsOnly, userId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const periodLabel = useMemo(() => {
    if (view === "month") return anchor.toLocaleDateString(undefined, { month: "long", year: "numeric" });
    if (view === "week") return `${range.from.toLocaleDateString()} – ${range.to.toLocaleDateString()}`;
    if (view === "day") return anchor.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" });
    return `Next 30 days from ${anchor.toLocaleDateString()}`;
  }, [view, anchor, range]);

  function navigate(direction: -1 | 1) {
    if (view === "month") setAnchor((d) => addMonths(d, direction));
    else if (view === "week") setAnchor((d) => addDays(d, direction * 7));
    else setAnchor((d) => addDays(d, direction));
  }

  const monthDays = useMemo(() => {
    if (view !== "month") return [];
    const gridStart = startOfWeek(startOfMonth(anchor));
    const gridEnd = endOfWeek(endOfMonth(anchor));
    const days: Date[] = [];
    for (let d = gridStart; d.getTime() <= gridEnd.getTime(); d = addDays(d, 1)) days.push(d);
    return days;
  }, [view, anchor]);

  const weekDays = useMemo(() => {
    if (view !== "week") return [];
    const days: Date[] = [];
    for (let i = 0; i < 7; i++) days.push(addDays(range.from, i));
    return days;
  }, [view, range]);

  function entriesOn(day: Date): CalendarEntryDto[] {
    return entries.filter((e) => sameDay(new Date(e.startAt), day));
  }

  function entryHref(entry: CalendarEntryDto): string | null {
    if (entry.sourceModule === "tasks") return `/tasks/${entry.relatedEntityId ?? entry.id.split(":")[1]}`;
    return null;
  }

  function EntryChip({ entry }: { entry: CalendarEntryDto }) {
    const href = entryHref(entry);
    const content = (
      <span className="block truncate rounded bg-(--color-accent-soft) px-1.5 py-0.5 text-xs text-(--color-accent)">
        {new Date(entry.startAt).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })} {entry.title}
      </span>
    );
    return href ? <Link href={href}>{content}</Link> : content;
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold text-(--color-text-primary)">
            Calendar
          </h1>
          <p className="mt-1 text-sm text-(--color-text-secondary)">
            Every task deadline, event, and meeting in one place.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {(["month", "week", "day", "agenda"] as ViewMode[]).map((v) => (
            <Button key={v} type="button" variant={view === v ? "primary" : "secondary"} onClick={() => setView(v)}>
              {v.charAt(0).toUpperCase() + v.slice(1)}
            </Button>
          ))}
        </div>
      </div>

      <Card>
        <div className="flex flex-wrap items-end gap-4">
          <div className="min-w-48">
            <Label htmlFor="filter-activity-type">Activity type</Label>
            <Select id="filter-activity-type" value={activityType} onChange={(e) => setActivityType(e.target.value)}>
              {ACTIVITY_TYPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </Select>
          </div>
          <div className="min-w-40">
            <Label htmlFor="filter-cal-status">Status</Label>
            <Select id="filter-cal-status" value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">Any status</option>
              <option value="TODO">To do</option>
              <option value="IN_PROGRESS">In progress</option>
              <option value="BLOCKED">Blocked</option>
              <option value="DONE">Done</option>
              <option value="CANCELLED">Cancelled</option>
              <option value="DRAFT">Draft</option>
              <option value="PUBLISHED">Published</option>
              <option value="SCHEDULED">Scheduled</option>
              <option value="COMPLETED">Completed</option>
            </Select>
          </div>
          <label className="flex items-center gap-2 pb-2.5 text-sm text-(--color-text-secondary)">
            <input type="checkbox" checked={myItemsOnly} onChange={(e) => setMyItemsOnly(e.target.checked)} />
            My items only
          </label>
        </div>
      </Card>

      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Button type="button" variant="secondary" onClick={() => navigate(-1)} aria-label="Previous period">
            <ChevronLeft aria-hidden="true" size={16} strokeWidth={1.75} />
          </Button>
          <Button type="button" variant="secondary" onClick={() => setAnchor(new Date())}>
            Today
          </Button>
          <Button type="button" variant="secondary" onClick={() => navigate(1)} aria-label="Next period">
            <ChevronRight aria-hidden="true" size={16} strokeWidth={1.75} />
          </Button>
        </div>
        <p className="text-sm font-medium text-(--color-text-primary)">{periodLabel}</p>
      </div>

      {error && <p className="text-sm text-(--color-danger)">{error}</p>}
      {isLoading && <p className="text-sm text-(--color-text-secondary)">Loading calendar…</p>}

      {!isLoading && !error && entries.length === 0 && (
        <Card>
          <EmptyState icon={CalendarDays} message="Nothing scheduled for this period." />
        </Card>
      )}

      {!isLoading && !error && entries.length > 0 && view === "month" && (
        <Card className="overflow-x-auto">
          <div className="grid min-w-[640px] grid-cols-7 gap-px bg-(--color-border)">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
              <div key={d} className="bg-(--color-surface) px-2 py-1 text-center text-xs font-medium text-(--color-text-secondary)">
                {d}
              </div>
            ))}
            {monthDays.map((day) => {
              const dayEntries = entriesOn(day);
              const inMonth = day.getMonth() === anchor.getMonth();
              return (
                <div
                  key={day.toISOString()}
                  className={`min-h-24 bg-(--color-surface) p-1.5 ${inMonth ? "" : "opacity-40"}`}
                >
                  <p className="text-xs text-(--color-text-secondary)">{day.getDate()}</p>
                  <div className="mt-1 space-y-1">
                    {dayEntries.slice(0, 3).map((entry) => (
                      <EntryChip key={entry.id} entry={entry} />
                    ))}
                    {dayEntries.length > 3 && (
                      <p className="text-xs text-(--color-text-secondary)">+{dayEntries.length - 3} more</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {!isLoading && !error && entries.length > 0 && view === "week" && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-7">
          {weekDays.map((day) => (
            <Card key={day.toISOString()}>
              <p className="text-xs font-medium text-(--color-text-secondary)">
                {day.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}
              </p>
              <div className="mt-2 space-y-1">
                {entriesOn(day).map((entry) => (
                  <EntryChip key={entry.id} entry={entry} />
                ))}
                {entriesOn(day).length === 0 && <p className="text-xs text-(--color-text-secondary)">—</p>}
              </div>
            </Card>
          ))}
        </div>
      )}

      {!isLoading && !error && entries.length > 0 && view === "day" && (
        <div className="space-y-3">
          {entries.map((entry) => (
            <EntryRow key={entry.id} entry={entry} href={entryHref(entry)} />
          ))}
        </div>
      )}

      {!isLoading && !error && entries.length > 0 && view === "agenda" && (
        <div className="space-y-6">
          {Array.from(new Set(entries.map((e) => startOfDay(new Date(e.startAt)).toISOString()))).map((dayIso) => {
            const day = new Date(dayIso);
            return (
              <div key={dayIso}>
                <p className="mb-2 text-sm font-medium text-(--color-text-primary)">
                  {day.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
                </p>
                <div className="space-y-2">
                  {entriesOn(day).map((entry) => (
                    <EntryRow key={entry.id} entry={entry} href={entryHref(entry)} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function EntryRow({ entry, href }: { entry: CalendarEntryDto; href: string | null }) {
  const body = (
    <Card className="transition-shadow duration-150 hover:shadow-md">
      <div className="flex items-start justify-between gap-2">
        <div>
          <CardTitle className={href ? "text-(--color-accent)" : undefined}>{entry.title}</CardTitle>
          <p className="mt-1 text-xs text-(--color-text-secondary)">
            {new Date(entry.startAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
            {entry.location ? ` · ${entry.location}` : ""}
          </p>
        </div>
        <Badge variant={ACTIVITY_BADGE[entry.activityType] ?? "neutral"}>{entry.activityType.replace("_", " ")}</Badge>
      </div>
    </Card>
  );
  return href ? <Link href={href}>{body}</Link> : body;
}
