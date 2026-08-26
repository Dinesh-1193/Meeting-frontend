import type { MeetingSummary, Paginated } from "@/types";
import { apiRequest } from "./client";

export async function getUserMeetings(userId: string): Promise<MeetingSummary[]> {
  const payload = await apiRequest<MeetingSummary[] | Paginated<MeetingSummary>>(
    `/users/${userId}/meetings`,
  );
  if (Array.isArray(payload)) return payload;
  return payload.items ?? [];
}
