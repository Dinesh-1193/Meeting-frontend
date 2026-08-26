"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  useChat,
  useLocalParticipant,
  useRoomContext,
} from "@livekit/components-react";
import { useQuery } from "@tanstack/react-query";
import { Copy, MessageSquare, Reply, Send, SmilePlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState, LoadingState } from "@/components/ui/states";
import { useCallStore } from "@/lib/store/call-store";
import { cn } from "@/lib/utils/cn";
import { getRoom, getRoomChat, sendRoomChat } from "@/lib/api/rooms";
import { useToast } from "@/lib/hooks/use-toast";
import { ApiError } from "@/lib/api/client";
import { CHAT_QUICK_REACTIONS } from "@/types";
import { RoomEvent } from "livekit-client";

interface ChatPanelProps {
  roomId: string;
  className?: string;
}

type UnifiedMessage = {
  key: string;
  body: string;
  senderName: string;
  senderId: string;
  isMine: boolean;
  timestamp: number;
};

type ReactionMap = Record<string, Record<string, string[]>>;

export function ChatPanel({ roomId, className }: ChatPanelProps) {
  const isOpen = useCallStore((s) => s.isChatOpen);
  const setChatOpen = useCallStore((s) => s.setChatOpen);
  const incrementUnreadChat = useCallStore((s) => s.incrementUnreadChat);
  const { chatMessages, send, isSending } = useChat();
  const { localParticipant } = useLocalParticipant();
  const room = useRoomContext();
  const [text, setText] = useState("");
  const [replyTo, setReplyTo] = useState<UnifiedMessage | null>(null);
  const [pickerFor, setPickerFor] = useState<string | null>(null);
  const [reactions, setReactions] = useState<ReactionMap>({});
  const listRef = useRef<HTMLDivElement>(null);
  const prevCount = useRef(0);
  const { toast } = useToast();
  const ownMessageCountRef = useRef(0);

  const roomQuery = useQuery({
    queryKey: ["room", roomId],
    queryFn: () => getRoom(roomId),
    enabled: isOpen,
  });
  const historyQuery = useQuery({
    queryKey: ["chat-history", roomId],
    queryFn: () => getRoomChat(roomId),
    staleTime: Infinity,
  });
  const history = historyQuery.data ?? [];
  const isModerator =
    localParticipant.attributes?.role === "host" ||
    localParticipant.attributes?.role === "cohost";
  const chatAllowed = roomQuery.data?.settings?.allowChat !== false || isModerator;

  const unified = useMemo<UnifiedMessage[]>(() => {
    const fromHistory: UnifiedMessage[] = history.map((msg) => ({
      key: `h:${msg.id}`,
      body: msg.body,
      senderName: msg.senderName,
      senderId: msg.senderId,
      isMine: msg.senderId === localParticipant.identity,
      timestamp: new Date(msg.createdAt).getTime(),
    }));
    const fromLive: UnifiedMessage[] = chatMessages.map((msg) => {
      const isMine =
        msg.from?.identity === localParticipant.identity ||
        msg.from?.sid === localParticipant.sid;
      const senderId = msg.from?.identity ?? msg.from?.sid ?? "unknown";
      return {
        key: `l:${msg.timestamp}:${senderId}:${msg.message}`,
        body: msg.message,
        senderName: isMine
          ? "You"
          : msg.from?.name || msg.from?.identity || "Participant",
        senderId,
        isMine,
        timestamp: msg.timestamp,
      };
    });
    return [...fromHistory, ...fromLive];
  }, [history, chatMessages, localParticipant.identity, localParticipant.sid]);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [unified.length, isOpen]);

  useEffect(() => {
    if (chatMessages.length > prevCount.current && !isOpen) {
      const delta = chatMessages.length - prevCount.current;
      const ownDelta = Math.min(delta, ownMessageCountRef.current);
      ownMessageCountRef.current = Math.max(0, ownMessageCountRef.current - ownDelta);
      const incoming = delta - ownDelta;
      for (let i = 0; i < incoming; i++) incrementUnreadChat();
    }
    prevCount.current = chatMessages.length;
  }, [chatMessages.length, isOpen, incrementUnreadChat]);

  useEffect(() => {
    const onData = (
      payload: Uint8Array,
      participant?: { identity?: string },
    ) => {
      try {
        const raw = new TextDecoder().decode(payload);
        const data = JSON.parse(raw) as {
          type?: string;
          messageKey?: string;
          emoji?: string;
          identity?: string;
        };
        if (data.type !== "chat-reaction" || !data.messageKey || !data.emoji) return;
        const identity = data.identity || participant?.identity || "unknown";
        setReactions((prev) => {
          const byEmoji = { ...(prev[data.messageKey!] ?? {}) };
          const users = new Set(byEmoji[data.emoji!] ?? []);
          if (users.has(identity)) users.delete(identity);
          else users.add(identity);
          if (users.size === 0) delete byEmoji[data.emoji!];
          else byEmoji[data.emoji!] = Array.from(users);
          return { ...prev, [data.messageKey!]: byEmoji };
        });
      } catch {
        // ignore non-json packets
      }
    };
    room.on(RoomEvent.DataReceived, onData);
    return () => {
      room.off(RoomEvent.DataReceived, onData);
    };
  }, [room]);

  const publishReaction = useCallback(
    async (messageKey: string, emoji: string) => {
      const identity = localParticipant.identity;
      setReactions((prev) => {
        const byEmoji = { ...(prev[messageKey] ?? {}) };
        const users = new Set(byEmoji[emoji] ?? []);
        if (users.has(identity)) users.delete(identity);
        else users.add(identity);
        if (users.size === 0) delete byEmoji[emoji];
        else byEmoji[emoji] = Array.from(users);
        return { ...prev, [messageKey]: byEmoji };
      });
      const payload = new TextEncoder().encode(
        JSON.stringify({
          type: "chat-reaction",
          messageKey,
          emoji,
          identity,
        }),
      );
      try {
        await localParticipant.publishData(payload, { reliable: true });
      } catch {
        toast({ variant: "error", title: "Could not send reaction" });
      }
    },
    [localParticipant, toast],
  );

  const onSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const body = text.trim();
      if (!body || !send || !chatAllowed) return;
      const payload = replyTo
        ? `↪ ${replyTo.senderName}: ${replyTo.body.slice(0, 80)}${replyTo.body.length > 80 ? "…" : ""}\n${body}`
        : body;
      try {
        ownMessageCountRef.current += 1;
        await send(payload);
        setText("");
        setReplyTo(null);
        try {
          await sendRoomChat(roomId, { body: payload });
        } catch (err) {
          toast({
            variant: "info",
            title: "Message sent live",
            description:
              err instanceof ApiError
                ? `Could not save to history: ${err.message}`
                : "Could not save to history",
          });
        }
      } catch (err) {
        ownMessageCountRef.current = Math.max(0, ownMessageCountRef.current - 1);
        toast({
          variant: "error",
          title: "Could not send",
          description: err instanceof Error ? err.message : "Try again",
        });
      }
    },
    [text, send, roomId, chatAllowed, toast, replyTo],
  );

  if (!isOpen) return null;

  return (
    <aside
      className={cn(
        "flex h-full w-full max-w-sm flex-col border-l border-slate-800/80 bg-gradient-to-b from-slate-950 via-slate-950 to-slate-900",
        className,
      )}
      aria-label="Chat panel"
    >
      <div className="flex items-center justify-between border-b border-slate-800/80 px-4 py-3.5">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-sky-500/15 text-sky-400">
            <MessageSquare className="h-4 w-4" />
          </span>
          <div>
            <h2 className="text-sm font-semibold tracking-tight text-slate-100">Meeting chat</h2>
            <p className="text-[11px] text-slate-500">Visible to everyone in the call</p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setChatOpen(false)}
          className="h-8 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-slate-100"
        >
          Close
        </Button>
      </div>

      <div
        ref={listRef}
        className="flex-1 space-y-3 overflow-y-auto px-3 py-4"
        style={{
          backgroundImage:
            "radial-gradient(ellipse 70% 40% at 50% 0%, rgba(14,165,233,0.08), transparent), radial-gradient(circle at 1px 1px, rgba(148,163,184,0.08) 1px, transparent 0)",
          backgroundSize: "auto, 20px 20px",
        }}
      >
        {!room ? (
          <LoadingState label="Connecting chat…" />
        ) : unified.length === 0 ? (
          <EmptyState
            title="No messages yet"
            description="Say hello to everyone in the room."
            className="min-h-[180px] border-slate-800 bg-slate-900/40"
          />
        ) : (
          unified.map((msg) => {
            const msgReactions = reactions[msg.key] ?? {};
            return (
              <div
                key={msg.key}
                className={cn("group flex flex-col gap-1", msg.isMine && "items-end")}
              >
                <span className="px-1 text-[11px] font-medium text-slate-500">
                  {msg.isMine ? "You" : msg.senderName}
                </span>
                <div
                  className={cn(
                    "max-w-[92%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed whitespace-pre-wrap shadow-sm",
                    msg.isMine
                      ? "rounded-br-md bg-gradient-to-br from-sky-500 to-sky-600 text-white"
                      : "rounded-bl-md border border-slate-700/80 bg-slate-800/90 text-slate-100",
                  )}
                >
                  {msg.body}
                </div>
                {Object.keys(msgReactions).length > 0 ? (
                  <div className={cn("flex flex-wrap gap-1", msg.isMine && "justify-end")}>
                    {Object.entries(msgReactions).map(([emoji, users]) => (
                      <button
                        key={emoji}
                        type="button"
                        className="rounded-full border border-slate-700 bg-slate-900/90 px-2 py-0.5 text-[11px] text-slate-200 transition hover:border-sky-500/50"
                        onClick={() => void publishReaction(msg.key, emoji)}
                      >
                        {emoji} {users.length}
                      </button>
                    ))}
                  </div>
                ) : null}
                <div
                  className={cn(
                    "inline-flex items-center gap-0.5 rounded-full border border-slate-700/80 bg-slate-900/80 p-0.5 opacity-100 sm:opacity-0 sm:transition sm:group-hover:opacity-100",
                    msg.isMine && "self-end",
                  )}
                >
                  <button
                    type="button"
                    title="Reply"
                    className="rounded-full p-1.5 text-slate-400 hover:bg-slate-800 hover:text-slate-100"
                    onClick={() => setReplyTo(msg)}
                  >
                    <Reply className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    title="React"
                    className="rounded-full p-1.5 text-slate-400 hover:bg-slate-800 hover:text-slate-100"
                    onClick={() => setPickerFor((v) => (v === msg.key ? null : msg.key))}
                  >
                    <SmilePlus className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    title="Copy"
                    className="rounded-full p-1.5 text-slate-400 hover:bg-slate-800 hover:text-slate-100"
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(msg.body);
                        toast({ variant: "success", title: "Copied" });
                      } catch {
                        toast({ variant: "error", title: "Could not copy" });
                      }
                    }}
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </button>
                </div>
                {pickerFor === msg.key ? (
                  <div
                    className={cn(
                      "flex gap-0.5 rounded-full border border-slate-700 bg-slate-900 px-2 py-1 shadow-lg",
                      msg.isMine && "self-end",
                    )}
                  >
                    {CHAT_QUICK_REACTIONS.map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        className="rounded-full p-1 text-sm transition hover:scale-125 hover:bg-slate-800"
                        onClick={() => {
                          void publishReaction(msg.key, emoji);
                          setPickerFor(null);
                        }}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            );
          })
        )}
      </div>

      {chatAllowed ? (
        <form onSubmit={onSubmit} className="border-t border-slate-800/80 p-3">
          {replyTo ? (
            <div className="mb-2 flex items-start justify-between gap-2 rounded-xl border border-slate-700/80 border-l-[3px] border-l-sky-500 bg-slate-900/80 px-2.5 py-2 text-xs text-slate-300">
              <div className="min-w-0">
                <p className="font-semibold text-sky-400">Replying to {replyTo.senderName}</p>
                <p className="mt-0.5 truncate text-slate-500">{replyTo.body}</p>
              </div>
              <button
                type="button"
                aria-label="Cancel reply"
                className="rounded-lg p-1 hover:bg-slate-800"
                onClick={() => setReplyTo(null)}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : null}
          <div className="flex items-end gap-2 rounded-2xl border border-slate-700/80 bg-slate-900/90 p-1.5 shadow-inner">
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Type a message…"
              className="h-9 flex-1 bg-transparent px-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none"
              aria-label="Chat message"
            />
            <Button
              type="submit"
              size="icon"
              disabled={!text.trim() || isSending}
              aria-label="Send message"
              className="h-9 w-9 shrink-0 rounded-xl"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </form>
      ) : (
        <p className="border-t border-slate-800/80 p-3 text-center text-xs text-slate-500">
          The host has turned off chat for this meeting.
        </p>
      )}
    </aside>
  );
}
