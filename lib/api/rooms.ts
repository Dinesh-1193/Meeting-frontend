import type {
  ApiPoll,
  ApiQaQuestion,
  BreakoutRoom,
  ChatMessage,
  CreateRoomRequest,
  JoinRequestResponse,
  ParticipantCounts,
  ParticipantRole,
  ParticipantsPage,
  Recording,
  Room,
  RoomParticipant,
  RoomTokenResponse,
  SendChatRequest,
  UpdateRoomRequest,
} from "@/types";
import { apiRequest } from "./client";

export async function createRoom(data: CreateRoomRequest = {}): Promise<Room> {
  return apiRequest<Room>("/rooms", {
    method: "POST",
    body: data,
  });
}

export async function getRoom(roomId: string): Promise<Room> {
  return apiRequest<Room>(`/rooms/${roomId}`);
}

export async function updateRoom(
  roomId: string,
  data: UpdateRoomRequest,
): Promise<Room> {
  return apiRequest<Room>(`/rooms/${roomId}`, {
    method: "PATCH",
    body: data,
  });
}

export async function cancelRoom(
  roomId: string,
  scope: "this" | "all" = "this",
): Promise<void> {
  await apiRequest<void>(`/rooms/${roomId}/cancel`, {
    method: "POST",
    body: { scope },
  });
}

export async function getRoomToken(
  roomId: string,
  displayName?: string,
  passcode?: string,
): Promise<RoomTokenResponse> {
  const body: Record<string, string> = {};
  if (displayName) body.displayName = displayName;
  if (passcode) body.passcode = passcode;
  return apiRequest<RoomTokenResponse>(`/rooms/${roomId}/token`, {
    method: "POST",
    body: Object.keys(body).length ? body : undefined,
  });
}

export async function getRoomRecordings(roomId: string): Promise<Recording[]> {
  return apiRequest<Recording[]>(`/rooms/${roomId}/recordings`);
}

export async function sendRoomChat(
  roomId: string,
  data: SendChatRequest,
): Promise<ChatMessage> {
  return apiRequest<ChatMessage>(`/rooms/${roomId}/chat`, {
    method: "POST",
    body: data,
  });
}

export async function getRoomChat(roomId: string): Promise<ChatMessage[]> {
  return apiRequest<ChatMessage[]>(`/rooms/${roomId}/chat`);
}

// --- Polls & Q&A --------------------------------------------------------

export async function listRoomPolls(roomId: string): Promise<ApiPoll[]> {
  return apiRequest<ApiPoll[]>(`/rooms/${roomId}/polls`);
}

export async function createRoomPoll(
  roomId: string,
  question: string,
  options: string[],
): Promise<ApiPoll> {
  return apiRequest<ApiPoll>(`/rooms/${roomId}/polls`, {
    method: "POST",
    body: { question, options },
  });
}

export async function voteRoomPoll(
  roomId: string,
  pollId: string,
  optionId: string,
): Promise<ApiPoll> {
  return apiRequest<ApiPoll>(`/rooms/${roomId}/polls/${pollId}/vote`, {
    method: "POST",
    body: { optionId },
  });
}

export async function closeRoomPoll(roomId: string, pollId: string): Promise<ApiPoll> {
  return apiRequest<ApiPoll>(`/rooms/${roomId}/polls/${pollId}/close`, {
    method: "POST",
  });
}

export async function listRoomQuestions(roomId: string): Promise<ApiQaQuestion[]> {
  return apiRequest<ApiQaQuestion[]>(`/rooms/${roomId}/questions`);
}

export async function askRoomQuestion(
  roomId: string,
  text: string,
): Promise<ApiQaQuestion> {
  return apiRequest<ApiQaQuestion>(`/rooms/${roomId}/questions`, {
    method: "POST",
    body: { text },
  });
}

export async function upvoteRoomQuestion(
  roomId: string,
  questionId: string,
): Promise<ApiQaQuestion> {
  return apiRequest<ApiQaQuestion>(`/rooms/${roomId}/questions/${questionId}/upvote`, {
    method: "POST",
  });
}

export async function markQuestionAnswered(
  roomId: string,
  questionId: string,
): Promise<ApiQaQuestion> {
  return apiRequest<ApiQaQuestion>(`/rooms/${roomId}/questions/${questionId}/answered`, {
    method: "POST",
  });
}

// --- Waiting room -----------------------------------------------------

export async function requestToJoin(
  roomId: string,
  displayName?: string,
): Promise<JoinRequestResponse> {
  return apiRequest<JoinRequestResponse>(`/rooms/${roomId}/join-request`, {
    method: "POST",
    body: displayName ? { displayName } : undefined,
  });
}

export async function getJoinRequestStatus(
  roomId: string,
  participantId: string,
): Promise<JoinRequestResponse> {
  return apiRequest<JoinRequestResponse>(
    `/rooms/${roomId}/join-request/${participantId}`,
  );
}

export async function listWaitingRoom(roomId: string): Promise<RoomParticipant[]> {
  return apiRequest<RoomParticipant[]>(`/rooms/${roomId}/waiting-room`);
}

export async function admitParticipant(
  roomId: string,
  participantId: string,
): Promise<RoomParticipant> {
  return apiRequest<RoomParticipant>(
    `/rooms/${roomId}/waiting-room/${participantId}/admit`,
    { method: "POST" },
  );
}

export async function denyParticipant(
  roomId: string,
  participantId: string,
): Promise<RoomParticipant> {
  return apiRequest<RoomParticipant>(
    `/rooms/${roomId}/waiting-room/${participantId}/deny`,
    { method: "POST" },
  );
}

// --- Moderation ---------------------------------------------------------

export async function muteParticipant(roomId: string, identity: string): Promise<void> {
  await apiRequest<void>(`/rooms/${roomId}/participants/${identity}/mute`, {
    method: "POST",
  });
}

export async function removeParticipant(
  roomId: string,
  identity: string,
): Promise<void> {
  await apiRequest<void>(`/rooms/${roomId}/participants/${identity}/remove`, {
    method: "POST",
  });
}

export async function setParticipantRole(
  roomId: string,
  identity: string,
  role: Extract<ParticipantRole, "panelist" | "attendee">,
): Promise<void> {
  await apiRequest<void>(`/rooms/${roomId}/participants/${identity}/role`, {
    method: "POST",
    body: { role },
  });
}

export async function muteAllParticipants(roomId: string): Promise<void> {
  await apiRequest<void>(`/rooms/${roomId}/participants/mute-all`, {
    method: "POST",
  });
}

export async function setMeetingLocked(roomId: string, locked: boolean): Promise<void> {
  await apiRequest<void>(`/rooms/${roomId}/lock`, {
    method: "POST",
    body: { locked },
  });
}

export async function setCohost(
  roomId: string,
  identity: string,
  isCohost: boolean,
): Promise<void> {
  await apiRequest<void>(`/rooms/${roomId}/participants/${identity}/cohost`, {
    method: "POST",
    body: { isCohost },
  });
}

export async function listRoomParticipants(
  roomId: string,
  cursor?: number,
): Promise<ParticipantsPage> {
  const query = cursor ? `?cursor=${cursor}` : "";
  return apiRequest<ParticipantsPage>(`/rooms/${roomId}/participants${query}`);
}

export async function getParticipantCounts(
  roomId: string,
): Promise<ParticipantCounts> {
  return apiRequest<ParticipantCounts>(`/rooms/${roomId}/participants/count`);
}

// --- Breakout rooms ---------------------------------------------------

export async function createBreakouts(
  roomId: string,
  count: number,
  assignments?: Record<string, string[]>,
): Promise<BreakoutRoom[]> {
  return apiRequest<BreakoutRoom[]>(`/rooms/${roomId}/breakouts`, {
    method: "POST",
    body: { count, assignments },
  });
}

export async function listBreakouts(roomId: string): Promise<BreakoutRoom[]> {
  return apiRequest<BreakoutRoom[]>(`/rooms/${roomId}/breakouts`);
}

export async function joinBreakout(
  roomId: string,
  breakoutId: string,
  displayName?: string,
): Promise<RoomTokenResponse> {
  return apiRequest<RoomTokenResponse>(
    `/rooms/${roomId}/breakouts/${breakoutId}/join`,
    { method: "POST", body: displayName ? { displayName } : undefined },
  );
}

export async function endBreakouts(roomId: string): Promise<void> {
  await apiRequest<void>(`/rooms/${roomId}/breakouts/end`, { method: "POST" });
}

export async function setBreakoutTimer(
  roomId: string,
  minutes: number | null,
): Promise<{ deadline: string | null }> {
  return apiRequest<{ deadline: string | null }>(`/rooms/${roomId}/breakouts/timer`, {
    method: "POST",
    body: { minutes },
  });
}

export async function sendBreakoutBroadcast(
  roomId: string,
  message: string,
): Promise<{ message: string; messageId: string }> {
  return apiRequest<{ message: string; messageId: string }>(
    `/rooms/${roomId}/breakouts/broadcast`,
    { method: "POST", body: { message } },
  );
}

// --- Recording ------------------------------------------------------------

export async function startRecording(roomId: string): Promise<Recording> {
  return apiRequest<Recording>(`/rooms/${roomId}/recording/start`, {
    method: "POST",
  });
}

export async function stopRecording(roomId: string): Promise<Recording> {
  return apiRequest<Recording>(`/rooms/${roomId}/recording/stop`, {
    method: "POST",
  });
}

export async function getRecordingStatus(
  roomId: string,
): Promise<Recording | null> {
  return apiRequest<Recording | null>(`/rooms/${roomId}/recording/status`);
}
