import type { MeetingSummary } from "@/types";

export function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function endOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export function startOfWeek(date: Date, weekStartsOn = 0): Date {
  const d = startOfDay(date);
  const day = d.getDay();
  const diff = (day - weekStartsOn + 7) % 7;
  return addDays(d, -diff);
}

export function meetingDate(m: MeetingSummary): Date | null {
  const raw = m.scheduledAt ?? m.startedAt ?? m.endedAt;
  if (!raw) return null;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function formatMonthYear(date: Date): string {
  return date.toLocaleDateString(undefined, { month: "long", year: "numeric" });
}

export function formatWeekRange(weekStart: Date): string {
  const weekEnd = addDays(weekStart, 6);
  const sameMonth = weekStart.getMonth() === weekEnd.getMonth();
  if (sameMonth) {
    return `${weekStart.toLocaleDateString(undefined, { month: "short", day: "numeric" })} – ${weekEnd.getDate()}, ${weekEnd.getFullYear()}`;
  }
  return `${weekStart.toLocaleDateString(undefined, { month: "short", day: "numeric" })} – ${weekEnd.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}`;
}

export function formatTime(date: Date): string {
  return date.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatDayHeading(date: Date): string {
  return date.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

/** 42 cells (6 weeks) covering the visible month grid */
export function getMonthGrid(viewDate: Date): Date[] {
  const first = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1);
  const gridStart = startOfWeek(first, 0);
  return Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));
}

export function getWeekDays(viewDate: Date): Date[] {
  const start = startOfWeek(viewDate, 0);
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

export function meetingsOnDay(
  meetings: MeetingSummary[],
  day: Date,
): MeetingSummary[] {
  return meetings
    .filter((m) => {
      const d = meetingDate(m);
      return d ? isSameDay(d, day) : false;
    })
    .sort((a, b) => {
      const ta = meetingDate(a)?.getTime() ?? 0;
      const tb = meetingDate(b)?.getTime() ?? 0;
      return ta - tb;
    });
}

export function groupMeetingsByDay(
  meetings: MeetingSummary[],
): Map<string, MeetingSummary[]> {
  const map = new Map<string, MeetingSummary[]>();
  for (const m of meetings) {
    const d = meetingDate(m);
    if (!d) continue;
    const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    const list = map.get(key) ?? [];
    list.push(m);
    map.set(key, list);
  }
  for (const list of Array.from(map.values())) {
    list.sort((a, b) => {
      const ta = meetingDate(a)?.getTime() ?? 0;
      const tb = meetingDate(b)?.getTime() ?? 0;
      return ta - tb;
    });
  }
  return map;
}

export function dayKey(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

export function statusColor(status: MeetingSummary["status"]): string {
  switch (status) {
    case "live":
      return "bg-emerald-500 text-white";
    case "scheduled":
      return "bg-sky-600 text-white dark:bg-sky-500";
    case "waiting":
      return "bg-amber-500 text-white";
    case "ended":
      return "bg-[var(--surface-muted)] text-[var(--muted-strong)]";
    default:
      return "bg-[var(--surface-muted)] text-[var(--muted-strong)]";
  }
}

export function statusDot(status: MeetingSummary["status"]): string {
  switch (status) {
    case "live":
      return "bg-emerald-400";
    case "scheduled":
      return "bg-sky-400";
    case "waiting":
      return "bg-amber-400";
    case "ended":
      return "bg-slate-500";
    default:
      return "bg-slate-500";
  }
}
