/**
 * Meeting link / join-code helpers.
 * Keep in sync with backend/src/lib/ids.ts formatting rules.
 */

/** Meet-style join code: "k7m-2xq9-p1a". Personal rooms stay `personal-…`. */
export function formatJoinCode(idOrCode: string): string {
  const raw = idOrCode.trim();
  if (!raw) return raw;
  if (raw.toLowerCase().startsWith("personal-")) return raw.toLowerCase();

  const compact = raw.replace(/-/g, "").toLowerCase();
  if (!/^[a-z0-9]{10}$/.test(compact)) return raw;
  return `${compact.slice(0, 3)}-${compact.slice(3, 7)}-${compact.slice(7)}`;
}

export function compactMeetingCode(idOrCode: string): string {
  const raw = idOrCode.trim();
  if (!raw) return raw;
  if (raw.toLowerCase().startsWith("personal-")) return raw.toLowerCase();
  return raw.replace(/-/g, "").toLowerCase();
}

/** Mirrors backend personalRoomId() so both sides agree. */
export function getPersonalRoomId(userId: string): string {
  const compact = userId.replace(/-/g, "").slice(0, 12);
  return `personal-${compact}`;
}

export function meetingLobbyPath(idOrCode: string): string {
  return `/meeting/${formatJoinCode(idOrCode)}/lobby`;
}

export function getAppOrigin(): string {
  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin;
  }
  return (
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
    "http://localhost:3000"
  );
}

/** Absolute invite link, e.g. https://app.example.com/meeting/k7m-2xq9-p1a/lobby */
export function buildMeetingJoinUrl(idOrCode: string, baseUrl?: string): string {
  const base = (baseUrl ?? getAppOrigin()).replace(/\/$/, "");
  return `${base}${meetingLobbyPath(idOrCode)}`;
}

/**
 * Pull a meeting id/code out of a pasted invite URL or raw code.
 * Accepts …/meeting/{code}/lobby, …/meeting/{code}, or bare codes (with/without dashes).
 */
export function extractRoomId(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return "";

  try {
    const url = new URL(trimmed);
    const parts = url.pathname.split("/").filter(Boolean);
    const meetingIdx = parts.indexOf("meeting");
    if (meetingIdx >= 0 && parts[meetingIdx + 1]) {
      return formatJoinCode(decodeURIComponent(parts[meetingIdx + 1]));
    }
    const jIdx = parts.indexOf("j");
    if (jIdx >= 0 && parts[jIdx + 1]) {
      return formatJoinCode(decodeURIComponent(parts[jIdx + 1]));
    }
    return formatJoinCode(decodeURIComponent(parts[parts.length - 1] ?? trimmed));
  } catch {
    return formatJoinCode(trimmed.replace(/^#/, ""));
  }
}

export function formatRelativeTime(dateInput: string | Date | null | undefined): string {
  if (!dateInput) return "—";
  const date = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
  if (Number.isNaN(date.getTime())) return "—";

  const now = Date.now();
  const diffMs = date.getTime() - now;
  const abs = Math.abs(diffMs);
  const minutes = Math.round(abs / 60000);

  if (minutes < 1) return diffMs >= 0 ? "in a moment" : "just now";
  if (minutes < 60) return diffMs >= 0 ? `in ${minutes}m` : `${minutes}m ago`;

  const hours = Math.round(minutes / 60);
  if (hours < 24) return diffMs >= 0 ? `in ${hours}h` : `${hours}h ago`;

  const days = Math.round(hours / 24);
  return diffMs >= 0 ? `in ${days}d` : `${days}d ago`;
}

export function formatDateTime(dateInput: string | Date | null | undefined): string {
  if (!dateInput) return "—";
  const date = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
