import type { MeetingTemplate, RoomMode, RoomSettings } from "@/types";
import { apiRequest } from "@/lib/api/client";

export async function listTemplates(): Promise<MeetingTemplate[]> {
  return apiRequest<MeetingTemplate[]>("/templates");
}

export async function createTemplate(input: {
  name: string;
  mode?: RoomMode;
  durationMinutes?: number;
  settings?: RoomSettings;
}): Promise<MeetingTemplate> {
  return apiRequest<MeetingTemplate>("/templates", {
    method: "POST",
    body: input,
  });
}

export async function deleteTemplate(templateId: string): Promise<void> {
  await apiRequest<void>(`/templates/${templateId}`, { method: "DELETE" });
}
