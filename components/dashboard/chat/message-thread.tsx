"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Search, Users, X } from "lucide-react";
import { LoadingState } from "@/components/ui/states";
import { Button } from "@/components/ui/button";
import { MessageBubble } from "./message-bubble";
import { MessageComposer } from "./message-composer";
import {
  listChannelMembers,
  listChannelMessages,
  renameChannel,
  searchChannelMessages,
  sendChannelMessage,
  sendTyping,
  uploadChatAttachment,
} from "@/lib/api";
import { useAuth } from "@/lib/hooks/use-auth";
import { useToast } from "@/lib/hooks/use-toast";
import { ApiError } from "@/lib/api/client";
import { avatarColorForIdentity } from "@/lib/utils/avatar-color";
import { addDays, isSameDay, startOfDay } from "@/lib/utils/calendar";
import type { ChatChannelMessage, ChatConversation, ChatMessagePage } from "@/types";

function initials(name: string): string {
  return name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function dateSeparatorLabel(date: Date): string {
  const today = startOfDay(new Date());
  const target = startOfDay(date);
  if (isSameDay(target, today)) return "Today";
  if (isSameDay(target, addDays(today, -1))) return "Yesterday";
  return target.toLocaleDateString(undefined, {
    month: "long",
    day: "numeric",
    year: target.getFullYear() === today.getFullYear() ? undefined : "numeric",
  });
}

const GROUPING_WINDOW_MS = 5 * 60_000;

export function MessageThread({
  conversation,
  conversations,
  currentUserId,
  attachmentsEnabled,
  typingName,
}: {
  conversation: ChatConversation;
  conversations: ChatConversation[];
  currentUserId: string;
  attachmentsEnabled?: boolean;
  typingName?: string | null;
}) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const hasScrolledInitially = useRef(false);
  const [olderMessages, setOlderMessages] = useState<ChatChannelMessage[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null | undefined>(undefined);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [replyingTo, setReplyingTo] = useState<ChatChannelMessage | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQ, setSearchQ] = useState("");
  const [renameOpen, setRenameOpen] = useState(false);
  const [renameValue, setRenameValue] = useState(conversation.displayName);

  const latestQuery = useQuery({
    queryKey: ["chat", "messages", conversation.id],
    queryFn: () => listChannelMessages(conversation.id),
  });

  const membersQuery = useQuery({
    queryKey: ["chat", "members", conversation.id],
    queryFn: () => listChannelMembers(conversation.id),
    enabled: conversation.type === "group",
  });

  const searchQuery = useQuery({
    queryKey: ["chat", "search", conversation.id, searchQ],
    queryFn: () => searchChannelMessages(conversation.id, searchQ),
    enabled: searchOpen && searchQ.trim().length >= 2,
  });

  useEffect(() => {
    setOlderMessages([]);
    setNextCursor(undefined);
    setReplyingTo(null);
    setSearchOpen(false);
    setSearchQ("");
    setRenameValue(conversation.displayName);
    hasScrolledInitially.current = false;
  }, [conversation.id, conversation.displayName]);

  useEffect(() => {
    if (latestQuery.data && nextCursor === undefined) {
      setNextCursor(latestQuery.data.nextCursor);
    }
  }, [latestQuery.data, nextCursor]);

  const messages = useMemo(
    () => [...olderMessages, ...(latestQuery.data?.messages ?? [])],
    [olderMessages, latestQuery.data],
  );

  const loadOlder = async () => {
    if (isLoadingMore || !nextCursor) return;
    setIsLoadingMore(true);
    const container = scrollRef.current;
    const prevScrollHeight = container?.scrollHeight ?? 0;
    try {
      const page = await listChannelMessages(conversation.id, nextCursor);
      setOlderMessages((prev) => [...page.messages, ...prev]);
      setNextCursor(page.nextCursor);
      requestAnimationFrame(() => {
        if (container) {
          container.scrollTop = container.scrollHeight - prevScrollHeight;
        }
      });
    } catch (err) {
      toast({
        variant: "error",
        title: "Could not load older messages",
        description: err instanceof ApiError ? err.message : "Try again",
      });
    } finally {
      setIsLoadingMore(false);
    }
  };

  const handleScroll = () => {
    const el = scrollRef.current;
    if (el && el.scrollTop < 80 && nextCursor && !isLoadingMore) {
      void loadOlder();
    }
  };

  useEffect(() => {
    if (!latestQuery.data || hasScrolledInitially.current) return;
    bottomRef.current?.scrollIntoView({ block: "end" });
    hasScrolledInitially.current = true;
  }, [latestQuery.data]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end", behavior: "smooth" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [latestQuery.data?.messages.length]);

  const appendSentMessage = (message: ChatChannelMessage) => {
    queryClient.setQueryData<ChatMessagePage | undefined>(
      ["chat", "messages", conversation.id],
      (old) => {
        if (!old) return old;
        if (old.messages.some((m) => m.id === message.id)) return old;
        return { ...old, messages: [...old.messages, message] };
      },
    );
    void queryClient.invalidateQueries({ queryKey: ["chat", "conversations"] });
  };

  const sendMutation = useMutation({
    mutationFn: (body: string) =>
      sendChannelMessage(conversation.id, body, {
        replyToMessageId: replyingTo?.id,
      }),
    onMutate: (body) => {
      const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const optimisticMessage: ChatChannelMessage = {
        id: tempId,
        seq: tempId,
        channelId: conversation.id,
        senderId: currentUserId,
        senderName: user?.name ?? "",
        body,
        createdAt: new Date().toISOString(),
        editedAt: null,
        deletedAt: null,
        replyTo: replyingTo
          ? {
              id: replyingTo.id,
              senderId: replyingTo.senderId,
              senderName: replyingTo.senderName,
              body: replyingTo.body,
            }
          : null,
        forwardedFromSenderName: null,
        reactions: [],
        attachments: [],
      };
      queryClient.setQueryData<ChatMessagePage | undefined>(
        ["chat", "messages", conversation.id],
        (old) => (old ? { ...old, messages: [...old.messages, optimisticMessage] } : old),
      );
      setReplyingTo(null);
      requestAnimationFrame(() => {
        bottomRef.current?.scrollIntoView({ block: "end", behavior: "smooth" });
      });
      return { tempId };
    },
    onSuccess: (message, _body, context) => {
      queryClient.setQueryData<ChatMessagePage | undefined>(
        ["chat", "messages", conversation.id],
        (old) => {
          if (!old) return old;
          const withoutTemp = old.messages.filter((m) => m.id !== context?.tempId);
          if (withoutTemp.some((m) => m.id === message.id)) {
            return { ...old, messages: withoutTemp };
          }
          return { ...old, messages: [...withoutTemp, message] };
        },
      );
      void queryClient.invalidateQueries({ queryKey: ["chat", "conversations"] });
    },
    onError: (err: unknown, _body, context) => {
      queryClient.setQueryData<ChatMessagePage | undefined>(
        ["chat", "messages", conversation.id],
        (old) => {
          if (!old) return old;
          return { ...old, messages: old.messages.filter((m) => m.id !== context?.tempId) };
        },
      );
      toast({
        variant: "error",
        title: "Message not sent",
        description: err instanceof ApiError ? err.message : "Try again",
      });
    },
  });

  const sendAttachmentMutation = useMutation({
    mutationFn: ({ file, caption }: { file: File; caption: string }) =>
      uploadChatAttachment(conversation.id, file, caption || undefined, replyingTo?.id),
    onSuccess: (message) => {
      appendSentMessage(message);
      setReplyingTo(null);
    },
    onError: (err: unknown) => {
      toast({
        variant: "error",
        title: "Attachment failed",
        description: err instanceof ApiError ? err.message : "Configure R2 storage",
      });
    },
  });

  const renameMutation = useMutation({
    mutationFn: () => renameChannel(conversation.id, renameValue.trim()),
    onSuccess: () => {
      setRenameOpen(false);
      void queryClient.invalidateQueries({ queryKey: ["chat", "conversations"] });
      toast({ variant: "success", title: "Group renamed" });
    },
    onError: (err: unknown) => {
      toast({
        variant: "error",
        title: "Rename failed",
        description: err instanceof ApiError ? err.message : "Try again",
      });
    },
  });

  const displayMessages = searchOpen && searchQ.trim().length >= 2 ? searchQuery.data ?? [] : messages;

  return (
    <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
      <div
        className="flex shrink-0 items-center gap-3 border-b px-4 py-3 backdrop-blur-sm"
        style={{
          borderColor: "var(--border)",
          background: "color-mix(in srgb, var(--surface) 88%, transparent)",
        }}
      >
        {conversation.type === "group" ? (
          <span
            className="flex h-10 w-10 items-center justify-center rounded-full shadow-sm"
            style={{
              background: "linear-gradient(145deg, var(--surface-muted), var(--surface-2))",
              color: "var(--muted-strong)",
            }}
          >
            <Users className="h-4 w-4" />
          </span>
        ) : (
          <span
            className="flex h-10 w-10 items-center justify-center rounded-full text-xs font-semibold text-white shadow-sm"
            style={{
              background: avatarColorForIdentity(
                conversation.otherParticipant?.id ?? conversation.id,
              ),
            }}
          >
            {initials(conversation.displayName)}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <p className="ms-text-heading truncate text-[15px] font-semibold tracking-tight">
            {conversation.displayName}
          </p>
          {typingName ? (
            <div className="flex items-center gap-1.5 text-xs text-[var(--accent)]">
              <span className="inline-flex items-center gap-0.5">
                <span className="ms-chat-typing-dot" />
                <span className="ms-chat-typing-dot" />
                <span className="ms-chat-typing-dot" />
              </span>
              <span>{typingName} is typing…</span>
            </div>
          ) : conversation.type === "group" ? (
            <p className="ms-text-muted truncate text-xs">
              {(membersQuery.data ?? []).map((m) => m.name).join(", ") ||
                `${conversation.memberCount} members`}
            </p>
          ) : (
            <p className="ms-text-muted text-xs">Direct message</p>
          )}
        </div>
        <Button
          size="icon"
          variant={searchOpen ? "secondary" : "ghost"}
          aria-label="Search messages"
          className="h-9 w-9 rounded-xl"
          onClick={() => setSearchOpen((v) => !v)}
        >
          {searchOpen ? <X className="h-4 w-4" /> : <Search className="h-4 w-4" />}
        </Button>
        {conversation.type === "group" ? (
          <Button
            size="icon"
            variant={renameOpen ? "secondary" : "ghost"}
            aria-label="Rename group"
            className="h-9 w-9 rounded-xl"
            onClick={() => setRenameOpen((v) => !v)}
          >
            <Pencil className="h-4 w-4" />
          </Button>
        ) : null}
      </div>

      {searchOpen ? (
        <div
          className="border-b px-4 py-2.5"
          style={{ borderColor: "var(--border)", background: "var(--surface)" }}
        >
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2"
              style={{ color: "var(--muted)" }}
            />
            <input
              placeholder="Search in this conversation…"
              value={searchQ}
              onChange={(e) => setSearchQ(e.target.value)}
              aria-label="Search messages"
              className="ms-input h-9 rounded-xl pl-9"
              autoFocus
            />
          </div>
        </div>
      ) : null}

      {renameOpen ? (
        <div
          className="flex items-center gap-2 border-b px-4 py-2.5"
          style={{ borderColor: "var(--border)", background: "var(--surface)" }}
        >
          <input
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            aria-label="Group name"
            className="ms-input h-9 flex-1 rounded-xl"
          />
          <Button
            size="sm"
            disabled={!renameValue.trim() || renameMutation.isPending}
            isLoading={renameMutation.isPending}
            onClick={() => renameMutation.mutate()}
          >
            Save
          </Button>
        </div>
      ) : null}

      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="ms-chat-canvas min-h-0 flex-1 space-y-0.5 overflow-y-auto overflow-x-hidden px-4 py-4"
      >
        {latestQuery.isLoading ? (
          <LoadingState label="Loading messages…" className="min-h-[160px]" />
        ) : (
          <>
            {isLoadingMore ? (
              <p className="ms-text-muted py-2 text-center text-xs">Loading older messages…</p>
            ) : null}
            {searchOpen && searchQ.trim().length >= 2 && searchQuery.isLoading ? (
              <p className="ms-text-muted py-2 text-center text-xs">Searching…</p>
            ) : null}
            {displayMessages.map((message, i) => {
              const prev = displayMessages[i - 1];
              const showDateSeparator =
                !prev || !isSameDay(new Date(prev.createdAt), new Date(message.createdAt));
              const isMine = message.senderId === currentUserId;
              const showSender =
                showDateSeparator ||
                !prev ||
                prev.senderId !== message.senderId ||
                new Date(message.createdAt).getTime() - new Date(prev.createdAt).getTime() >
                  GROUPING_WINDOW_MS;

              return (
                <div key={message.id} className="ms-chat-fade-in">
                  {showDateSeparator ? (
                    <div className="my-4 flex items-center justify-center">
                      <span
                        className="rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-wide shadow-sm"
                        style={{
                          borderColor: "var(--border)",
                          background: "var(--surface)",
                          color: "var(--muted-strong)",
                        }}
                      >
                        {dateSeparatorLabel(new Date(message.createdAt))}
                      </span>
                    </div>
                  ) : null}
                  <MessageBubble
                    message={message}
                    isMine={isMine}
                    showSender={showSender}
                    currentUserId={currentUserId}
                    conversations={conversations}
                    onReply={setReplyingTo}
                  />
                </div>
              );
            })}
            <div ref={bottomRef} />
          </>
        )}
      </div>

      {!searchOpen ? (
        <MessageComposer
          disabled={sendMutation.isPending || sendAttachmentMutation.isPending}
          attachmentsEnabled={attachmentsEnabled}
          onSend={(body) => sendMutation.mutate(body)}
          onSendAttachment={(file, caption) => sendAttachmentMutation.mutate({ file, caption })}
          onTyping={() => {
            void sendTyping(conversation.id).catch(() => undefined);
          }}
          replyingTo={replyingTo}
          onCancelReply={() => setReplyingTo(null)}
        />
      ) : null}
    </div>
  );
}
