import type { ApiNotification, Paginated } from "@/types";
import { apiRequest } from "./client";

export async function listNotifications(opts?: {
  limit?: number;
  cursor?: string;
}): Promise<Paginated<ApiNotification>> {
  const params = new URLSearchParams();
  if (opts?.limit) params.set("limit", String(opts.limit));
  if (opts?.cursor) params.set("cursor", opts.cursor);
  const qs = params.toString();
  return apiRequest(`/notifications${qs ? `?${qs}` : ""}`);
}

export async function markNotificationRead(id: string): Promise<void> {
  await apiRequest(`/notifications/${id}/read`, { method: "POST" });
}

export async function markAllNotificationsRead(): Promise<void> {
  await apiRequest("/notifications/read-all", { method: "POST" });
}
