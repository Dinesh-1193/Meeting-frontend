"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MessageSquare, MessageSquarePlus, Wifi, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageInset } from "../page-inset";
import { ConversationList } from "./conversation-list";
import { MessageThread } from "./message-thread";
import { NewChatModal } from "./new-chat-modal";
import {
  disconnectChatCentrifuge,
  getChatCentrifuge,
  onChatConnectionChange,
  subscribeToChatChannel,
} from "@/lib/centrifugo/client";
import {
  createDirectChannel,
  getChatStatus,
  listChatConversations,
  markChannelRead,
} from "@/lib/api";
import { useAuth } from "@/lib/hooks/use-auth";
import { useToast } from "@/lib/hooks/use-toast";
import { ApiError } from "@/lib/api/client";
import type { ChatChannelMessage, ChatMessagePage } from "@/types";

type ChatPublication =
  | { type: "message"; message: ChatChannelMessage }
  | { type: "edit"; message: ChatChannelMessage }
  | { type: "delete"; message: ChatChannelMessage }
  | { type: "reaction"; channelId: string; messageId: string; reactions: ChatChannelMessage["reactions"] }
  | { type: "typing"; channelId: string; userId: string; name: string };

export function ChatView() {
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null);
  const [newChatOpen, setNewChatOpen] = useState(false);
  const [connectionState, setConnectionState] = useState<
    "connecting" | "connected" | "disconnected"
  >("disconnected");
  const [typingByChannel, setTypingByChannel] = useState<Record<string, { name: string; until: number }>>(
    {},
  );
  const autoOpenedRef = useRef(false);
  const selectedChannelIdRef = useRef(selectedChannelId);

  useEffect(() => {
    selectedChannelIdRef.current = selectedChannelId;
  }, [selectedChannelId]);

  const statusQuery = useQuery({
    queryKey: ["chat", "status"],
    queryFn: getChatStatus,
    staleTime: 60_000,
  });

  const conversationsQuery = useQuery({
    queryKey: ["chat", "conversations"],
    queryFn: listChatConversations,
  });
  const conversations = useMemo(() => conversationsQuery.data ?? [], [conversationsQuery.data]);

  const selectChannel = (id: string) => {
    setSelectedChannelId(id);
    void markChannelRead(id)
      .catch((err) => {
        console.warn("markChannelRead failed", err);
      })
      .then(() => queryClient.invalidateQueries({ queryKey: ["chat", "conversations"] }));
  };

  const startDmMutation = useMutation({
    mutationFn: (targetUserId: string) => createDirectChannel(targetUserId),
    onSuccess: (channel) => {
      selectChannel(channel.id);
      void queryClient.invalidateQueries({ queryKey: ["chat", "conversations"] });
    },
    onError: (err: unknown) => {
      toast({
        variant: "error",
        title: "Could not open chat",
        description: err instanceof ApiError ? err.message : "Try again",
      });
    },
  });

  useEffect(() => {
    const targetUserId = searchParams.get("userId");
    if (targetUserId && !autoOpenedRef.current) {
      autoOpenedRef.current = true;
      startDmMutation.mutate(targetUserId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  useEffect(() => {
    const unsub = onChatConnectionChange(setConnectionState);
    try {
      getChatCentrifuge().connect();
    } catch (err) {
      console.warn("centrifugo connect failed", err);
    }
    return () => {
      unsub();
      disconnectChatCentrifuge();
    };
  }, []);

  const conversationIds = useMemo(() => conversations.map((c) => c.id).join(","), [conversations]);
  useEffect(() => {
    const ids = conversationIds ? conversationIds.split(",") : [];
    const mutedIds = new Set(conversations.filter((c) => c.muted).map((c) => c.id));
    const entries = ids.map((id) => {
      const sub = subscribeToChatChannel(id);
      const handler = (ctx: { data: ChatPublication }) => {
        const data = ctx.data;
        if (!data?.type) return;

        if (data.type === "typing") {
          if (data.userId === user?.id) return;
          setTypingByChannel((prev) => ({
            ...prev,
            [data.channelId]: { name: data.name, until: Date.now() + 3000 },
          }));
          return;
        }

        if (data.type === "message") {
          const message = data.message;
          if (message.channelId === selectedChannelIdRef.current) {
            queryClient.setQueryData<ChatMessagePage | undefined>(
              ["chat", "messages", message.channelId],
              (old) => {
                if (!old) return old;
                if (old.messages.some((m) => m.id === message.id)) return old;
                return { ...old, messages: [...old.messages, message] };
              },
            );
            if (message.senderId !== user?.id) {
              void markChannelRead(message.channelId).catch(() => undefined);
            }
          }
          void queryClient.invalidateQueries({ queryKey: ["chat", "conversations"] });
          if (mutedIds.has(message.channelId) && message.senderId !== user?.id) {
            // muted: preview still updates via invalidate
          }
          return;
        }

        if (data.type === "edit" || data.type === "delete") {
          const message = data.message;
          queryClient.setQueryData<ChatMessagePage | undefined>(
            ["chat", "messages", message.channelId],
            (old) => {
              if (!old) return old;
              return {
                ...old,
                messages: old.messages.map((m) => (m.id === message.id ? message : m)),
              };
            },
          );
          void queryClient.invalidateQueries({ queryKey: ["chat", "conversations"] });
          return;
        }

        if (data.type === "reaction") {
          queryClient.setQueryData<ChatMessagePage | undefined>(
            ["chat", "messages", data.channelId],
            (old) => {
              if (!old) return old;
              return {
                ...old,
                messages: old.messages.map((m) =>
                  m.id === data.messageId ? { ...m, reactions: data.reactions } : m,
                ),
              };
            },
          );
        }
      };
      sub.on("publication", handler);
      if (sub.state === "unsubscribed") sub.subscribe();
      return { sub, handler };
    });

    return () => {
      entries.forEach(({ sub, handler }) => sub.off("publication", handler));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationIds]);

  const selectedConversation = useMemo(
    () => conversations.find((c) => c.id === selectedChannelId) ?? null,
    [conversations, selectedChannelId],
  );

  const typingName =
    selectedChannelId && typingByChannel[selectedChannelId]?.until > Date.now()
      ? typingByChannel[selectedChannelId].name
      : null;

  const realtimeOk = statusQuery.data?.realtimeConfigured !== false;
  const showBanner =
    !realtimeOk || connectionState === "disconnected" || connectionState === "connecting";

  return (
    <div className="flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden">
      <PageInset className="shrink-0 pb-3 pt-4 md:pt-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <h2 className="ms-text-heading text-xl font-semibold tracking-tight">Messages</h2>
            <p className="ms-text-muted mt-0.5 text-sm">Direct chats and group conversations</p>
          </div>
          <div className="flex items-center gap-2">
            {realtimeOk && connectionState === "connected" ? (
              <span
                className="hidden items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium sm:inline-flex"
                style={{
                  borderColor: "color-mix(in srgb, var(--success) 35%, var(--border))",
                  background: "color-mix(in srgb, var(--success) 10%, var(--surface))",
                  color: "var(--success)",
                }}
              >
                <Wifi className="h-3 w-3" />
                Live
              </span>
            ) : null}
            <Button size="sm" onClick={() => setNewChatOpen(true)} className="shadow-sm">
              <MessageSquarePlus className="h-3.5 w-3.5" />
              New chat
            </Button>
          </div>
        </div>
        {showBanner ? (
          <div
            className="mt-3 flex items-start gap-2.5 rounded-xl border px-3.5 py-2.5 text-xs"
            style={{
              borderColor: "var(--border)",
              background: "color-mix(in srgb, var(--accent) 6%, var(--surface))",
              color: "var(--muted-strong)",
            }}
          >
            <WifiOff className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--accent)]" />
            <p>
              {!realtimeOk
                ? "Realtime chat is not configured (Centrifugo). You can still load history; new messages may not appear live."
                : connectionState === "connecting"
                  ? "Connecting to live chat…"
                  : "Live chat disconnected — messages still save; reconnecting may be needed for instant updates."}
            </p>
          </div>
        ) : null}
      </PageInset>

      <div className="flex min-h-0 flex-1 px-4 pb-4 sm:px-5 md:px-6 lg:px-8">
        <div className="ms-chat-shell w-full">
          <ConversationList
            conversations={conversations}
            isLoading={conversationsQuery.isLoading}
            selectedId={selectedChannelId}
            onSelect={selectChannel}
            onLeft={(channelId) => {
              if (selectedChannelId === channelId) setSelectedChannelId(null);
            }}
          />

          {selectedConversation ? (
            <MessageThread
              key={selectedConversation.id}
              conversation={selectedConversation}
              conversations={conversations}
              currentUserId={user?.id ?? ""}
              attachmentsEnabled={statusQuery.data?.attachmentsEnabled ?? false}
              typingName={typingName}
            />
          ) : (
            <div className="ms-chat-canvas relative flex min-w-0 flex-1 flex-col items-center justify-center px-6 py-12">
              <div
                className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border shadow-sm"
                style={{
                  borderColor: "var(--border)",
                  background: "var(--surface)",
                  color: "var(--accent)",
                }}
              >
                <MessageSquare className="h-7 w-7" strokeWidth={1.75} />
              </div>
              <p className="ms-text-heading text-base font-semibold tracking-tight">
                Pick a conversation
              </p>
              <p className="ms-text-muted mt-1.5 max-w-xs text-center text-sm leading-relaxed">
                Select someone from the list, or start a new chat to begin messaging.
              </p>
              <Button size="sm" className="mt-5" onClick={() => setNewChatOpen(true)}>
                <MessageSquarePlus className="h-3.5 w-3.5" />
                New chat
              </Button>
            </div>
          )}
        </div>
      </div>

      <NewChatModal
        open={newChatOpen}
        onClose={() => setNewChatOpen(false)}
        onCreated={(channelId) => {
          selectChannel(channelId);
        }}
      />
    </div>
  );
}
