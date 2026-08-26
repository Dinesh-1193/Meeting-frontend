"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  Pencil,
  Plus,
  Users,
  Video,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState, LoadingState } from "@/components/ui/states";
import { useAuth } from "@/lib/hooks/use-auth";
import { useToast } from "@/lib/hooks/use-toast";
import { listMeetings, cancelRoom } from "@/lib/api";
import { useWorkspaceActions } from "./app-shell";
import { PageInset } from "./page-inset";
import { cn } from "@/lib/utils/cn";
import { meetingLobbyPath } from "@/lib/utils/format";
import {
  addDays,
  addMonths,
  dayKey,
  formatDayHeading,
  formatMonthYear,
  formatTime,
  formatWeekRange,
  getMonthGrid,
  getWeekDays,
  groupMeetingsByDay,
  isSameDay,
  meetingDate,
  meetingsOnDay,
  startOfDay,
  statusColor,
  statusDot,
} from "@/lib/utils/calendar";
import type { MeetingSummary } from "@/types";

type CalendarMode = "month" | "week";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function CalendarView() {
  const router = useRouter();
  const { user } = useAuth();
  const { openSchedule } = useWorkspaceActions();
  const today = useMemo(() => startOfDay(new Date()), []);
  const [cursor, setCursor] = useState(() => startOfDay(new Date()));
  const [mode, setMode] = useState<CalendarMode>("month");
  const [selected, setSelected] = useState<Date>(() => startOfDay(new Date()));

  const meetingsQuery = useQuery({
    queryKey: ["meetings", user?.id],
    queryFn: () => listMeetings(user!.id),
    enabled: Boolean(user?.id),
  });

  const meetings = useMemo(
    () => meetingsQuery.data ?? [],
    [meetingsQuery.data],
  );
  const byDay = useMemo(() => groupMeetingsByDay(meetings), [meetings]);
  const dayMeetings = useMemo(
    () => meetingsOnDay(meetings, selected),
    [meetings, selected],
  );

  const monthCells = useMemo(() => getMonthGrid(cursor), [cursor]);
  const weekDays = useMemo(() => getWeekDays(cursor), [cursor]);

  const goToday = () => {
    const t = startOfDay(new Date());
    setCursor(t);
    setSelected(t);
  };

  return (
    <div className="flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden">
      <PageInset className="shrink-0 pb-3 pt-4 md:pt-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="ms-text-heading text-2xl font-semibold tracking-tight">
              Calendar
            </h2>
            <div
              className="flex items-center overflow-hidden rounded-xl border shadow-sm"
              style={{
                borderColor: "var(--border)",
                background: "var(--surface)",
              }}
            >
              <button
                type="button"
                className="ms-text-muted rounded-l-xl p-1.5 transition hover:bg-[var(--hover)] hover:text-[var(--foreground)]"
                onClick={() =>
                  setCursor((c) => (mode === "month" ? addMonths(c, -1) : addDays(c, -7)))
                }
                aria-label={mode === "month" ? "Previous month" : "Previous week"}
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                className="border-x px-2.5 py-1 text-xs font-medium text-[var(--foreground)] transition hover:bg-[var(--hover)]"
                style={{ borderColor: "var(--border)" }}
                onClick={goToday}
              >
                Today
              </button>
              <button
                type="button"
                className="ms-text-muted rounded-r-xl p-1.5 transition hover:bg-[var(--hover)] hover:text-[var(--foreground)]"
                onClick={() =>
                  setCursor((c) => (mode === "month" ? addMonths(c, 1) : addDays(c, 7)))
                }
                aria-label={mode === "month" ? "Next month" : "Next week"}
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
            <h3 className="ms-text-heading text-sm font-semibold">
              {mode === "month"
                ? formatMonthYear(cursor)
                : formatWeekRange(weekDays[0])}
            </h3>
          </div>

          <div className="flex items-center gap-2">
            <div className="ms-segment">
              {(
                [
                  ["month", "Month"],
                  ["week", "Week"],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  className="ms-segment-item"
                  data-active={mode === value}
                  onClick={() => setMode(value)}
                >
                  {label}
                </button>
              ))}
            </div>
            <Button size="sm" onClick={() => openSchedule()}>
              <Plus className="h-3.5 w-3.5" />
              Schedule
            </Button>
          </div>
        </div>
      </PageInset>

      <PageInset className="flex min-h-0 flex-1 flex-col pb-3">
        {meetingsQuery.isLoading ? (
          <LoadingState label="Loading calendar…" className="min-h-0 flex-1" />
        ) : (
          <div className="grid min-h-0 flex-1 gap-3 xl:grid-cols-[1fr_260px]">
            <div className="ms-panel flex min-h-0 min-w-0 flex-col overflow-hidden">
              {mode === "month" ? (
                <MonthGrid
                  cells={monthCells}
                  cursor={cursor}
                  today={today}
                  selected={selected}
                  byDay={byDay}
                  onSelect={setSelected}
                />
              ) : (
                <WeekGrid
                  days={weekDays}
                  today={today}
                  selected={selected}
                  byDay={byDay}
                  onSelect={setSelected}
                />
              )}
            </div>

            <aside className="ms-panel flex min-h-0 flex-col overflow-hidden">
              <div
                className="shrink-0 border-b px-3 py-2"
                style={{ borderColor: "var(--border)" }}
              >
                <p className="ms-text-muted text-[10px] font-semibold uppercase tracking-wide">
                  Agenda
                </p>
                <h4 className="ms-text-heading mt-0.5 text-sm font-semibold">
                  {formatDayHeading(selected)}
                </h4>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto p-2.5">
                {dayMeetings.length === 0 ? (
                  <div className="py-2">
                    <EmptyState
                      title="No meetings"
                      description="Nothing scheduled this day."
                      className="min-h-[100px] border-0 bg-transparent py-4"
                    />
                    <Button
                      variant="secondary"
                      size="sm"
                      className="mt-2 w-full"
                      onClick={() => openSchedule()}
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Schedule for this day
                    </Button>
                  </div>
                ) : (
                  <ul className="space-y-2">
                    {dayMeetings.map((m) => (
                      <AgendaItem
                        key={m.id}
                        meeting={m}
                        onJoin={() =>
                          router.push(meetingLobbyPath(m.joinCode || m.roomId))
                        }
                        onDetails={() =>
                          router.push(
                            m.status === "ended"
                              ? `/meeting/${m.roomId}/ended`
                              : meetingLobbyPath(m.joinCode || m.roomId),
                          )
                        }
                      />
                    ))}
                  </ul>
                )}
              </div>
            </aside>
          </div>
        )}

        <div className="ms-text-muted mt-2 flex shrink-0 flex-wrap gap-3 text-[11px]">
          <Legend color="bg-sky-500" label="Scheduled" />
          <Legend color="bg-emerald-500" label="Live" />
          <Legend color="bg-amber-500" label="Waiting" />
          <Legend color="bg-slate-400" label="Ended" />
        </div>
      </PageInset>
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={cn("h-2 w-2 rounded-full", color)} />
      {label}
    </span>
  );
}

function MonthGrid({
  cells,
  cursor,
  today,
  selected,
  byDay,
  onSelect,
}: {
  cells: Date[];
  cursor: Date;
  today: Date;
  selected: Date;
  byDay: Map<string, MeetingSummary[]>;
  onSelect: (d: Date) => void;
}) {
  const weeks = cells.length / 7;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div
        className="grid shrink-0 grid-cols-7 border-b"
        style={{
          borderColor: "var(--border)",
          background: "var(--surface-2)",
        }}
      >
        {WEEKDAYS.map((d) => (
          <div
            key={d}
            className="ms-text-muted px-1 py-1.5 text-center text-[10px] font-semibold uppercase tracking-wide"
          >
            {d}
          </div>
        ))}
      </div>
      <div
        className="grid min-h-0 flex-1 grid-cols-7"
        style={{ gridTemplateRows: `repeat(${weeks}, minmax(0, 1fr))` }}
      >
        {cells.map((day) => {
          const inMonth = day.getMonth() === cursor.getMonth();
          const isToday = isSameDay(day, today);
          const isSelected = isSameDay(day, selected);
          const events = byDay.get(dayKey(day)) ?? [];
          const visible = events.slice(0, 2);
          const more = events.length - visible.length;

          return (
            <button
              key={day.toISOString()}
              type="button"
              onClick={() => onSelect(day)}
              className={cn(
                "min-h-0 min-w-0 overflow-hidden border-b border-r p-1 text-left transition hover:bg-[var(--hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--ring)]",
                !inMonth && "ms-text-muted bg-[var(--surface-2)]",
                isSelected && "bg-[var(--accent-soft)] ring-1 ring-inset ring-[var(--accent)]",
              )}
              style={{ borderColor: "var(--border)" }}
            >
              <div className="flex items-center justify-between gap-1">
                <span
                  className={cn(
                    "inline-flex h-5 min-w-5 items-center justify-center rounded-full text-[11px] font-medium",
                    isToday && "bg-[var(--accent)] text-white",
                    !isToday && inMonth && "text-[var(--foreground)]",
                    !isToday && !inMonth && "ms-text-muted",
                  )}
                >
                  {day.getDate()}
                </span>
              </div>
              <div className="mt-0.5 space-y-0.5">
                {visible.map((m) => {
                  const d = meetingDate(m);
                  return (
                    <div
                      key={m.id}
                      className={cn(
                        "truncate rounded px-1 py-0.5 text-[9px] font-medium leading-tight",
                        statusColor(m.status),
                      )}
                      title={m.name}
                    >
                      {d ? `${formatTime(d)} ` : ""}
                      {m.name}
                    </div>
                  );
                })}
                {more > 0 ? (
                  <p className="ms-text-muted px-0.5 text-[9px] font-medium">
                    +{more} more
                  </p>
                ) : null}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function WeekGrid({
  days,
  today,
  selected,
  byDay,
  onSelect,
}: {
  days: Date[];
  today: Date;
  selected: Date;
  byDay: Map<string, MeetingSummary[]>;
  onSelect: (d: Date) => void;
}) {
  return (
    <div className="grid h-full min-h-0 grid-cols-1 sm:grid-cols-7">
      {days.map((day, i) => {
        const isToday = isSameDay(day, today);
        const isSelected = isSameDay(day, selected);
        const events = byDay.get(dayKey(day)) ?? [];

        return (
          <div
            key={day.toISOString()}
            className="flex min-h-0 flex-col border-b p-1.5 sm:border-b-0 sm:border-r"
            style={{
              borderColor: "var(--border)",
              background: isSelected ? "var(--accent-soft)" : undefined,
              ...(i === days.length - 1 ? { borderRight: "none" } : {}),
            }}
          >
            <button
              type="button"
              onClick={() => onSelect(day)}
              className="mb-1.5 flex w-full shrink-0 flex-col items-center gap-0.5 rounded-lg py-1 transition hover:bg-[var(--hover)]"
            >
              <span className="ms-text-muted text-[10px] font-semibold uppercase tracking-wide">
                {day.toLocaleDateString(undefined, { weekday: "short" })}
              </span>
              <span
                className={cn(
                  "inline-flex h-7 w-7 items-center justify-center rounded-full text-sm font-semibold",
                  isToday
                    ? "bg-[var(--accent)] text-white"
                    : "text-[var(--foreground)]",
                )}
              >
                {day.getDate()}
              </span>
            </button>
            <ul className="min-h-0 flex-1 space-y-1 overflow-y-auto">
              {events.length === 0 ? (
                <li className="ms-text-muted px-1 text-center text-[11px] opacity-50">
                  —
                </li>
              ) : (
                events.map((m) => {
                  const d = meetingDate(m);
                  return (
                    <li key={m.id}>
                      <button
                        type="button"
                        onClick={() => onSelect(day)}
                        className={cn(
                          "w-full rounded-md px-1.5 py-1 text-left text-[11px] font-medium leading-snug",
                          statusColor(m.status),
                        )}
                      >
                        <span className="block opacity-90">
                          {d ? formatTime(d) : ""}
                        </span>
                        <span className="line-clamp-2">{m.name}</span>
                      </button>
                    </li>
                  );
                })
              )}
            </ul>
          </div>
        );
      })}
    </div>
  );
}

function AgendaItem({
  meeting,
  onJoin,
  onDetails,
}: {
  meeting: MeetingSummary;
  onJoin: () => void;
  onDetails: () => void;
}) {
  const { user } = useAuth();
  const { toast } = useToast();
  const { openSchedule } = useWorkspaceActions();
  const queryClient = useQueryClient();
  const d = meetingDate(meeting);
  const isLiveOrSoon =
    meeting.status === "live" ||
    meeting.status === "waiting" ||
    meeting.status === "scheduled";
  const canManage = user?.id === meeting.hostId && meeting.status === "scheduled";

  const cancelMutation = useMutation({
    mutationFn: (scope: "this" | "all") => cancelRoom(meeting.roomId, scope),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["meetings"] });
      toast({ variant: "info", title: "Meeting cancelled" });
    },
    onError: () => toast({ variant: "error", title: "Could not cancel meeting" }),
  });

  const handleCancel = () => {
    if (!window.confirm(`Cancel "${meeting.name}"?`)) return;
    const scope: "this" | "all" =
      meeting.recurrenceGroupId &&
      window.confirm(
        "This is a recurring meeting. Click OK to cancel this and all following events, or Cancel to cancel just this one.",
      )
        ? "all"
        : "this";
    cancelMutation.mutate(scope);
  };

  return (
    <li
      className="rounded-xl border p-3"
      style={{
        borderColor: "var(--border)",
        background: "var(--surface-2)",
      }}
    >
      <div className="flex items-start gap-2">
        <span
          className={cn(
            "mt-1.5 h-2 w-2 shrink-0 rounded-full",
            statusDot(meeting.status),
          )}
        />
        <div className="min-w-0 flex-1">
          <p className="ms-text-heading truncate text-sm font-semibold">
            {meeting.name}
          </p>
          <p className="ms-text-muted mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs">
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {d ? formatTime(d) : "—"}
              {meeting.durationMinutes ? ` · ${meeting.durationMinutes}m` : ""}
            </span>
            {meeting.participantCount != null ? (
              <span className="inline-flex items-center gap-1">
                <Users className="h-3 w-3" />
                {meeting.participantCount}
              </span>
            ) : null}
          </p>
          {meeting.hostName ? (
            <p className="ms-text-muted mt-0.5 text-[11px]">
              Host: {meeting.hostName}
            </p>
          ) : null}
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {isLiveOrSoon ? (
              <Button size="sm" onClick={onJoin}>
                <Video className="h-3.5 w-3.5" />
                Join
              </Button>
            ) : null}
            <Button size="sm" variant="ghost" onClick={onDetails}>
              Details
            </Button>
            {canManage ? (
              <>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => openSchedule(meeting)}
                  aria-label="Edit meeting"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-[var(--danger)]"
                  onClick={handleCancel}
                  disabled={cancelMutation.isPending}
                  aria-label="Cancel meeting"
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </>
            ) : null}
          </div>
        </div>
      </div>
    </li>
  );
}
