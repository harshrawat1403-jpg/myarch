"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { LayoutGrid, LogOut, Search } from "lucide-react";
import { useAuth } from "@/modules/auth/client";
import { apiClient } from "@/lib/api-client";
import { useFocusTrap } from "@/lib/use-focus-trap";
import type { NavItem } from "@/components/sheet-layout";
import type { StudentSearchResultItem } from "@/modules/students";
import type { RecruiterStudentProfileDTO } from "@/modules/recruiters";
import type { Batch } from "@/modules/batches";

export interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  navItems: readonly NavItem[];
  onLogout: () => void;
}

interface PaletteEntry {
  id: string;
  section: string;
  label: string;
  hint?: string;
  onSelect: () => void;
}

/** Debounces `value`, settling `delayMs` after the last change — used so search endpoints aren't hit on every keystroke. */
function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}

/**
 * The global Ctrl+K / Cmd+K command palette — one instance, mounted by
 * `SheetLayout` so every authenticated route (admin, recruiter, student)
 * gets the same shell. Navigation entries come from the same `navItems`
 * each layout already passes to `SheetLayout` (no second icon/label
 * language invented here). Search entries call the exact same endpoints
 * the Student Management and Recruiter Portal pages already use
 * (`/api/students`, `/api/recruiters/students`) — no new API surface, no
 * fabricated results. A Secretary/Coordinator additionally gets batches,
 * filtered client-side over the same `/api/batches` list the Batch
 * Management page fetches, since that endpoint has no query support.
 * Students have nothing to search (a one-page portal), so their palette is
 * navigation-and-sign-out only, which is intentionally sparse rather than
 * padded with fake actions.
 */
export function CommandPalette({ isOpen, onClose, navItems, onLogout }: CommandPaletteProps) {
  const router = useRouter();
  const { role, accessToken } = useAuth();
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [students, setStudents] = useState<StudentSearchResultItem[]>([]);
  const [recruiterStudents, setRecruiterStudents] = useState<RecruiterStudentProfileDTO[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const debouncedQuery = useDebouncedValue(query.trim(), 250);

  useFocusTrap(isOpen, containerRef);

  // Render-time reset (not an effect) so re-opening the palette never
  // shows a stale query/selection from the last visit — the same "adjust
  // state when a prop changes" pattern SheetLayout itself uses to close
  // the mobile drawer on route change.
  const [wasOpen, setWasOpen] = useState(isOpen);
  if (isOpen !== wasOpen) {
    setWasOpen(isOpen);
    if (isOpen) {
      setQuery("");
      setActiveIndex(0);
      setStudents([]);
      setRecruiterStudents([]);
    }
  }

  async function loadBatches() {
    if (!accessToken) return;
    try {
      const result = await apiClient.get<Batch[]>("/api/batches", accessToken);
      setBatches(result);
    } catch {
      // Palette search degrades gracefully — batches simply won't appear.
    }
  }

  useEffect(() => {
    if (!isOpen || !accessToken || (role !== "SECRETARY" && role !== "COORDINATOR")) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadBatches();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, accessToken, role]);

  async function search(cancelledRef: { current: boolean }) {
    setIsSearching(true);
    try {
      if (role === "SECRETARY" || role === "COORDINATOR") {
        const results = await apiClient.get<StudentSearchResultItem[]>(
          `/api/students?name=${encodeURIComponent(debouncedQuery)}`,
          accessToken ?? undefined,
        );
        if (!cancelledRef.current) setStudents(results);
      } else if (role === "RECRUITER") {
        const results = await apiClient.get<RecruiterStudentProfileDTO[]>(
          `/api/recruiters/students?query=${encodeURIComponent(debouncedQuery)}`,
          accessToken ?? undefined,
        );
        if (!cancelledRef.current) setRecruiterStudents(results);
      }
    } catch {
      // Palette search degrades gracefully — this keystroke simply yields no results.
    } finally {
      if (!cancelledRef.current) setIsSearching(false);
    }
  }

  useEffect(() => {
    if (!isOpen || !accessToken || !debouncedQuery) return;
    const cancelledRef = { current: false };
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void search(cancelledRef);
    return () => {
      cancelledRef.current = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, debouncedQuery, accessToken, role]);

  const entries = useMemo<PaletteEntry[]>(() => {
    const lowerQuery = query.trim().toLowerCase();
    const list: PaletteEntry[] = [];

    for (const item of navItems) {
      if (lowerQuery && !item.label.toLowerCase().includes(lowerQuery)) continue;
      list.push({
        id: `nav-${item.href}`,
        section: "Navigate",
        label: item.label,
        onSelect: () => router.push(item.href),
      });
    }

    if (!lowerQuery) {
      list.push({
        id: "action-logout",
        section: "Quick Actions",
        label: "Sign out",
        onSelect: onLogout,
      });
    }

    if (lowerQuery) {
      for (const student of students) {
        list.push({
          id: `student-${student.id}`,
          section: "Students",
          label: student.fullName,
          hint: `${student.rollNumber} · ${student.batchName}`,
          onSelect: () => router.push(`/dashboard/students/${student.id}`),
        });
      }

      for (const student of recruiterStudents) {
        list.push({
          id: `recruiter-student-${student.studentId}`,
          section: "Students",
          label: student.fullName,
          hint: student.batchName,
          onSelect: () => router.push(`/recruiter/students/${student.studentId}`),
        });
      }

      for (const batch of batches) {
        if (!batch.name.toLowerCase().includes(lowerQuery) && !String(batch.year).includes(lowerQuery)) continue;
        list.push({
          id: `batch-${batch.id}`,
          section: "Batches",
          label: batch.name,
          hint: `${batch.year} · ${batch.status}`,
          onSelect: () => router.push("/dashboard/batches"),
        });
      }
    }

    return list;
  }, [navItems, query, students, recruiterStudents, batches, onLogout, router]);

  const clampedActiveIndex = entries.length === 0 ? 0 : Math.min(activeIndex, entries.length - 1);

  function commit(entry: PaletteEntry | undefined) {
    if (!entry) return;
    entry.onSelect();
    onClose();
  }

  function handleKeyDown(event: React.KeyboardEvent) {
    if (event.key === "Escape") {
      onClose();
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex(Math.min(clampedActiveIndex + 1, entries.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex(Math.max(clampedActiveIndex - 1, 0));
    } else if (event.key === "Enter") {
      event.preventDefault();
      commit(entries[clampedActiveIndex]);
    }
  }

  if (!isOpen) return null;

  const sections = [...new Set(entries.map((entry) => entry.section))];
  const canSearch = role === "SECRETARY" || role === "COORDINATOR" || role === "RECRUITER";

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-(--color-text-primary)/40 px-4 pt-[12vh]" onClick={onClose}>
      <div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        onClick={(event) => event.stopPropagation()}
        onKeyDown={handleKeyDown}
        className="w-full max-w-xl overflow-hidden rounded-lg border border-(--color-border) bg-(--color-surface) shadow-lg"
      >
        <div className="flex items-center gap-2.5 border-b border-(--color-border) px-4 py-3">
          <Search aria-hidden="true" size={17} strokeWidth={1.75} className="shrink-0 text-(--color-text-secondary)" />
          <input
            autoFocus
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={canSearch ? "Search students, batches, or jump to a page…" : "Jump to a page…"}
            aria-label="Command palette search"
            className="w-full bg-transparent text-sm text-(--color-text-primary) placeholder:text-(--color-text-secondary) focus:outline-none"
          />
          <kbd className="hidden shrink-0 rounded border border-(--color-border) px-1.5 py-0.5 font-[family-name:var(--font-data)] text-[11px] text-(--color-text-secondary) sm:block">
            Esc
          </kbd>
        </div>

        <div className="max-h-[60vh] overflow-y-auto p-2">
          {isSearching && <p className="px-3 py-2 text-xs text-(--color-text-secondary)">Searching…</p>}

          {entries.length === 0 && !isSearching && (
            <p className="px-3 py-6 text-center text-sm text-(--color-text-secondary)">No matches for &ldquo;{query}&rdquo;.</p>
          )}

          {sections.map((section) => (
            <div key={section} className="mb-1 last:mb-0">
              <p className="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wide text-(--color-text-secondary)/70">
                {section}
              </p>
              {entries
                .filter((entry) => entry.section === section)
                .map((entry) => {
                  const index = entries.indexOf(entry);
                  const isActive = index === clampedActiveIndex;
                  return (
                    <button
                      key={entry.id}
                      type="button"
                      onMouseEnter={() => setActiveIndex(index)}
                      onClick={() => commit(entry)}
                      className={`flex w-full items-center justify-between gap-3 rounded-md px-3 py-2 text-left text-sm transition-colors duration-150 ${
                        isActive
                          ? "bg-(--color-accent-soft) text-(--color-accent)"
                          : "text-(--color-text-primary) hover:bg-(--color-surface-muted)"
                      }`}
                    >
                      <span className="flex items-center gap-2 truncate">
                        {section === "Navigate" && (
                          <LayoutGrid aria-hidden="true" size={15} strokeWidth={1.75} className="shrink-0" />
                        )}
                        {section === "Quick Actions" && (
                          <LogOut aria-hidden="true" size={15} strokeWidth={1.75} className="shrink-0" />
                        )}
                        <span className="truncate">{entry.label}</span>
                      </span>
                      {entry.hint && (
                        <span className="shrink-0 truncate text-xs text-(--color-text-secondary)">{entry.hint}</span>
                      )}
                    </button>
                  );
                })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
