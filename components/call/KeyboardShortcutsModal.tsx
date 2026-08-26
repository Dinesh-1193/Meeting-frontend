"use client";

import { Modal } from "@/components/ui/modal";

interface KeyboardShortcutsModalProps {
  open: boolean;
  onClose: () => void;
  canPublish?: boolean;
  canScreenShare?: boolean;
}

const isMac =
  typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform ?? navigator.userAgent);
const mod = isMac ? "⌘" : "Ctrl";
const alt = isMac ? "⌥" : "Alt";

function Row({ keys, label }: { keys: string; label: string }) {
  return (
    <div className="flex items-center justify-between gap-4 py-1.5 text-sm">
      <span className="text-[var(--foreground)]">{label}</span>
      <kbd className="rounded-md border border-[var(--border)] bg-[var(--surface-muted)] px-2 py-1 font-mono text-xs text-[var(--foreground)]">
        {keys}
      </kbd>
    </div>
  );
}

export function KeyboardShortcutsModal({
  open,
  onClose,
  canPublish = true,
  canScreenShare = true,
}: KeyboardShortcutsModalProps) {
  return (
    <Modal open={open} onClose={onClose} title="Keyboard shortcuts">
      <div className="divide-y divide-[var(--border)]">
        {canPublish ? (
          <>
            <Row keys={`${mod} D`} label="Turn microphone on/off" />
            <Row keys={`${mod} E`} label="Turn camera on/off" />
          </>
        ) : null}
        {canPublish && canScreenShare ? (
          <Row keys={`${mod} ${alt} S`} label="Start/stop screen share" />
        ) : null}
        <Row keys={`${mod} ${alt} H`} label="Raise/lower hand" />
        <Row keys={`${mod} ${alt} C`} label="Toggle chat" />
        <Row keys={`${mod} ${alt} P`} label="Toggle participants" />
        <Row keys="?" label="Show this shortcuts list" />
      </div>
    </Modal>
  );
}
