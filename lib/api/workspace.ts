import type {
  MeetingSummary,
  Contact,
  RecordingSummary,
  RecurrenceRule,
  RoomMode,
  RoomSettings,
  Paginated,
} from "@/types";
import { apiRequest } from "@/lib/api/client";

function unwrapList<T>(payload: T[] | Paginated<T>): T[] {
  if (Array.isArray(payload)) return payload;
  return payload.items ?? [];
}

export async function listMeetings(userId: string): Promise<MeetingSummary[]> {
  const payload = await apiRequest<MeetingSummary[] | Paginated<MeetingSummary>>(
    `/users/${userId}/meetings`,
  );
  return unwrapList(payload);
}

export async function scheduleMeeting(input: {
  name: string;
  scheduledAt: string;
  durationMinutes?: number;
  mode?: RoomMode;
  description?: string;
  timezone?: string;
  invitedEmails?: string[];
  alternateHosts?: string[];
  recurrence?: RecurrenceRule;
  settings?: RoomSettings;
  passcode?: string | null;
}): Promise<MeetingSummary> {
  return apiRequest<MeetingSummary>("/rooms", {
    method: "POST",
    body: input,
  });
}

export async function listRecordings(): Promise<RecordingSummary[]> {
  const payload = await apiRequest<RecordingSummary[] | Paginated<RecordingSummary>>(
    "/recordings",
  );
  return unwrapList(payload);
}

export async function setRecordingShareExpiry(
  recordingId: string,
  days: number | null,
): Promise<RecordingSummary> {
  return apiRequest<RecordingSummary>(`/recordings/${recordingId}/share`, {
    method: "PATCH",
    body: { days },
  });
}

export async function listContacts(): Promise<Contact[]> {
  const payload = await apiRequest<Contact[] | Paginated<Contact>>("/contacts");
  return unwrapList(payload);
}

export async function addContact(email: string): Promise<Contact> {
  return apiRequest<Contact>("/contacts", {
    method: "POST",
    body: { email },
  });
}
