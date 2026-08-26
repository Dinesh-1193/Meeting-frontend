"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { CallRoom } from "@/components/call";
import { LoadingState } from "@/components/ui/states";
import { getAccessToken, getRoom } from "@/lib/api";
import { Button } from "@/components/ui/button";
import type { ParticipantRole, RoomMode } from "@/types";

interface JoinPayload {
  token: string;
  serverUrl?: string;
  isHost?: boolean;
  role?: ParticipantRole;
  mode?: RoomMode;
  audioEnabled?: boolean;
  videoEnabled?: boolean;
}

export default function MeetingPage() {
  const params = useParams<{ roomId: string }>();
  const roomId = params.roomId;
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [hasToken, setHasToken] = useState(false);
  const [join, setJoin] = useState<JoinPayload | null>(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    setHasToken(Boolean(getAccessToken()));
    setReady(true);
  }, []);

  useEffect(() => {
    if (ready && !hasToken) {
      router.replace(`/meeting/${roomId}/lobby`);
    }
  }, [ready, hasToken, roomId, router]);

  const roomQuery = useQuery({
    queryKey: ["room", roomId],
    queryFn: () => getRoom(roomId),
    enabled: Boolean(roomId) && hasToken,
    retry: false,
  });

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(`meeting-join:${roomId}`);
      if (raw) {
        setJoin(JSON.parse(raw) as JoinPayload);
      }
    } catch {
      setJoin(null);
    } finally {
      setChecked(true);
    }
  }, [roomId]);

  const livekitUrl = useMemo(
    () => join?.serverUrl || process.env.NEXT_PUBLIC_LIVEKIT_URL || "",
    [join?.serverUrl],
  );

  if (!ready || !hasToken || !checked) {
    return <LoadingState className="min-h-screen bg-slate-950 text-slate-400" label="Loading…" />;
  }

  if (!join?.token) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-950 px-4 text-center">
        <p className="text-slate-300">Join from the lobby to enter this meeting.</p>
        <Button onClick={() => router.push(`/meeting/${roomId}/lobby`)}>Go to lobby</Button>
      </div>
    );
  }

  return (
    <CallRoom
      roomId={roomId}
      roomName={roomQuery.data?.name}
      token={join.token}
      serverUrl={livekitUrl}
      isHost={Boolean(join.isHost)}
      role={join.role}
      mode={join.mode}
      audioEnabled={join.audioEnabled}
      videoEnabled={join.videoEnabled}
      onLeave={() => {
        sessionStorage.removeItem(`meeting-join:${roomId}`);
        router.push(`/meeting/${roomId}/ended`);
      }}
    />
  );
}
