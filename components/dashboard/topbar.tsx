"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, Menu, Plus, Search, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSidebarStore } from "@/lib/store/sidebar-store";
import { extractRoomId, formatRelativeTime, meetingLobbyPath } from "@/lib/utils/format";
import { useAuth } from "@/lib/hooks/use-auth";
import {
  listMeetings,
  listNotifications,
  listRecordings,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/lib/api";

interface TopbarProps {
  title?: string;
  onJoin?: () => void;
  onSchedule?: () => void;
  onNewMeeting?: () => void;
}

const SOON_WINDOW_MS = 60 * 60_000;
const RECENT_RECORDING_MS = 24 * 3600_000;

export function Topbar({ title, onJoin, onSchedule, onNewMeeting }: TopbarProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const setMobileOpen = useSidebarStore((s) => s.setMobileOpen);
  const [query, setQuery] = useState("");
  const [notifyOpen, setNotifyOpen] = useState(false);
  const { user } = useAuth();

  const notificationsQuery = useQuery({
    queryKey: ["notifications"],
    queryFn: () => listNotifications({ limit: 20 }),
    enabled: Boolean(user?.id) && !user?.isGuest,
    refetchInterval: notifyOpen ? 15_000 : 60_000,
  });

  const meetingsQuery = useQuery({
    queryKey: ["meetings", user?.id],
    queryFn: () => listMeetings(user!.id),
    enabled: Boolean(user?.id) && notifyOpen,
  });
  const recordingsQuery = useQuery({
    queryKey: ["recordings"],
    queryFn: listRecordings,
    enabled: Boolean(user?.id) && notifyOpen,
  });

  const markAllMutation = useMutation({
    mutationFn: markAllNotificationsRead,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const now = Date.now();
  const apiItems = notificationsQuery.data?.items ?? [];
  const unreadApi = apiItems.filter((n) => !n.readAt);
  const upcomingSoon = (meetingsQuery.data ?? []).filter((m) => {
    if (m.status !== "scheduled" || !m.scheduledAt) return false;
    const delta = new Date(m.scheduledAt).getTime() - now;
    return delta >= 0 && delta <= SOON_WINDOW_MS;
  });
  const recentRecordings = (recordingsQuery.data ?? []).filter((r) => {
    if (r.status !== "ready") return false;
    return now - new Date(r.createdAt).getTime() <= RECENT_RECORDING_MS;
  });
  const hasNotifications =
    unreadApi.length > 0 || upcomingSoon.length > 0 || recentRecordings.length > 0;

  return (
    <header
      className="sticky top-0 z-20 flex h-14 shrink-0 items-center gap-3 border-b px-3 backdrop-blur-md md:px-5"
      style={{
        borderColor: "var(--border)",
        background: "var(--topbar)",
      }}
    >
      <button
        type="button"
        className="inline-flex rounded-lg p-2 ms-text-muted hover:bg-[var(--hover)] lg:hidden"
        aria-label="Open menu"
        onClick={() => setMobileOpen(true)}
      >
        <Menu className="h-5 w-5" />
      </button>

      {title ? (
        <h1 className="ms-text-heading hidden text-sm font-semibold sm:block md:text-base">
          {title}
        </h1>
      ) : null}

      <form
        className="ml-auto flex min-w-0 flex-1 items-center gap-2 sm:ml-0 sm:max-w-lg"
        onSubmit={(e) => {
          e.preventDefault();
          const id = extractRoomId(query);
          if (id) router.push(meetingLobbyPath(id));
          else if (query.trim())
            router.push(
              `/dashboard/meetings?q=${encodeURIComponent(query.trim())}`,
            );
        }}
      >
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search meetings or enter a code…"
            className="ms-input h-9 rounded-xl border-[var(--border)] bg-[color-mix(in_srgb,var(--surface)_80%,transparent)] pl-10 shadow-sm"
            aria-label="Search"
          />
        </div>
      </form>

      <div className="flex items-center gap-1.5 sm:gap-2">
        <div className="relative">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Notifications"
            className="rounded-xl"
            onClick={() => setNotifyOpen((v) => !v)}
          >
            <Bell className="h-4 w-4" />
            {hasNotifications ? (
              <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-[var(--accent)] ring-2 ring-[var(--surface)]" />
            ) : null}
          </Button>
          {notifyOpen ? (
            <div
              className="absolute right-0 top-11 z-30 w-80 overflow-hidden rounded-2xl border p-2"
              style={{
                borderColor: "var(--border)",
                background: "var(--surface)",
                boxShadow: "var(--shadow-lift)",
              }}
            >
              <div className="flex items-center justify-between px-2 py-1.5">
                <p className="ms-text-muted text-xs font-semibold uppercase tracking-wide">
                  Notifications
                </p>
                {unreadApi.length > 0 ? (
                  <button
                    type="button"
                    className="text-xs text-[var(--accent)]"
                    onClick={() => markAllMutation.mutate()}
                  >
                    Mark all read
                  </button>
                ) : null}
              </div>
              {notificationsQuery.isLoading ||
              meetingsQuery.isLoading ||
              recordingsQuery.isLoading ? (
                <p className="ms-text-muted px-2 py-2 text-xs">Loading…</p>
              ) : hasNotifications ? (
                <>
                  {apiItems.map((n) => (
                    <button
                      key={n.id}
                      type="button"
                      className="w-full rounded-lg px-2 py-2 text-left text-sm hover:bg-[var(--hover)]"
                      onClick={() => {
                        setNotifyOpen(false);
                        void markNotificationRead(n.id).then(() =>
                          queryClient.invalidateQueries({ queryKey: ["notifications"] }),
                        );
                        if (n.href) router.push(n.href);
                      }}
                    >
                      <span className="ms-text-heading font-medium">{n.title}</span>
                      {n.body ? (
                        <span className="ms-text-muted mt-0.5 block text-xs">{n.body}</span>
                      ) : null}
                      <span className="ms-text-muted mt-0.5 block text-xs">
                        {formatRelativeTime(n.createdAt)}
                      </span>
                    </button>
                  ))}
                  {upcomingSoon.map((m) => (
                    <button
                      key={`meeting-${m.id}`}
                      type="button"
                      className="w-full rounded-lg px-2 py-2 text-left text-sm hover:bg-[var(--hover)]"
                      onClick={() => {
                        setNotifyOpen(false);
                        router.push("/dashboard/meetings");
                      }}
                    >
                      <span className="ms-text-heading font-medium">
                        {m.name} starts soon
                      </span>
                      <span className="ms-text-muted mt-0.5 block text-xs">
                        {formatRelativeTime(m.scheduledAt)}
                      </span>
                    </button>
                  ))}
                  {recentRecordings.map((r) => (
                    <button
                      key={`recording-${r.id}`}
                      type="button"
                      className="w-full rounded-lg px-2 py-2 text-left text-sm hover:bg-[var(--hover)]"
                      onClick={() => {
                        setNotifyOpen(false);
                        router.push("/dashboard/recordings");
                      }}
                    >
                      <span className="ms-text-heading font-medium">Recording ready</span>
                      <span className="ms-text-muted mt-0.5 block text-xs">{r.name}</span>
                    </button>
                  ))}
                </>
              ) : (
                <p className="ms-text-muted px-2 py-2 text-xs">No new notifications</p>
              )}
            </div>
          ) : null}
        </div>

        <Button
          variant="secondary"
          size="sm"
          className="hidden rounded-xl sm:inline-flex"
          onClick={onJoin}
        >
          <Video className="h-4 w-4" />
          Join
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="hidden rounded-xl md:inline-flex"
          onClick={() => onSchedule?.()}
        >
          Schedule
        </Button>
        <Button size="sm" className="rounded-xl" onClick={onNewMeeting}>
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">New</span>
        </Button>
      </div>
    </header>
  );
}
