"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { CallRoom } from "@/components/call";
import { LoadingState } from "@/components/ui/states";
import { createGuestSession, getAccessToken, getRoomToken } from "@/lib/api";

export default function EmbedMeetingInner() {
  const params = useParams<{ roomId: string }>();
  const search = useSearchParams();
  const roomId = params.roomId;
  const [livekitToken, setLivekitToken] = useState<string | null>(search.get("token"));
  const [serverUrl, setServerUrl] = useState(
    search.get("serverUrl") || process.env.NEXT_PUBLIC_LIVEKIT_URL || "",
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (livekitToken) return;
    let cancelled = false;
    async function boot() {
      try {
        const name = search.get("name") || "Guest";
        if (!getAccessToken()) {
          await createGuestSession({ roomId, displayName: name });
        }
        const tokenRes = await getRoomToken(roomId, name);
        if (cancelled) return;
        setLivekitToken(tokenRes.token);
        if (tokenRes.serverUrl) setServerUrl(tokenRes.serverUrl);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Could not join embed");
        }
      }
    }
    void boot();
    return () => {
      cancelled = true;
    };
  }, [livekitToken, roomId, search]);

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4 text-center text-slate-300">
        {error}
      </div>
    );
  }

  if (!livekitToken) {
    return <LoadingState className="min-h-screen bg-slate-950 text-slate-400" label="Joining…" />;
  }

  return (
    <div className="h-screen w-screen overflow-hidden bg-slate-950">
      <CallRoom
        roomId={roomId}
        token={livekitToken}
        serverUrl={serverUrl}
        onLeave={() => {
          window.parent?.postMessage({ type: "meetspace:left", roomId }, "*");
        }}
      />
    </div>
  );
}
