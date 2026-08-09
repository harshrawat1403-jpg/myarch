"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { Bell, CheckCheck } from "lucide-react";
import { useAuth } from "@/modules/auth/client";
import { apiClient, ApiError } from "@/lib/api-client";
import { useFocusTrap } from "@/lib/use-focus-trap";
import { EmptyState } from "@/components/empty-state";
import type { InAppNotificationDTO } from "@/modules/notifications";

const POLL_INTERVAL_MS = 60_000;

/**
 * V4.0 E1 (§12) — the concrete backing for the bell SheetLayout's header
 * reserved as a literal "not yet available" placeholder since Version 2.0.
 * No websockets (§24 Q6, explicitly default-approved): refreshes on mount,
 * on navigation (the `pathname` dependency below), and on a 60s interval —
 * the same `apiClient` polling pattern every other page already uses, not
 * new plumbing. Reuses `UserMenu`'s exact dropdown interaction contract
 * (`useFocusTrap`, Escape-to-close, `absolute right-0` panel) rather than
 * inventing a second dropdown pattern next to it in the same header.
 */
export function NotificationBell() {
  const { accessToken } = useAuth();
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<InAppNotificationDTO[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const panelRef = useRef<HTMLDivElement>(null);

  useFocusTrap(isOpen, panelRef);

  const load = useCallback(async () => {
    if (!accessToken) return;
    try {
      const result = await apiClient.get<InAppNotificationDTO[]>("/api/notifications", accessToken);
      setNotifications(result);
    } catch {
      // Best-effort — a failed poll just leaves the last-known list showing.
    } finally {
      setIsLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    // load() only sets state after its own awaited fetch resolves, and is
    // also called from handleMarkRead's error-recovery path below — the
    // same shared-reload pattern used by student-applications-page.tsx.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load, pathname]);

  useEffect(() => {
    const interval = setInterval(() => void load(), POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [load]);

  useEffect(() => {
    if (!isOpen) return;
    function handleKeyDown(event: KeyboardEvent): void {
      if (event.key === "Escape") setIsOpen(false);
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  async function handleMarkRead(id: string) {
    if (!accessToken) return;
    // Optimistic — this is a low-stakes, purely personal read/unread flip;
    // a failed request just gets corrected on the next poll.
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
    try {
      await apiClient.patch(`/api/notifications/${id}/read`, undefined, accessToken);
    } catch (err) {
      if (err instanceof ApiError) void load();
    }
  }

  async function handleMarkAllRead() {
    const unread = notifications.filter((n) => !n.isRead);
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    await Promise.all(unread.map((n) => handleMarkRead(n.id)));
  }

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <div className="relative">
      <button
        type="button"
        aria-expanded={isOpen}
        aria-controls="notification-panel"
        aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : "Notifications"}
        onClick={() => setIsOpen((open) => !open)}
        className="relative hidden h-9 w-9 items-center justify-center rounded-md text-(--color-text-secondary) transition-colors duration-150 hover:bg-(--color-surface-muted) hover:text-(--color-text-primary) focus:outline-none focus-visible:ring-2 focus-visible:ring-(--color-accent) sm:flex"
      >
        <Bell aria-hidden="true" size={18} strokeWidth={1.75} />
        {unreadCount > 0 && (
          <span aria-hidden="true" className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-(--color-danger)" />
        )}
      </button>

      {isOpen && (
        <div
          id="notification-panel"
          ref={panelRef}
          className="absolute right-0 z-10 mt-2 w-80 max-w-[calc(100vw-2rem)] rounded-md border border-(--color-border) bg-(--color-surface) shadow-lg"
        >
          <div className="flex items-center justify-between gap-2 border-b border-(--color-border) px-3 py-2">
            <span className="text-sm font-medium text-(--color-text-primary)">Notifications</span>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={() => void handleMarkAllRead()}
                className="flex items-center gap-1 text-xs font-medium text-(--color-accent) transition-colors duration-150 hover:underline"
              >
                <CheckCheck aria-hidden="true" size={13} strokeWidth={2} />
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto p-1">
            {isLoading ? (
              <p className="px-3 py-4 text-center text-sm text-(--color-text-secondary)">Loading…</p>
            ) : notifications.length === 0 ? (
              <div className="px-2 py-2">
                <EmptyState icon={Bell} message="No notifications yet." />
              </div>
            ) : (
              <ul className="space-y-0.5">
                {notifications.map((notification) => (
                  <li key={notification.id}>
                    <button
                      type="button"
                      onClick={() => !notification.isRead && void handleMarkRead(notification.id)}
                      className={`flex w-full flex-col items-start gap-0.5 rounded-md px-3 py-2 text-left transition-colors duration-150 hover:bg-(--color-surface-muted) ${
                        notification.isRead ? "" : "bg-(--color-accent-soft)"
                      }`}
                    >
                      <span className="flex w-full items-center gap-2">
                        {!notification.isRead && (
                          <span aria-hidden="true" className="h-1.5 w-1.5 shrink-0 rounded-full bg-(--color-accent)" />
                        )}
                        <span className="truncate text-sm font-medium text-(--color-text-primary)">{notification.title}</span>
                      </span>
                      <span className="text-xs text-(--color-text-secondary)">{notification.message}</span>
                      <span className="text-[11px] text-(--color-text-secondary)">
                        {new Date(notification.createdAt).toLocaleString()}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
