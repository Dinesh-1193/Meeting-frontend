"use client";

import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Users } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/states";
import { avatarColorForIdentity } from "@/lib/utils/avatar-color";
import { sendChannelMessage } from "@/lib/api";
import { useToast } from "@/lib/hooks/use-toast";
import { cn } from "@/lib/utils/cn";
import type { ChatChannelMessage, ChatConversation } from "@/types";

function initials(name: string): string {
  return name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function ForwardMessageModal({
  open,
  onClose,
  message,
  conversations,
}: {
  open: boolean;
  onClose: () => void;
  message: ChatChannelMessage;
  conversations: ChatConversation[];
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return conversations;
    return conversations.filter((c) => c.displayName.toLowerCase().includes(term));
  }, [conversations, q]);

  const forwardMutation = useMutation({
    mutationFn: (targetChannelId: string) => {
      if (!message.body.trim()) {
        throw new Error("Only text messages can be forwarded");
      }
      return sendChannelMessage(targetChannelId, message.body, {
        forwardedFromSenderName: message.senderName,
      });
    },
    onSuccess: () => {
      toast({ variant: "success", title: "Message forwarded" });
      void queryClient.invalidateQueries({ queryKey: ["chat", "conversations"] });
      onClose();
    },
    onError: (err: unknown) =>
      toast({
        variant: "error",
        title: "Could not forward message",
        description: err instanceof Error ? err.message : undefined,
      }),
  });

  const canForward = Boolean(message.body.trim());

  return (
    <Modal
      open={open}
      onClose={() => {
        setQ("");
        onClose();
      }}
      title="Forward message"
    >
      <div className="space-y-3">
        {!canForward ? (
          <p className="ms-text-muted text-sm">
            This message has no text to forward. Copy the attachment link instead.
          </p>
        ) : message.attachments.length > 0 ? (
          <p className="ms-text-muted text-sm">
            Attachments won&apos;t be included — only the text will be forwarded.
          </p>
        ) : null}
        <Input
          placeholder="Search conversations…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          aria-label="Search conversations"
          disabled={!canForward}
        />

        <div
          className="max-h-72 space-y-0.5 overflow-y-auto rounded-lg border"
          style={{ borderColor: "var(--border)" }}
        >
          {filtered.length === 0 ? (
            <EmptyState title="No conversations found" className="min-h-[120px] border-0 bg-transparent" />
          ) : (
            filtered.map((c) => (
              <button
                key={c.id}
                type="button"
                disabled={forwardMutation.isPending || !canForward}
                onClick={() => forwardMutation.mutate(c.id)}
                className={cn(
                  "flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm transition hover:bg-[var(--hover)]",
                )}
              >
                {c.type === "group" ? (
                  <span
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
                    style={{ background: "var(--surface-muted)", color: "var(--muted-strong)" }}
                  >
                    <Users className="h-4 w-4" />
                  </span>
                ) : (
                  <span
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white"
                    style={{ background: avatarColorForIdentity(c.otherParticipant?.id ?? c.id) }}
                  >
                    {initials(c.displayName)}
                  </span>
                )}
                <p className="ms-text-heading truncate font-medium">{c.displayName}</p>
              </button>
            ))
          )}
        </div>

        <div className="flex justify-end pt-1">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </div>
    </Modal>
  );
}
