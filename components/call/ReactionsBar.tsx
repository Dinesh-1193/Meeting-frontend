"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useDataChannel, useLocalParticipant } from "@livekit/components-react";
import { SmilePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCallStore } from "@/lib/store/call-store";
import { cn } from "@/lib/utils/cn";

const EMOJIS = ["👍", "❤️", "😂", "👏", "🎉", "🙌"];

interface FloatingReaction {
  id: number;
  emoji: string;
  label: string;
}

interface ReactionMessage {
  emoji: string;
}

export function ReactionsBar({ className }: { className?: string }) {
  const { localParticipant } = useLocalParticipant();
  const [floating, setFloating] = useState<FloatingReaction[]>([]);
  const nextId = useRef(0);
  const isOpen = useCallStore((s) => s.isReactionsOpen);
  const setReactionsOpen = useCallStore((s) => s.setReactionsOpen);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const onDocClick = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) {
        setReactionsOpen(false);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [isOpen, setReactionsOpen]);

  const spawn = useCallback((emoji: string, label: string) => {
    const id = nextId.current++;
    setFloating((prev) => [...prev, { id, emoji, label }]);
    setTimeout(() => {
      setFloating((prev) => prev.filter((f) => f.id !== id));
    }, 2200);
  }, []);

  const { send } = useDataChannel("reactions", (msg) => {
    try {
      const data = JSON.parse(new TextDecoder().decode(msg.payload)) as ReactionMessage;
      spawn(data.emoji, msg.from?.name || msg.from?.identity || "Someone");
    } catch {
      // ignore malformed payloads
    }
  });

  const sendReaction = async (emoji: string) => {
    spawn(emoji, `${localParticipant.name || "You"} (You)`);
    setReactionsOpen(false);
    const payload = new TextEncoder().encode(JSON.stringify({ emoji }));
    try {
      await send(payload, { reliable: false });
    } catch {
      // best-effort — reactions are ephemeral
    }
  };

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <div
        className="pointer-events-none absolute bottom-full left-1/2 flex -translate-x-1/2 flex-col items-center gap-1 pb-2"
        aria-live="polite"
      >
        {floating.map((f) => (
          <span
            key={f.id}
            className="animate-[float-up_2.2s_ease-out_forwards] text-2xl drop-shadow"
            title={f.label}
          >
            {f.emoji}
          </span>
        ))}
      </div>

      {isOpen ? (
        <div className="absolute bottom-full left-1/2 mb-2 flex -translate-x-1/2 items-center gap-1 rounded-full border border-slate-700 bg-slate-900/95 px-2 py-1.5 shadow-xl">
          {EMOJIS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              className="rounded-full p-1.5 text-lg hover:bg-slate-800"
              aria-label={`Send ${emoji} reaction`}
              onClick={() => void sendReaction(emoji)}
            >
              {emoji}
            </button>
          ))}
        </div>
      ) : null}

      <Button
        variant={isOpen ? "primary" : "secondary"}
        size="icon"
        className="rounded-full"
        onClick={() => setReactionsOpen(!isOpen)}
        aria-label="Send a reaction"
        aria-expanded={isOpen}
      >
        <SmilePlus className="h-4 w-4" />
      </Button>

      <style jsx>{`
        @keyframes float-up {
          0% {
            transform: translateY(0);
            opacity: 1;
          }
          100% {
            transform: translateY(-60px);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}
