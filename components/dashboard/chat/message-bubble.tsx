"use client";

import { useEffect, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Copy,
  Forward,
  MoreHorizontal,
  Paperclip,
  Pencil,
  Reply,
  Trash2,
} from "lucide-react";
import { deleteMessage, editMessage, toggleReaction } from "@/lib/api";
import { formatTime } from "@/lib/utils/calendar";
import { cn } from "@/lib/utils/cn";
import { useToast } from "@/lib/hooks/use-toast";
import { ApiError } from "@/lib/api/client";
import { CHAT_QUICK_REACTIONS } from "@/types";
import type { ChatChannelMessage, ChatConversation, ChatMessagePage } from "@/types";
import { ForwardMessageModal } from "./forward-message-modal";

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Applies a reaction toggle to a reactions array without waiting on the server. */
function toggleReactionLocally(
  reactions: ChatChannelMessage["reactions"],
  emoji: string,
  userId: string,
): ChatChannelMessage["reactions"] {
  const existing = reactions.find((r) => r.emoji === emoji);
  if (existing?.userIds.includes(userId)) {
    const userIds = existing.userIds.filter((id) => id !== userId);
    return userIds.length
      ? reactions.map((r) => (r.emoji === emoji ? { ...r, userIds } : r))
      : reactions.filter((r) => r.emoji !== emoji);
  }
  if (existing) {
    return reactions.map((r) =>
      r.emoji === emoji ? { ...r, userIds: [...r.userIds, userId] } : r,
    );
  }
  return [...reactions, { emoji, userIds: [userId] }];
}

export function MessageBubble({
  message,
  isMine,
  showSender,
  currentUserId,
  conversations,
  onReply,
}: {
  message: ChatChannelMessage;
  isMine: boolean;
  showSender: boolean;
  currentUserId: string;
  conversations: ChatConversation[];
  onReply: (message: ChatChannelMessage) => void;
}) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [menuOpen, setMenuOpen] = useState(false);
  const [forwardOpen, setForwardOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(message.body);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onClickAway = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", onClickAway);
    return () => document.removeEventListener("mousedown", onClickAway);
  }, [menuOpen]);

  const patchMessageCache = (updated: ChatChannelMessage) => {
    queryClient.setQueryData<ChatMessagePage | undefined>(
      ["chat", "messages", message.channelId],
      (old) => {
        if (!old) return old;
        return {
          ...old,
          messages: old.messages.map((m) => (m.id === updated.id ? updated : m)),
        };
      },
    );
  };

  const reactMutation = useMutation({
    mutationFn: (emoji: string) => toggleReaction(message.channelId, message.id, emoji),
    onMutate: (emoji) => {
      const previous = message.reactions;
      patchMessageCache({
        ...message,
        reactions: toggleReactionLocally(message.reactions, emoji, currentUserId),
      });
      return { previous };
    },
    onSuccess: ({ reactions }) => {
      patchMessageCache({ ...message, reactions });
    },
    onError: (err: unknown, _emoji, context) => {
      if (context?.previous) patchMessageCache({ ...message, reactions: context.previous });
      toast({
        variant: "error",
        title: "Reaction failed",
        description: err instanceof ApiError ? err.message : "Try again",
      });
    },
  });

  const editMutation = useMutation({
    mutationFn: (body: string) => editMessage(message.channelId, message.id, body),
    onSuccess: (updated) => {
      patchMessageCache(updated);
      setIsEditing(false);
      toast({ variant: "success", title: "Message updated" });
    },
    onError: (err: unknown) => {
      toast({
        variant: "error",
        title: "Edit failed",
        description: err instanceof ApiError ? err.message : "Try again",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteMessage(message.channelId, message.id),
    onSuccess: (updated) => {
      patchMessageCache(updated);
      void queryClient.invalidateQueries({ queryKey: ["chat", "conversations"] });
      toast({ variant: "success", title: "Message deleted" });
    },
    onError: (err: unknown) => {
      toast({
        variant: "error",
        title: "Delete failed",
        description: err instanceof ApiError ? err.message : "Try again",
      });
    },
  });

  const copy = async () => {
    const text =
      message.body.trim() ||
      message.attachments.map((a) => a.url || a.filename).filter(Boolean).join("\n");
    if (!text) {
      toast({ variant: "error", title: "Nothing to copy" });
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      toast({ variant: "success", title: "Copied" });
    } catch {
      toast({ variant: "error", title: "Could not copy" });
    }
  };

  if (message.deletedAt) {
    return (
      <div className={cn("mb-2 flex flex-col", isMine ? "items-end" : "items-start")}>
        {showSender && !isMine ? (
          <span className="ms-text-muted mb-1 px-1.5 text-[11px] font-medium">
            {message.senderName}
          </span>
        ) : null}
        <p
          className="rounded-2xl border border-dashed px-3 py-2 text-xs italic"
          style={{ borderColor: "var(--border)", color: "var(--muted)" }}
        >
          This message was deleted
        </p>
      </div>
    );
  }

  const canForward = Boolean(message.body.trim());
  const isPending = message.id.startsWith("temp-");

  return (
    <div className={cn("group mb-2 flex flex-col", isMine ? "items-end" : "items-start")}>
      {showSender && !isMine ? (
        <span className="ms-text-muted mb-1 px-1.5 text-[11px] font-semibold tracking-tight">
          {message.senderName}
        </span>
      ) : null}

      <div className={cn("flex max-w-[min(85%,28rem)] items-end gap-1.5", isMine ? "flex-row-reverse" : "flex-row")}>
        <div className={cn("relative flex min-w-0 flex-col gap-1.5", isPending && "opacity-60")}>
          {message.replyTo ? (
            <div
              className="rounded-xl border-l-[3px] px-2.5 py-1.5 text-xs"
              style={{
                borderColor: "var(--accent)",
                background: "color-mix(in srgb, var(--accent) 8%, var(--surface))",
                color: "var(--muted-strong)",
              }}
            >
              <p className="font-semibold text-[var(--accent)]">{message.replyTo.senderName}</p>
              <p className="mt-0.5 truncate opacity-90">{message.replyTo.body || "Attachment"}</p>
            </div>
          ) : null}

          {message.forwardedFromSenderName ? (
            <span className="ms-text-muted flex items-center gap-1 px-1 text-[10px] font-medium italic">
              <Forward className="h-3 w-3" />
              Forwarded from {message.forwardedFromSenderName}
            </span>
          ) : null}

          {isEditing ? (
            <div
              className="flex flex-col gap-2 rounded-2xl border p-2.5"
              style={{ borderColor: "var(--border)", background: "var(--surface)" }}
            >
              <textarea
                autoFocus
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                rows={2}
                maxLength={4000}
                className="ms-input min-w-[220px] resize-none rounded-xl py-2 text-sm"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    if (editValue.trim()) editMutation.mutate(editValue.trim());
                  }
                  if (e.key === "Escape") setIsEditing(false);
                }}
              />
              <div className="flex justify-end gap-2 text-xs">
                <button
                  type="button"
                  className="rounded-lg px-2.5 py-1 ms-text-muted hover:bg-[var(--hover)]"
                  onClick={() => setIsEditing(false)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="rounded-lg px-2.5 py-1 font-semibold text-white"
                  style={{ background: "var(--accent)" }}
                  disabled={!editValue.trim() || editMutation.isPending}
                  onClick={() => editValue.trim() && editMutation.mutate(editValue.trim())}
                >
                  Save
                </button>
              </div>
            </div>
          ) : (
            <>
              {message.body ? (
                <div
                  className={cn(
                    "rounded-[1.15rem] px-3.5 py-2 text-[13.5px] leading-relaxed",
                    isMine ? "ms-chat-bubble-mine rounded-br-md" : "ms-chat-bubble-theirs rounded-bl-md",
                  )}
                >
                  <span className="whitespace-pre-wrap break-words">{message.body}</span>
                </div>
              ) : null}

              {message.attachments.map((att) =>
                att.contentType.startsWith("image/") ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={att.id}
                    src={att.url}
                    alt={att.filename}
                    className="max-h-64 max-w-[240px] rounded-2xl border object-cover shadow-sm"
                    style={{ borderColor: "var(--border)" }}
                  />
                ) : (
                  <a
                    key={att.id}
                    href={att.url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-2.5 rounded-2xl border px-3 py-2.5 text-xs transition hover:bg-[var(--hover)]"
                    style={{
                      borderColor: "var(--border)",
                      background: "var(--surface)",
                      boxShadow: "var(--shadow-soft)",
                    }}
                  >
                    <span
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl"
                      style={{ background: "var(--accent-soft)", color: "var(--accent)" }}
                    >
                      <Paperclip className="h-3.5 w-3.5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="ms-text-heading block truncate font-medium">{att.filename}</span>
                      <span className="ms-text-muted">{formatFileSize(att.sizeBytes)}</span>
                    </span>
                  </a>
                ),
              )}
            </>
          )}

          {message.reactions.length > 0 ? (
            <div className={cn("flex flex-wrap gap-1", isMine && "justify-end")}>
              {message.reactions.map((r) => {
                const mine = r.userIds.includes(currentUserId);
                return (
                  <button
                    key={r.emoji}
                    type="button"
                    title={`${r.userIds.length} reaction${r.userIds.length === 1 ? "" : "s"}`}
                    onClick={() => reactMutation.mutate(r.emoji)}
                    className={cn(
                      "flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] shadow-sm transition hover:scale-105",
                      mine && "ring-1 ring-[var(--accent)]",
                    )}
                    style={{
                      borderColor: mine ? "var(--accent)" : "var(--border)",
                      background: mine
                        ? "color-mix(in srgb, var(--accent) 12%, var(--surface))"
                        : "var(--surface)",
                    }}
                  >
                    <span>{r.emoji}</span>
                    <span className={mine ? "font-semibold text-[var(--accent)]" : "ms-text-muted"}>
                      {r.userIds.length}
                    </span>
                  </button>
                );
              })}
            </div>
          ) : null}

          {!isEditing && !isPending ? (
            <div
              ref={menuRef}
              className={cn(
                "absolute -top-2.5 z-20 opacity-0 transition group-hover:opacity-100",
                isMine ? "-left-2.5" : "-right-2.5",
                menuOpen && "opacity-100",
              )}
            >
              <button
                type="button"
                aria-label="Message options"
                onClick={() => setMenuOpen((v) => !v)}
                className="flex h-6 w-6 items-center justify-center rounded-full border shadow-sm transition hover:scale-105"
                style={{
                  borderColor: "var(--border)",
                  background: "var(--surface)",
                  color: "var(--muted-strong)",
                  boxShadow: "var(--shadow-soft)",
                }}
              >
                <MoreHorizontal className="h-3.5 w-3.5" />
              </button>

              {menuOpen ? (
                <div
                  className={cn(
                    "absolute z-20 min-w-[176px] overflow-hidden rounded-xl border py-1.5 shadow-xl",
                    isMine ? "right-0" : "left-0",
                  )}
                  style={{
                    top: "100%",
                    marginTop: 6,
                    borderColor: "var(--border)",
                    background: "var(--surface)",
                    boxShadow: "var(--shadow-soft)",
                  }}
                >
                  <div
                    className="flex items-center justify-around gap-0.5 border-b px-2 py-1.5"
                    style={{ borderColor: "var(--border)" }}
                  >
                    {CHAT_QUICK_REACTIONS.map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        className="rounded-full p-1 text-base transition hover:scale-125 hover:bg-[var(--hover)]"
                        onClick={() => {
                          reactMutation.mutate(emoji);
                          setMenuOpen(false);
                        }}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-xs font-medium hover:bg-[var(--hover)]"
                    onClick={() => {
                      setMenuOpen(false);
                      onReply(message);
                    }}
                  >
                    <Reply className="h-3.5 w-3.5" />
                    Reply
                  </button>
                  <button
                    type="button"
                    className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-xs font-medium hover:bg-[var(--hover)]"
                    onClick={() => {
                      setMenuOpen(false);
                      void copy();
                    }}
                  >
                    <Copy className="h-3.5 w-3.5" />
                    Copy
                  </button>
                  <button
                    type="button"
                    className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-xs font-medium hover:bg-[var(--hover)] disabled:opacity-40"
                    disabled={!canForward}
                    onClick={() => {
                      setMenuOpen(false);
                      setForwardOpen(true);
                    }}
                  >
                    <Forward className="h-3.5 w-3.5" />
                    Forward
                  </button>
                  {isMine && message.body ? (
                    <button
                      type="button"
                      className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-xs font-medium hover:bg-[var(--hover)]"
                      onClick={() => {
                        setMenuOpen(false);
                        setEditValue(message.body);
                        setIsEditing(true);
                      }}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      Edit
                    </button>
                  ) : null}
                  {isMine ? (
                    <>
                      <div className="my-1 border-t" style={{ borderColor: "var(--border)" }} />
                      <button
                        type="button"
                        className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-xs font-medium text-[var(--danger)] hover:bg-[var(--hover)]"
                        disabled={deleteMutation.isPending}
                        onClick={() => {
                          setMenuOpen(false);
                          if (window.confirm("Delete this message?")) deleteMutation.mutate();
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Delete
                      </button>
                    </>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>

      <span className="ms-text-muted mt-0.5 px-1 text-[10px] tabular-nums">
        {isPending ? "Sending…" : formatTime(new Date(message.createdAt))}
        {!isPending && message.editedAt ? " · edited" : ""}
      </span>

      <ForwardMessageModal
        open={forwardOpen}
        onClose={() => setForwardOpen(false)}
        message={message}
        conversations={conversations.filter((c) => c.id !== message.channelId)}
      />
    </div>
  );
}
