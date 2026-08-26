"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { EmptyState, LoadingState } from "@/components/ui/states";
import { ConversationListItem } from "./conversation-list-item";
import type { ChatConversation } from "@/types";

export function ConversationList({
  conversations,
  isLoading,
  selectedId,
  onSelect,
  onLeft,
}: {
  conversations: ChatConversation[];
  isLoading: boolean;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onLeft: (channelId: string) => void;
}) {
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return conversations;
    return conversations.filter(
      (c) =>
        c.displayName.toLowerCase().includes(term) ||
        (c.lastMessagePreview ?? "").toLowerCase().includes(term),
    );
  }, [conversations, q]);

  return (
    <div
      className="flex w-full max-w-[20rem] shrink-0 flex-col overflow-hidden border-r"
      style={{
        borderColor: "var(--border)",
        background: "color-mix(in srgb, var(--surface) 92%, var(--surface-2))",
      }}
    >
      <div className="shrink-0 border-b px-3 pb-3 pt-3.5" style={{ borderColor: "var(--border)" }}>
        <p className="ms-text-heading mb-2.5 px-0.5 text-xs font-semibold uppercase tracking-wider">
          Conversations
        </p>
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2"
            style={{ color: "var(--muted)" }}
          />
          <input
            placeholder="Search chats…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            aria-label="Search conversations"
            className="ms-input h-9 rounded-xl pl-9 text-sm"
          />
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-2 py-2">
        {isLoading ? (
          <LoadingState label="Loading chats…" className="min-h-[160px]" />
        ) : filtered.length === 0 ? (
          <EmptyState
            title={conversations.length === 0 ? "No conversations yet" : "No matches"}
            description={
              conversations.length === 0
                ? "Start a new chat to message someone."
                : "Try a different search."
            }
            className="min-h-[160px] border-0 bg-transparent"
          />
        ) : (
          <div className="space-y-1">
            {filtered.map((c) => (
              <ConversationListItem
                key={c.id}
                conversation={c}
                isSelected={c.id === selectedId}
                onSelect={() => onSelect(c.id)}
                onLeft={() => onLeft(c.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
