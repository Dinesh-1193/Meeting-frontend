"use client";

import { useDataChannel } from "@livekit/components-react";
import { useCallStore } from "@/lib/store/call-store";

interface HandRaiseMessage {
  raised: boolean;
}

export function useRaiseHand() {
  const isHandRaised = useCallStore((s) => s.isHandRaised);
  const setLocalHandRaised = useCallStore((s) => s.setLocalHandRaised);
  const setHandRaised = useCallStore((s) => s.setHandRaised);

  const { send } = useDataChannel("raise-hand", (msg) => {
    try {
      const data = JSON.parse(new TextDecoder().decode(msg.payload)) as HandRaiseMessage;
      const identity = msg.from?.identity;
      if (identity) setHandRaised(identity, data.raised);
    } catch {
      // ignore malformed payloads
    }
  });

  const toggle = async () => {
    const next = !isHandRaised;
    setLocalHandRaised(next);
    const payload = new TextEncoder().encode(JSON.stringify({ raised: next }));
    try {
      await send(payload, { reliable: true });
    } catch {
      setLocalHandRaised(!next);
    }
  };

  return { isHandRaised, toggle };
}
