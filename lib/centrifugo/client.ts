import { Centrifuge, type Subscription } from "centrifuge";
import { fetchChatConnectionToken, fetchChatSubscriptionToken } from "@/lib/api/chat";

let client: Centrifuge | null = null;
type ConnectionListener = (state: "connecting" | "connected" | "disconnected") => void;
const listeners = new Set<ConnectionListener>();
let lastState: "connecting" | "connected" | "disconnected" = "disconnected";

function emit(state: "connecting" | "connected" | "disconnected") {
  lastState = state;
  listeners.forEach((fn) => fn(state));
}

export function getChatConnectionState() {
  return lastState;
}

export function onChatConnectionChange(listener: ConnectionListener): () => void {
  listeners.add(listener);
  listener(lastState);
  return () => listeners.delete(listener);
}

export function getChatCentrifuge(): Centrifuge {
  if (client) return client;
  const wsUrl =
    process.env.NEXT_PUBLIC_CENTRIFUGO_WS_URL ?? "ws://localhost:8000/connection/websocket";
  client = new Centrifuge(wsUrl, {
    getToken: async () => (await fetchChatConnectionToken()).token,
  });
  client.on("connecting", () => emit("connecting"));
  client.on("connected", () => emit("connected"));
  client.on("disconnected", () => emit("disconnected"));
  return client;
}

export function chatChannelName(channelId: string): string {
  return `$chat:${channelId}`;
}

export function subscribeToChatChannel(channelId: string): Subscription {
  const c = getChatCentrifuge();
  const name = chatChannelName(channelId);
  return (
    c.getSubscription(name) ??
    c.newSubscription(name, {
      getToken: async () => (await fetchChatSubscriptionToken(name)).token,
    })
  );
}

export function disconnectChatCentrifuge(): void {
  client?.disconnect();
  client = null;
  emit("disconnected");
}
