interface CalendarEventInput {
  title: string;
  description?: string;
  location: string;
  start: Date;
  durationMinutes?: number;
}

function toIcsDate(d: Date): string {
  return d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
}

function escapeIcsText(text: string): string {
  return text.replace(/[\\,;]/g, (c) => `\\${c}`).replace(/\n/g, "\\n");
}

export function buildIcsFile(event: CalendarEventInput): string {
  const end = new Date(event.start.getTime() + (event.durationMinutes ?? 30) * 60_000);
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//MeetSpace//EN",
    "BEGIN:VEVENT",
    `UID:${Date.now()}@meetspace.app`,
    `DTSTAMP:${toIcsDate(new Date())}`,
    `DTSTART:${toIcsDate(event.start)}`,
    `DTEND:${toIcsDate(end)}`,
    `SUMMARY:${escapeIcsText(event.title)}`,
    event.description ? `DESCRIPTION:${escapeIcsText(event.description)}` : "",
    `LOCATION:${escapeIcsText(event.location)}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].filter(Boolean);
  return lines.join("\r\n");
}

export function downloadIcsFile(event: CalendarEventInput, filename = "meeting.ics"): void {
  const blob = new Blob([buildIcsFile(event)], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function googleCalendarUrl(event: CalendarEventInput): string {
  const end = new Date(event.start.getTime() + (event.durationMinutes ?? 30) * 60_000);
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: event.title,
    dates: `${toIcsDate(event.start)}/${toIcsDate(end)}`,
    details: `${event.description ?? ""}\n\nJoin: ${event.location}`.trim(),
    location: event.location,
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
