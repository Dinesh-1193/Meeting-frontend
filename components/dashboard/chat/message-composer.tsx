"use client";

import { useRef, useState } from "react";
import { Paperclip, Send, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ChatChannelMessage } from "@/types";

export function MessageComposer({
  onSend,
  onSendAttachment,
  onTyping,
  disabled,
  attachmentsEnabled,
  replyingTo,
  onCancelReply,
}: {
  onSend: (body: string) => void;
  onSendAttachment: (file: File, caption: string) => void;
  onTyping?: () => void;
  disabled?: boolean;
  attachmentsEnabled?: boolean;
  replyingTo: ChatChannelMessage | null;
  onCancelReply: () => void;
}) {
  const [value, setValue] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const lastTypingRef = useRef(0);

  const submit = () => {
    const trimmed = value.trim();
    if (file) {
      onSendAttachment(file, trimmed);
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } else {
      if (!trimmed) return;
      onSend(trimmed);
    }
    setValue("");
  };

  const canSend = Boolean(value.trim() || file);

  return (
    <div
      className="shrink-0 border-t px-3 pb-3 pt-2"
      style={{
        borderColor: "var(--border)",
        background: "color-mix(in srgb, var(--surface) 94%, transparent)",
      }}
    >
      {replyingTo ? (
        <div
          className="mb-2 flex items-start justify-between gap-2 rounded-xl border-l-[3px] px-3 py-2 text-xs"
          style={{
            borderColor: "var(--accent)",
            background: "color-mix(in srgb, var(--accent) 8%, var(--surface))",
          }}
        >
          <div className="min-w-0">
            <p className="font-semibold text-[var(--accent)]">Replying to {replyingTo.senderName}</p>
            <p className="ms-text-muted mt-0.5 truncate">{replyingTo.body || "Attachment"}</p>
          </div>
          <button
            type="button"
            aria-label="Cancel reply"
            className="shrink-0 rounded-lg p-1 hover:bg-[var(--hover)]"
            onClick={onCancelReply}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : null}

      {file ? (
        <div
          className="mb-2 flex items-center justify-between gap-2 rounded-xl border px-3 py-2 text-xs"
          style={{ borderColor: "var(--border)", background: "var(--surface-muted)" }}
        >
          <span className="flex min-w-0 items-center gap-2">
            <span
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg"
              style={{ background: "var(--accent-soft)", color: "var(--accent)" }}
            >
              <Paperclip className="h-3.5 w-3.5" />
            </span>
            <span className="truncate font-medium">{file.name}</span>
          </span>
          <button
            type="button"
            aria-label="Remove attachment"
            className="shrink-0 rounded-lg p-1 hover:bg-[var(--hover)]"
            onClick={() => {
              setFile(null);
              if (fileInputRef.current) fileInputRef.current.value = "";
            }}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : null}

      <form
        className="flex items-end gap-2 rounded-2xl border p-1.5 shadow-sm"
        style={{
          borderColor: "var(--border)",
          background: "var(--input-bg)",
          boxShadow: "var(--shadow-soft)",
        }}
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={(e) => {
            const picked = e.target.files?.[0];
            if (picked) setFile(picked);
          }}
        />
        {attachmentsEnabled ? (
          <Button
            type="button"
            size="icon"
            variant="ghost"
            aria-label="Attach file"
            className="h-9 w-9 shrink-0 rounded-xl"
            onClick={() => fileInputRef.current?.click()}
          >
            <Paperclip className="h-4 w-4" />
          </Button>
        ) : null}
        <textarea
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            const now = Date.now();
            if (onTyping && now - lastTypingRef.current > 2000) {
              lastTypingRef.current = now;
              onTyping();
            }
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
          placeholder={file ? "Add a caption (optional)…" : "Write a message…"}
          rows={1}
          maxLength={4000}
          className="max-h-32 min-h-[36px] flex-1 resize-none bg-transparent px-1 py-2 text-sm text-[var(--foreground)] outline-none placeholder:text-[var(--muted)]"
        />
        <Button
          type="submit"
          size="icon"
          disabled={disabled || !canSend}
          aria-label="Send message"
          className="h-9 w-9 shrink-0 rounded-xl shadow-sm"
        >
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
}
