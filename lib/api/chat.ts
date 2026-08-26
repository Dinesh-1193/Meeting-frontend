import { apiRequest } from "@/lib/api/client";
import type { ChatChannel, ChatChannelMessage, ChatConversation, ChatMessagePage } from "@/types";

export async function getChatStatus(): Promise<{
  attachmentsEnabled: boolean;
  realtimeConfigured: boolean;
}> {
  return apiRequest("/chat/status");
}

export async function listChatConversations(): Promise<ChatConversation[]> {
  return apiRequest<ChatConversation[]>("/chat/conversations");
}

export async function createDirectChannel(userId: string): Promise<ChatChannel> {
  return apiRequest<ChatChannel>("/chat/dm", {
    method: "POST",
    body: { userId },
  });
}

export async function createGroupChannel(
  name: string | null,
  memberUserIds: string[],
): Promise<ChatChannel> {
  return apiRequest<ChatChannel>("/chat/groups", {
    method: "POST",
    body: { name: name ?? undefined, memberUserIds },
  });
}

export async function listChannelMessages(
  channelId: string,
  cursor?: string,
): Promise<ChatMessagePage> {
  const qs = cursor ? `?cursor=${encodeURIComponent(cursor)}` : "";
  return apiRequest<ChatMessagePage>(`/chat/channels/${channelId}/messages${qs}`);
}

export async function searchChannelMessages(
  channelId: string,
  q: string,
): Promise<ChatChannelMessage[]> {
  return apiRequest(
    `/chat/channels/${channelId}/search?q=${encodeURIComponent(q)}`,
  );
}

export async function listChannelMembers(
  channelId: string,
): Promise<{ id: string; name: string; avatarUrl?: string | null }[]> {
  return apiRequest(`/chat/channels/${channelId}/members`);
}

export async function renameChannel(channelId: string, name: string): Promise<ChatChannel> {
  return apiRequest(`/chat/channels/${channelId}`, {
    method: "PATCH",
    body: { name },
  });
}

export async function sendChannelMessage(
  channelId: string,
  body: string,
  opts?: { replyToMessageId?: string; forwardedFromSenderName?: string },
): Promise<ChatChannelMessage> {
  return apiRequest<ChatChannelMessage>(`/chat/channels/${channelId}/messages`, {
    method: "POST",
    body: { body, ...opts },
  });
}

export async function editMessage(
  channelId: string,
  messageId: string,
  body: string,
): Promise<ChatChannelMessage> {
  return apiRequest<ChatChannelMessage>(`/chat/channels/${channelId}/messages/${messageId}`, {
    method: "PATCH",
    body: { body },
  });
}

export async function deleteMessage(
  channelId: string,
  messageId: string,
): Promise<ChatChannelMessage> {
  return apiRequest<ChatChannelMessage>(`/chat/channels/${channelId}/messages/${messageId}`, {
    method: "DELETE",
  });
}

export async function toggleReaction(
  channelId: string,
  messageId: string,
  emoji: string,
): Promise<{ reactions: ChatChannelMessage["reactions"] }> {
  return apiRequest(`/chat/channels/${channelId}/messages/${messageId}/reactions`, {
    method: "POST",
    body: { emoji },
  });
}

export async function uploadChatAttachment(
  channelId: string,
  file: File,
  caption?: string,
  replyToMessageId?: string,
): Promise<ChatChannelMessage> {
  const formData = new FormData();
  formData.append("file", file);
  if (caption) formData.append("body", caption);
  if (replyToMessageId) formData.append("replyToMessageId", replyToMessageId);
  return apiRequest<ChatChannelMessage>(`/chat/channels/${channelId}/attachments`, {
    method: "POST",
    body: formData,
  });
}

export async function sendTyping(channelId: string): Promise<void> {
  await apiRequest<void>(`/chat/channels/${channelId}/typing`, { method: "POST" });
}

export async function markChannelRead(channelId: string): Promise<void> {
  await apiRequest<void>(`/chat/channels/${channelId}/read`, { method: "POST" });
}

export async function muteChannel(channelId: string, muted: boolean): Promise<void> {
  await apiRequest<void>(`/chat/channels/${channelId}/mute`, {
    method: "POST",
    body: { muted },
  });
}

export async function pinChannel(channelId: string, pinned: boolean): Promise<void> {
  await apiRequest<void>(`/chat/channels/${channelId}/pin`, {
    method: "POST",
    body: { pinned },
  });
}

export async function leaveChannel(channelId: string): Promise<void> {
  await apiRequest<void>(`/chat/channels/${channelId}`, { method: "DELETE" });
}

export async function fetchChatConnectionToken(): Promise<{ token: string }> {
  return apiRequest<{ token: string }>("/chat/realtime/connection-token", { method: "POST" });
}

export async function fetchChatSubscriptionToken(channel: string): Promise<{ token: string }> {
  return apiRequest<{ token: string }>("/chat/realtime/subscription-token", {
    method: "POST",
    body: { channel },
  });
}
