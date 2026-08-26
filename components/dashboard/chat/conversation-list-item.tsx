"use client";

import { useEffect, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { BellOff, MoreVertical, Pin, PinOff, Trash2, Users } from "lucide-react";
import { avatarColorForIdentity } from "@/lib/utils/avatar-color";
import { formatRelativeTime } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";
import { leaveChannel, muteChannel, pinChannel } from "@/lib/api";
import { useToast } from "@/lib/hooks/use-toast";
import { ApiError } from "@/lib/api/client";
import type { ChatConversation } from "@/types";

function initials(name: string): string {
  return name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function ConversationListItem({
  conversation,
  isSelected,
  onSelect,
  onLeft,
}: {
  conversation: ChatConversation;
  isSelected: boolean;
  onSelect: () => void;
  onLeft: () => void;
}) {
  const unread = conversation.unreadCount > 0 && !conversation.muted;
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onClickAway = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", onClickAway);
    return () => document.removeEventListener("mousedown", onClickAway);
  }, [menuOpen]);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["chat", "conversations"] });

  const muteMutation = useMutation({
    mutationFn: () => muteChannel(conversation.id, !conversation.muted),
    onSuccess: invalidate,
    onError: (err: unknown) =>
      toast({
        variant: "error",
        title: "Could not update mute",
        description: err instanceof ApiError ? err.message : "Try again",
      }),
  });
  const pinMutation = useMutation({
    mutationFn: () => pinChannel(conversation.id, !conversation.pinnedAt),
    onSuccess: invalidate,
    onError: (err: unknown) =>
      toast({
        variant: "error",
        title: "Could not update pin",
        description: err instanceof ApiError ? err.message : "Try again",
      }),
  });
  const leaveMutation = useMutation({
    mutationFn: () => leaveChannel(conversation.id),
    onSuccess: () => {
      onLeft();
      invalidate();
    },
    onError: (err: unknown) =>
      toast({
        variant: "error",
        title: "Could not leave chat",
        description: err instanceof ApiError ? err.message : "Try again",
      }),
  });

  return (
    <div className="group relative">
      <button
        type="button"
        onClick={onSelect}
        className={cn(
          "flex w-full items-center gap-3 rounded-xl px-2.5 py-2.5 text-left transition-all duration-150",
          isSelected ? "bg-[var(--accent-soft)]" : "hover:bg-[var(--hover)]",
        )}
        style={
          isSelected
            ? { boxShadow: "inset 0 0 0 1px color-mix(in srgb, var(--accent) 40%, transparent)" }
            : undefined
        }
      >
        {conversation.type === "group" ? (
          <span
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full ring-2 ring-white/80 dark:ring-slate-900/40"
            style={{
              background: "linear-gradient(145deg, var(--surface-muted), var(--surface-2))",
              color: "var(--muted-strong)",
            }}
          >
            <Users className="h-4 w-4" />
          </span>
        ) : (
          <span
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[13px] font-semibold text-white shadow-sm ring-2 ring-white/80 dark:ring-slate-900/40"
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
          <div className="flex items-center justify-between gap-2">
            <span className="flex min-w-0 items-center gap-1">
              {conversation.pinnedAt ? (
                <Pin className="h-3 w-3 shrink-0" style={{ color: "var(--accent)" }} />
              ) : null}
              <p
                className={cn(
                  "truncate text-[13px] tracking-tight",
                  unread
                    ? "font-semibold text-[var(--foreground)]"
                    : "font-medium text-[var(--foreground)]",
                )}
              >
                {conversation.displayName}
              </p>
            </span>
            {conversation.lastMessageCreatedAt ? (
              <span
                className={cn(
                  "shrink-0 text-[10px] tabular-nums group-hover:mr-7",
                  unread ? "font-medium text-[var(--accent)]" : "ms-text-muted",
                )}
              >
                {formatRelativeTime(conversation.lastMessageCreatedAt)}
              </span>
            ) : null}
          </div>
          <div className="mt-0.5 flex items-center justify-between gap-2">
            <p
              className={cn(
                "truncate text-xs leading-snug",
                unread ? "font-medium text-[var(--muted-strong)]" : "ms-text-muted",
              )}
            >
              {conversation.lastMessagePreview ?? "No messages yet"}
            </p>
            {conversation.muted ? (
              <BellOff className="h-3 w-3 shrink-0" style={{ color: "var(--muted)" }} />
            ) : unread ? (
              <span
                className="flex h-[18px] min-w-[18px] shrink-0 items-center justify-center rounded-full px-1 text-[10px] font-bold text-white shadow-sm"
                style={{ background: "var(--accent)" }}
              >
                {conversation.unreadCount > 9 ? "9+" : conversation.unreadCount}
              </span>
            ) : null}
          </div>
        </div>
      </button>

      <div ref={menuRef} className="absolute right-2 top-2">
        <button
          type="button"
          aria-label="Conversation actions"
          onClick={(e) => {
            e.stopPropagation();
            setMenuOpen((v) => !v);
          }}
          className={cn(
            "flex h-7 w-7 items-center justify-center rounded-lg opacity-0 transition hover:bg-[var(--hover)] group-hover:opacity-100",
            menuOpen && "opacity-100",
            isSelected && "hover:bg-white/50 dark:hover:bg-black/20",
          )}
        >
          <MoreVertical className="h-3.5 w-3.5" style={{ color: "var(--muted-strong)" }} />
        </button>

        {menuOpen ? (
          <div
            className="absolute right-0 top-8 z-10 w-44 overflow-hidden rounded-xl border py-1.5 text-sm shadow-xl"
            style={{
              borderColor: "var(--border)",
              background: "var(--surface)",
              boxShadow: "var(--shadow-soft)",
            }}
          >
            <button
              type="button"
              className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-[13px] hover:bg-[var(--hover)]"
              onClick={() => {
                setMenuOpen(false);
                muteMutation.mutate();
              }}
            >
              <BellOff className="h-3.5 w-3.5" />
              {conversation.muted ? "Unmute" : "Mute"}
            </button>
            <button
              type="button"
              className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-[13px] hover:bg-[var(--hover)]"
              onClick={() => {
                setMenuOpen(false);
                pinMutation.mutate();
              }}
            >
              {conversation.pinnedAt ? (
                <PinOff className="h-3.5 w-3.5" />
              ) : (
                <Pin className="h-3.5 w-3.5" />
              )}
              {conversation.pinnedAt ? "Unpin" : "Pin"}
            </button>
            <div className="my-1 border-t" style={{ borderColor: "var(--border)" }} />
            <button
              type="button"
              className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-[13px] text-[var(--danger)] hover:bg-[var(--hover)]"
              onClick={() => {
                setMenuOpen(false);
                if (window.confirm(`Delete this chat with ${conversation.displayName}?`)) {
                  leaveMutation.mutate();
                }
              }}
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete chat
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
