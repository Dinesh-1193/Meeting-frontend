"use client";

import { useEffect } from "react";
import { useCallStore } from "@/lib/store/call-store";
import { useRaiseHand } from "./use-raise-hand";

interface UseCallKeyboardShortcutsOptions {
  canPublish: boolean;
  canScreenShare: boolean;
  toggleMic: () => void | Promise<void>;
  toggleCamera: () => void | Promise<void>;
  toggleScreenShare: () => void | Promise<void>;
}

function isTypingTarget(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false;
  const tag = el.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || el.isContentEditable;
}

/**
 * Global call shortcuts, mirroring Google Meet's Ctrl/Cmd modifier scheme so
 * they don't collide with typing in chat, polls, or Q&A inputs.
 */
export function useCallKeyboardShortcuts({
  canPublish,
  canScreenShare,
  toggleMic,
  toggleCamera,
  toggleScreenShare,
}: UseCallKeyboardShortcutsOptions) {
  const { toggle: toggleRaiseHand } = useRaiseHand();

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (isTypingTarget(e.target)) return;
      const mod = e.metaKey || e.ctrlKey;

      if (mod && !e.altKey && !e.shiftKey && e.key.toLowerCase() === "d") {
        if (!canPublish) return;
        e.preventDefault();
        void toggleMic();
        return;
      }

      if (mod && !e.altKey && !e.shiftKey && e.key.toLowerCase() === "e") {
        if (!canPublish) return;
        e.preventDefault();
        void toggleCamera();
        return;
      }

      if (mod && e.altKey && e.key.toLowerCase() === "s") {
        if (!canPublish || !canScreenShare) return;
        e.preventDefault();
        void toggleScreenShare();
        return;
      }

      if (mod && e.altKey && e.key.toLowerCase() === "h") {
        e.preventDefault();
        void toggleRaiseHand();
        return;
      }

      if (mod && e.altKey && e.key.toLowerCase() === "c") {
        e.preventDefault();
        const { isChatOpen, setChatOpen } = useCallStore.getState();
        setChatOpen(!isChatOpen);
        return;
      }

      if (mod && e.altKey && e.key.toLowerCase() === "p") {
        e.preventDefault();
        const { isParticipantsOpen, setParticipantsOpen } = useCallStore.getState();
        setParticipantsOpen(!isParticipantsOpen);
        return;
      }

      if (!mod && !e.altKey && e.key === "?") {
        e.preventDefault();
        const { isShortcutsOpen, setShortcutsOpen } = useCallStore.getState();
        setShortcutsOpen(!isShortcutsOpen);
        return;
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [canPublish, canScreenShare, toggleMic, toggleCamera, toggleScreenShare, toggleRaiseHand]);
}
